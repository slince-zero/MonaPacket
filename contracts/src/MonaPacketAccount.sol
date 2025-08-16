// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "./interface/IMonaPacketAccount.sol";

contract MonaPacketAccount is IERC165, IERC1271, IMonaPacketAccount {
    uint256 immutable deploymentChainId = block.chainid;

    uint256 public state;

    receive() external payable {}

    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable virtual returns (bytes memory result) {
        require(_isValidSigner(msg.sender), "Invalid signer");
        require(operation == 0, "Only call operations are supported");

        ++state;

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        if (data.length == 0) {
            emit OpenRedPacket(address(0), to, 0, value);
        } else {
            (address recipient, uint256 erc20Balance) = decodeData(data);
            emit OpenRedPacket(recipient, to, erc20Balance, value);
        }
    }

    function isValidSigner(
        address signer,
        bytes calldata
    ) external view virtual returns (bytes4) {
        if (_isValidSigner(signer)) {
            return IMonaPacketAccount.isValidSigner.selector;
        }

        return bytes4(0);
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view virtual returns (bytes4 magicValue) {
        bool isValid = SignatureChecker.isValidSignatureNow(
            owner(),
            hash,
            signature
        );

        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }

        return bytes4(0);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure virtual returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IMonaPacketAccount).interfaceId ||
            interfaceId == type(IMonaPacketAccount).interfaceId;
    }

    function token() public view virtual returns (uint256, address, uint256) {
        bytes memory footer = new bytes(0x60);

        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }

        return abi.decode(footer, (uint256, address, uint256));
    }

    function owner() public view virtual returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != deploymentChainId) return address(0);

        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function _isValidSigner(
        address signer
    ) internal view virtual returns (bool) {
        return signer == owner();
    }

    function decodeData(
        bytes calldata data
    ) public pure returns (address reci, uint256 erc20Balance) {
        // 检查 data 的长度是否足够
        require(data.length >= 56, "Data is too short"); // 4 bytes for selector + 20 bytes for address + 32 bytes for uint256

        // 直接解码参数，跳过前 4 个字节
        (reci, erc20Balance) = abi.decode(data[4:], (address, uint256));
    }
}
