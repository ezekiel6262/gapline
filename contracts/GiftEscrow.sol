// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/// @notice Prototype escrow. Requires independent review and tests before mainnet use.
contract GiftEscrow {
    struct Gift { address sender; address token; address key; uint256 amount; uint256 expiry; bool settled; }
    mapping(uint256 => Gift) public gifts;
    uint256 public nextId;
    bool private entered;
    event Deposited(uint256 indexed id, address indexed sender, address token, uint256 amount, address key, uint256 expiry);
    event Claimed(uint256 indexed id, address indexed recipient);
    event Reclaimed(uint256 indexed id, address indexed sender);
    modifier nonReentrant() { require(!entered, "Reentrancy"); entered = true; _; entered = false; }

    function deposit(address token, uint256 amount, address key, uint256 expiry) external nonReentrant returns (uint256 id) {
        require(token.code.length > 0 && key != address(0) && amount > 0, "Invalid gift");
        require(expiry > block.timestamp && expiry <= block.timestamp + 90 days, "Invalid expiry");
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        safeCall(token, abi.encodeCall(IERC20.transferFrom, (msg.sender, address(this), amount)));
        require(IERC20(token).balanceOf(address(this)) - beforeBalance == amount, "Unsupported transfer fees");
        id = nextId++;
        gifts[id] = Gift(msg.sender, token, key, amount, expiry, false);
        emit Deposited(id, msg.sender, token, amount, key, expiry);
    }

    function claim(uint256 id, address recipient, uint8 v, bytes32 r, bytes32 s) external nonReentrant {
        Gift storage gift = gifts[id];
        require(gift.sender != address(0) && !gift.settled && block.timestamp < gift.expiry, "Gift unavailable");
        require(recipient != address(0), "Invalid recipient");
        require(uint256(s) <= 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0 && (v == 27 || v == 28), "Invalid signature");
        bytes32 payload = keccak256(abi.encode(block.chainid, address(this), id, recipient));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payload));
        require(ecrecover(digest, v, r, s) == gift.key, "Invalid signer");
        gift.settled = true;
        safeCall(gift.token, abi.encodeCall(IERC20.transfer, (recipient, gift.amount)));
        emit Claimed(id, recipient);
    }

    function reclaim(uint256 id) external nonReentrant {
        Gift storage gift = gifts[id];
        require(gift.sender == msg.sender && !gift.settled && block.timestamp >= gift.expiry, "Gift unavailable");
        gift.settled = true;
        safeCall(gift.token, abi.encodeCall(IERC20.transfer, (msg.sender, gift.amount)));
        emit Reclaimed(id, msg.sender);
    }

    function safeCall(address token, bytes memory data) private {
        (bool ok, bytes memory result) = token.call(data);
        require(ok && (result.length == 0 || abi.decode(result, (bool))), "Token transfer failed");
    }
}
