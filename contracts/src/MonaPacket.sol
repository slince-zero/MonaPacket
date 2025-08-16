// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// OpenZeppelin Contracts
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

// Interfaces
import "./interface/IMonaPacketNFT.sol";
import "./interface/IERC6551Registry.sol";

/**
 * @title MonaPacket
 * @author [Your Name/Team]
 * @notice The main entrypoint for creating MonaPacket red packets.
 * This contract mints a MonaPacketNFT and funds its associated Token-Bound Account.
 * It serves as the single point of interaction for users.
 */
contract MonaPacket is Ownable {
    //==============================================================
    // State Variables
    //==============================================================

    /// @notice The address of the NFT contract that represents the red packets.
    IMonaPacketNFT public immutable nftContract;

    /// @notice The address of the official ERC6551 Registry.
    IERC6551Registry public immutable registry;

    /// @notice The implementation address for the Token-Bound Accounts (TBA). Can be upgraded.
    address public accountImplementation;

    /// @notice The chain ID where the contract is deployed, cached for gas efficiency.
    uint256 private immutable CHAIN_ID;

    //==============================================================
    // Events
    //==============================================================

    event MonaPacketCreated(
        address indexed tba,
        address indexed recipient,
        uint256 indexed tokenId,
        address token, // address(0) for native token
        uint256 amount
    );

    event AccountImplementationUpdated(address indexed newImplementation);

    //==============================================================
    // Errors
    //==============================================================

    error MonaPacket__InvalidRecipient();
    error MonaPacket__InvalidAmount();
    error MonaPacket__TransferFailed();

    //==============================================================
    // Constructor
    //==============================================================

    constructor(
        address _nftContract,
        address _registry,
        address _initialImplementation
    ) Ownable(msg.sender) {
        nftContract = IMonaPacketNFT(_nftContract);
        registry = IERC6551Registry(_registry);
        accountImplementation = _initialImplementation;
        CHAIN_ID = block.chainid;
    }

    //==============================================================
    // Create Functions
    //==============================================================

    /**
     * @notice Creates a red packet funded with the native token (e.g., Monad's native token).
     * @param _recipient The address that will own the new MonaPacket NFT.
     * @return tba The address of the newly created and funded Token-Bound Account.
     */
    function createWithNativeToken(
        address _recipient
    ) external payable returns (address tba) {
        if (msg.value == 0) revert MonaPacket__InvalidAmount();
        if (_recipient == address(0)) revert MonaPacket__InvalidRecipient();

        // 1. Create the empty packet (NFT + TBA)
        uint256 tokenId;
        (tba, tokenId) = _createPacket(_recipient);

        // 2. Fund the TBA with the native token
        (bool success, ) = tba.call{value: msg.value}("");
        if (!success) revert MonaPacket__TransferFailed();

        emit MonaPacketCreated(tba, _recipient, tokenId, address(0), msg.value);
    }

    /**
     * @notice Creates a red packet funded with an ERC20 token.
     * @dev The caller must have approved this contract to spend their ERC20 tokens beforehand.
     * @param _recipient The address that will own the new MonaPacket NFT.
     * @param _erc20 The address of the ERC20 token.
     * @param _amount The amount of the token to send.
     * @return tba The address of the newly created and funded Token-Bound Account.
     */
    function createWithERC20(
        address _recipient,
        address _erc20,
        uint256 _amount
    ) public returns (address tba) {
        if (_amount == 0) revert MonaPacket__InvalidAmount();

        // 1. Create the empty packet (NFT + TBA)
        uint256 tokenId;
        (tba, tokenId) = _createPacket(_recipient);

        // 2. Fund the TBA by pulling ERC20 tokens from the caller
        bool success = IERC20(_erc20).transferFrom(msg.sender, tba, _amount);
        if (!success) revert MonaPacket__TransferFailed();

        emit MonaPacketCreated(tba, _recipient, tokenId, _erc20, _amount);
    }

    /**
     * @notice Creates a red packet with an ERC20 token using a permit signature (EIP-2612).
     * @dev This allows for gasless approval, enabling a one-transaction creation process for the user.
     */
    function createWithERC20Permit(
        address _recipient,
        address _erc20,
        uint256 _amount,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external returns (address tba) {
        // 1. Use the off-chain signature to approve the token transfer on-chain
        IERC20Permit(_erc20).permit(
            msg.sender,
            address(this),
            _amount,
            _deadline,
            _v,
            _r,
            _s
        );

        // 2. Call the main createWithERC20 function
        tba = createWithERC20(_recipient, _erc20, _amount);
    }

    //==============================================================
    // Internal Functions
    //==============================================================

    /**
     * @dev Internal helper function to handle the creation of the NFT and its TBA.
     */
    function _createPacket(
        address _recipient
    ) private returns (address tba, uint256 tokenId) {
        if (_recipient == address(0)) revert MonaPacket__InvalidRecipient();

        // 1. Mint a new MonaPacketNFT to the recipient
        tokenId = nftContract.mint(_recipient);

        // 2. Create the associated Token-Bound Account using the ERC6551 Registry
        tba = registry.createAccount(
            accountImplementation,
            bytes32(0), // salt
            CHAIN_ID,
            address(nftContract),
            tokenId
        );
    }

    //==============================================================
    // View Functions
    //==============================================================

    /**
     * @notice Predicts the address of a MonaPacket account for a given NFT.
     * @param _tokenId The token ID of the MonaPacket NFT.
     */
    function getAccount(uint256 _tokenId) external view returns (address) {
        return
            registry.account(
                accountImplementation,
                bytes32(0), // salt
                CHAIN_ID,
                address(nftContract),
                _tokenId
            );
    }

    //==============================================================
    // Admin Functions
    //==============================================================

    /**
     * @notice Updates the implementation address for all newly created TBAs.
     * @dev This allows for upgrading the wallet logic for future packets.
     * @param _newImplementation The new implementation address.
     */
    function setAccountImplementation(
        address _newImplementation
    ) external onlyOwner {
        accountImplementation = _newImplementation;
        emit AccountImplementationUpdated(_newImplementation);
    }
}
