// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IMonaPacket
 * @notice The main interface for the MonaPacket contract.
 * It defines all external functions for creating and managing MonaPacket red packets.
 */
interface IMonaPacket {
    //==============================================================
    // Events
    //==============================================================

    /**
     * @notice Emitted when a new MonaPacket is successfully created and funded.
     * @param tba The address of the newly created Token-Bound Account.
     * @param recipient The address that received the MonaPacket NFT.
     * @param tokenId The ID of the associated NFT.
     * @param token The address of the token used for funding (address(0) for native token).
     * @param amount The amount of the token funded.
     */
    event MonaPacketCreated(
        address indexed tba,
        address indexed recipient,
        uint256 indexed tokenId,
        address token,
        uint256 amount
    );

    /**
     * @notice Emitted when the TBA implementation address is updated by the owner.
     * @param newImplementation The new implementation address.
     */
    event AccountImplementationUpdated(address indexed newImplementation);

    //==============================================================
    // External Functions
    //==============================================================

    /**
     * @notice Creates a red packet funded with the native token.
     * @param _recipient The address that will own the new MonaPacket NFT.
     * @return tba The address of the newly created and funded Token-Bound Account.
     */
    function createWithNativeToken(
        address _recipient
    ) external payable returns (address tba);

    /**
     * @notice Creates a red packet funded with an ERC20 token.
     * @param _recipient The address that will own the new MonaPacket NFT.
     * @param _erc20 The address of the ERC20 token.
     * @param _amount The amount of the token to send.
     * @return tba The address of the newly created and funded Token-Bound Account.
     */
    function createWithERC20(
        address _recipient,
        address _erc20,
        uint256 _amount
    ) external returns (address tba);

    /**
     * @notice Creates a red packet with an ERC20 token using a permit signature (EIP-2612).
     */
    function createWithERC20Permit(
        address _recipient,
        address _erc20,
        uint256 _amount,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external returns (address tba);

    /**
     * @notice Predicts the address of a MonaPacket account for a given NFT.
     * @param _tokenId The token ID of the MonaPacket NFT.
     */
    function getAccount(uint256 _tokenId) external view returns (address);

    /**
     * @notice Updates the implementation address for all newly created TBAs.
     * @param _newImplementation The new implementation address.
     */
    function setAccountImplementation(address _newImplementation) external;
}
