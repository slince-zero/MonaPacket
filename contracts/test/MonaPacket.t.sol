// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../src/MonaPacket.sol";
import "../src/MonaPacketNFT.sol";
import "../src/MonaPacketAccount.sol";
import "../src/ERC6551Registry.sol";
import "../src/interface/IMonaPacketAccount.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MonaPacketTest is Test {
    //==============================================================
    // State Variables & Setup
    //==============================================================

    MonaPacket public monaPacket;
    MonaPacketNFT public nft;
    MonaPacketAccount public implementation;
    ERC6551Registry public registry;
    MockERC20 public mockERC20;

    address public sender = address(0x1);
    address public recipient = address(0x2);
    address public attacker = address(0xDEADBEEF);
    string public constant TEST_URI = "ipfs://test-uri";

    uint256 public constant STARTING_ERC20_BALANCE = 1_000_000 ether;
    uint256 public constant PACKET_AMOUNT_ERC20 = 1_000 ether;
    uint256 public constant PACKET_AMOUNT_NATIVE = 1 ether;

    // Mirror event from MonaPacket for expectEmit
    event AccountImplementationUpdated(address indexed newImplementation);

    function setUp() public {
        // Deploy all contracts
        nft = new MonaPacketNFT();
        implementation = new MonaPacketAccount();
        registry = new ERC6551Registry();
        monaPacket = new MonaPacket(
            address(nft),
            address(registry),
            address(implementation)
        );
        mockERC20 = new MockERC20();

        // Transfer NFT ownership to the main contract
        nft.transferOwnership(address(monaPacket));

        // Fund actors
        mockERC20.mint(sender, STARTING_ERC20_BALANCE);
        vm.deal(sender, 10 ether); // Give sender some native tokens
    }

    //==============================================================
    // Core Functionality Tests
    //==============================================================

    function test_CreateWithERC20() public {
        vm.prank(sender);
        mockERC20.approve(address(monaPacket), PACKET_AMOUNT_ERC20);

        vm.prank(sender);
        address tba = monaPacket.createWithERC20(
            recipient,
            address(mockERC20),
            PACKET_AMOUNT_ERC20,
            TEST_URI
        );

        assertEq(nft.ownerOf(0), recipient, "Recipient should own the NFT");
        assertEq(
            mockERC20.balanceOf(tba),
            PACKET_AMOUNT_ERC20,
            "TBA should hold the ERC20 tokens"
        );
        assertEq(
            nft.tokenURI(0),
            TEST_URI,
            "Token URI should be set correctly"
        );

        assertEq(
            mockERC20.balanceOf(sender),
            STARTING_ERC20_BALANCE - PACKET_AMOUNT_ERC20
        );
    }

    function test_CreateWithNativeToken() public {
        vm.prank(sender);
        address tba = monaPacket.createWithNativeToken{
            value: PACKET_AMOUNT_NATIVE
        }(recipient, TEST_URI);
        assertEq(nft.ownerOf(0), recipient, "Recipient should own the NFT");
        assertEq(
            tba.balance,
            PACKET_AMOUNT_NATIVE,
            "TBA should hold the native tokens"
        );
        assertEq(
            nft.tokenURI(0),
            TEST_URI,
            "Token URI should be set correctly"
        );
    }

    function test_ClaimERC20Packet() public {
        test_CreateWithERC20();
        address tba = monaPacket.getAccount(0);
        bytes memory data = abi.encodeWithSelector(
            IERC20.transfer.selector,
            recipient,
            PACKET_AMOUNT_ERC20
        );
        vm.prank(recipient);
        IMonaPacketAccount(payable(tba)).execute(
            address(mockERC20),
            0,
            data,
            0
        );
        assertEq(mockERC20.balanceOf(recipient), PACKET_AMOUNT_ERC20);
        assertEq(mockERC20.balanceOf(tba), 0);
    }

    // --- NEW TESTS ---

    function test_ClaimNativeTokenPacket() public {
        test_CreateWithNativeToken();
        address tba = monaPacket.getAccount(0);
        vm.deal(recipient, 0); // Ensure recipient starts with 0 native tokens for accurate testing

        // For native token transfer, `to` is the recipient and `data` is empty
        vm.prank(recipient);
        IMonaPacketAccount(payable(tba)).execute(
            recipient,
            PACKET_AMOUNT_NATIVE,
            "",
            0
        );

        assertEq(recipient.balance, PACKET_AMOUNT_NATIVE);
        assertEq(tba.balance, 0);
    }

    function test_Events_MonaPacketCreated() public {
        // Arrange: Sender approves the contract
        vm.prank(sender);
        mockERC20.approve(address(monaPacket), PACKET_AMOUNT_ERC20);

        // Act: Tell Foundry to start recording events
        vm.recordLogs();

        // CRITICAL FIX: Set the sender for the NEXT call, which is createWithERC20
        vm.prank(sender);
        // Execute the function that emits the event
        address tba = monaPacket.createWithERC20(
            recipient,
            address(mockERC20),
            PACKET_AMOUNT_ERC20,
            TEST_URI
        );

        // Assert: Get all the recorded logs
        Vm.Log[] memory entries = vm.getRecordedLogs();

        bool eventFound = false;
        for (uint i = 0; i < entries.length; i++) {
            // Find our specific event by checking its unique signature (the first topic)
            if (
                entries[i].topics[0] ==
                keccak256(
                    "MonaPacketCreated(address,address,uint256,address,uint256)"
                )
            ) {
                eventFound = true;

                // --- Verify indexed parameters (stored in topics) ---
                address emittedTba = address(
                    uint160(uint256(entries[i].topics[1]))
                );
                address emittedRecipient = address(
                    uint160(uint256(entries[i].topics[2]))
                );
                uint256 emittedTokenId = uint256(entries[i].topics[3]);

                assertEq(emittedTba, tba, "Event: TBA address should match");
                assertEq(
                    emittedRecipient,
                    recipient,
                    "Event: Recipient address should match"
                );
                assertEq(emittedTokenId, 0, "Event: TokenId should be 0");

                // --- Decode and verify non-indexed parameters (stored in data) ---
                (address emittedToken, uint256 emittedAmount) = abi.decode(
                    entries[i].data,
                    (address, uint256)
                );

                assertEq(
                    emittedToken,
                    address(mockERC20),
                    "Event: Token address should match"
                );
                assertEq(
                    emittedAmount,
                    PACKET_AMOUNT_ERC20,
                    "Event: Amount should match"
                );

                break;
            }
        }

        assertTrue(
            eventFound,
            "MonaPacketCreated event should have been emitted"
        );
    }

    function test_AdminFunctions_SetImplementation() public {
        address newImplementation = address(0xABC);

        // Owner can set it
        monaPacket.setAccountImplementation(newImplementation);
        assertEq(monaPacket.accountImplementation(), newImplementation);

        // Attacker cannot set it
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                attacker
            )
        );
        monaPacket.setAccountImplementation(address(0xDEF));
    }

    function testFuzz_CreateWithERC20(uint96 _amount) public {
        // Constrain the amount to a reasonable range
        _amount = uint96(bound(_amount, 1, STARTING_ERC20_BALANCE));

        vm.prank(sender);
        mockERC20.approve(address(monaPacket), _amount);

        vm.prank(sender);
        address tba = monaPacket.createWithERC20(
            recipient,
            address(mockERC20),
            _amount,
            TEST_URI
        );

        assertEq(mockERC20.balanceOf(tba), _amount);
    }

    //==============================================================
    // Revert Tests
    //==============================================================

    function test_Fail_CreateWithZeroAmount() public {
        vm.prank(sender);
        vm.expectRevert(MonaPacket.MonaPacket__InvalidAmount.selector);
        monaPacket.createWithERC20(recipient, address(mockERC20), 0, TEST_URI);
    }

    function test_Fail_CreateWithERC20_InvalidRecipient() public {
        vm.prank(sender);
        mockERC20.approve(address(monaPacket), 1);
        vm.prank(sender);
        vm.expectRevert(MonaPacket.MonaPacket__InvalidRecipient.selector);
        monaPacket.createWithERC20(address(0), address(mockERC20), 1, TEST_URI);
    }

    function test_Fail_CreateWithNativeToken_ZeroAmount() public {
        vm.prank(sender);
        vm.expectRevert(MonaPacket.MonaPacket__InvalidAmount.selector);
        monaPacket.createWithNativeToken{value: 0}(recipient, TEST_URI);
    }

    function test_Fail_CreateWithNativeToken_InvalidRecipient() public {
        vm.prank(sender);
        vm.expectRevert(MonaPacket.MonaPacket__InvalidRecipient.selector);
        monaPacket.createWithNativeToken{value: PACKET_AMOUNT_NATIVE}(
            address(0),
            TEST_URI
        );
    }

    //==============================================================
    // Revert Tests
    //==============================================================

    function test_Fail_CreateWithERC20_TransferFailed() public {
        MockFailERC20 badToken = new MockFailERC20();
        vm.prank(sender);
        badToken.approve(address(monaPacket), 100);

        vm.prank(sender);
        vm.expectRevert(MonaPacket.MonaPacket__TransferFailed.selector);
        monaPacket.createWithERC20(recipient, address(badToken), 100, TEST_URI);
    }

    function test_CreateWithERC20Permit() public {
        MockPermitToken permitToken = new MockPermitToken();
        permitToken.mint(sender, PACKET_AMOUNT_ERC20);
        // In a real scenario, v, r, s would be generated by a wallet signature.
        // For testing, we can use dummy values because our mock permit function doesn't validate the signature.
        (uint8 v, bytes32 r, bytes32 s) = (
            27,
            bytes32(uint256(1)),
            bytes32(uint256(2))
        );

        vm.prank(sender);
        address tba = monaPacket.createWithERC20Permit(
            recipient,
            address(permitToken),
            PACKET_AMOUNT_ERC20,
            TEST_URI,
            block.timestamp,
            v,
            r,
            s
        );

        assertEq(permitToken.balanceOf(tba), PACKET_AMOUNT_ERC20);
        assertEq(nft.ownerOf(0), recipient);
    }

    function test_RecipientCanBurnPacket() public {
        // Create a packet first
        vm.prank(sender);
        monaPacket.createWithNativeToken{value: 1}(recipient, TEST_URI);
        assertEq(nft.ownerOf(0), recipient);

        // Recipient burns the NFT
        vm.prank(recipient);
        nft.burn(0);

        // Assert the NFT no longer exists
        bytes4 expectedError = bytes4(
            keccak256("ERC721NonexistentToken(uint256)")
        );
        vm.expectRevert(abi.encodeWithSelector(expectedError, 0));
        nft.ownerOf(0);
    }

    function test_Pausable() public {
        // Owner can pause
        monaPacket.pauseNFTs();
        assertTrue(nft.paused());

        // Minting should fail when paused
        vm.prank(sender); // To simulate call from monaPacket
        vm.expectRevert(Pausable.EnforcedPause.selector);
        monaPacket.createWithNativeToken{value: 1}(recipient, TEST_URI);

        // Owner can unpause
        monaPacket.unpauseNFTs();
        assertFalse(nft.paused());

        // Minting should succeed now
        vm.prank(sender);
        monaPacket.createWithNativeToken{value: 1}(recipient, TEST_URI);
        assertEq(nft.ownerOf(0), recipient);
    }

    function test_GetAccount_PredictsCreatedAddress() public {
        vm.prank(sender);
        mockERC20.approve(address(monaPacket), 1);
        vm.prank(sender);
        address tba = monaPacket.createWithERC20(
            recipient,
            address(mockERC20),
            1,
            TEST_URI
        );
        assertEq(monaPacket.getAccount(0), tba);
    }

    function test_Event_AccountImplementationUpdated() public {
        address newImpl = address(0x123);
        vm.expectEmit(true, false, false, true, address(monaPacket));
        emit AccountImplementationUpdated(newImpl);
        monaPacket.setAccountImplementation(newImpl);
    }

    function test_Fail_MintFromNonOwner() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                attacker
            )
        );
        vm.prank(attacker);
        nft.mint(recipient, TEST_URI);
    }

    function test_Fail_ClaimFromWrongOwner() public {
        test_CreateWithERC20();
        address tba = monaPacket.getAccount(0);

        bytes memory data = abi.encodeWithSelector(
            IERC20.transfer.selector,
            attacker,
            PACKET_AMOUNT_ERC20
        );

        vm.prank(attacker);

        vm.expectRevert("Invalid signer");
        IMonaPacketAccount(payable(tba)).execute(
            address(mockERC20),
            0,
            data,
            0
        );
    }
}

// Mock ERC20 Contract (same as before)
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

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(
            currentAllowance >= amount,
            "ERC20: transfer amount exceeds allowance"
        );
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        uint256 senderBalance = _balances[sender];
        require(
            senderBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}

// ERC20 that always fails transferFrom to trigger MonaPacket__TransferFailed
contract MockFailERC20 is IERC20 {
    mapping(address => mapping(address => uint256)) private _allowances;
    string public name = "MockFail Token";
    string public symbol = "MF";
    uint8 public decimals = 18;

    function totalSupply() external pure returns (uint256) {
        return 0;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address,
        address,
        uint256
    ) external pure returns (bool) {
        return false;
    }
}

// Minimal ERC20 + Permit used to cover createWithERC20Permit path
contract MockPermitToken is MockERC20, IERC20Permit {
    mapping(address => uint256) public nonces;
    bytes32 public constant DOMAIN_SEPARATOR = bytes32(uint256(0x01));

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 /* deadline */,
        uint8 /* v */,
        bytes32 /* r */,
        bytes32 /* s */
    ) external {
        nonces[owner] += 1;
        _approve(owner, spender, value);
    }
}
