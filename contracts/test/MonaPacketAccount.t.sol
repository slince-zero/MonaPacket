// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/MonaPacket.sol";
import "../src/MonaPacketNFT.sol";
import "../src/MonaPacketAccount.sol";
import "../src/ERC6551Registry.sol";
import "../src/interface/IMonaPacketAccount.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract MonaPacketAccountTest is Test {
    MonaPacket public monaPacket;
    MonaPacketNFT public nft;
    MonaPacketAccount public implementation;
    ERC6551Registry public registry;
    MockERC20 public mockERC20;

    address public sender = address(0x1);
    address public recipient = address(0x2);

    function setUp() public {
        nft = new MonaPacketNFT();
        implementation = new MonaPacketAccount();
        registry = new ERC6551Registry();
        monaPacket = new MonaPacket(address(nft), address(registry), address(implementation));
        mockERC20 = new MockERC20();

        nft.transferOwnership(address(monaPacket));
        mockERC20.mint(sender, 1_000_000 ether);
        vm.deal(sender, 10 ether);
    }

    function _createPacketToRecipient(uint256 amount) internal returns (address tba) {
        vm.prank(sender);
        mockERC20.approve(address(monaPacket), amount);
        vm.prank(sender);
        tba = monaPacket.createWithERC20(recipient, address(mockERC20), amount);
    }

    function test_Fail_Execute_UnsupportedOperation() public {
        _createPacketToRecipient(1);
        address tba = monaPacket.getAccount(0);

        vm.prank(recipient);
        vm.expectRevert("Only call operations are supported");
        IMonaPacketAccount(payable(tba)).execute(address(0), 0, "", 1);
    }

    function test_Account_StateIncrementsOnExecute() public {
        _createPacketToRecipient(2);
        address tba = monaPacket.getAccount(0);

        assertEq(IMonaPacketAccount(payable(tba)).state(), 0);

        bytes memory data = abi.encodeWithSelector(IERC20.transfer.selector, recipient, 1);
        vm.prank(recipient);
        IMonaPacketAccount(payable(tba)).execute(address(mockERC20), 0, data, 0);

        assertEq(IMonaPacketAccount(payable(tba)).state(), 1);
    }

    function test_Account_SupportsInterfaces() public {
        _createPacketToRecipient(1);
        address tba = monaPacket.getAccount(0);

        assertTrue(IERC165(tba).supportsInterface(type(IERC165).interfaceId));
        assertTrue(IERC165(tba).supportsInterface(type(IERC1271).interfaceId));
        assertTrue(IERC165(tba).supportsInterface(type(IMonaPacketAccount).interfaceId));
    }

    function test_Account_isValidSigner() public {
        uint256 pk = 0xBEEF;
        address r = vm.addr(pk);

        vm.prank(sender);
        mockERC20.approve(address(monaPacket), 1);
        vm.prank(sender);
        monaPacket.createWithERC20(r, address(mockERC20), 1);
        address tba = monaPacket.getAccount(0);

        assertEq(IMonaPacketAccount(payable(tba)).isValidSigner(r, ""), IMonaPacketAccount.isValidSigner.selector);
        assertEq(IMonaPacketAccount(payable(tba)).isValidSigner(recipient, ""), bytes4(0));
    }

    function test_Account_isValidSignature_EOAOwner() public {
        uint256 pk = 0xBEEF;
        address r = vm.addr(pk);

        vm.prank(sender);
        mockERC20.approve(address(monaPacket), 1);
        vm.prank(sender);
        monaPacket.createWithERC20(r, address(mockERC20), 1);
        address tba = monaPacket.getAccount(0);

        bytes32 hash = keccak256("hello");
        (uint8 v, bytes32 sigR, bytes32 sigS) = vm.sign(pk, hash);
        bytes memory sig = abi.encodePacked(sigR, sigS, v);
        assertEq(IERC1271(tba).isValidSignature(hash, sig), IERC1271.isValidSignature.selector);

        (v, sigR, sigS) = vm.sign(0xCAFE, hash);
        sig = abi.encodePacked(sigR, sigS, v);
        assertEq(IERC1271(tba).isValidSignature(hash, sig), bytes4(0));
    }

    function test_Account_TokenMetadata() public {
        _createPacketToRecipient(1);
        address tba = monaPacket.getAccount(0);

        (uint256 cid, address tokenContract, uint256 tokenId) = IMonaPacketAccount(payable(tba)).token();
        assertEq(cid, block.chainid);
        assertEq(tokenContract, address(nft));
        assertEq(tokenId, 0);
    }

    function test_Account_OwnerIsNFTTokenOwner() public {
        _createPacketToRecipient(1);
        address tba = monaPacket.getAccount(0);
        assertEq(IMonaPacketAccount(payable(tba)).owner(), recipient);
    }

    function test_Fail_Execute_BubblesRevertData() public {
        _createPacketToRecipient(1);
        address tba = monaPacket.getAccount(0);

        bytes memory data = abi.encodeWithSelector(IERC20.transfer.selector, recipient, 2);
        vm.prank(recipient);
        vm.expectRevert("ERC20: transfer amount exceeds balance");
        IMonaPacketAccount(payable(tba)).execute(address(mockERC20), 0, data, 0);
    }
}

// Minimal Mock ERC20 for tests
contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string public name = "Mock Token";
    string public symbol = "MCK";
    uint8 public decimals = 18;

    function mint(address account, uint256 amount) public {
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }
    function allowance(address owner, address spender) external view returns (uint256) { return _allowances[owner][spender]; }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked { _approve(sender, msg.sender, currentAllowance - amount); }
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked { _balances[sender] = senderBalance - amount; }
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}


