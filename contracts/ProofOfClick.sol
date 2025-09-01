// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@paintswap/vrf/contracts/PaintswapVRFConsumer.sol";
import "@paintswap/vrf/contracts/interfaces/IPaintswapVRFCoordinator.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract POC is PaintswapVRFConsumer, ERC20, ReentrancyGuard {
    error FeeTooLow();
    error FeeTransferFailed();
    error RefundFailed();
    error InsufficientContractBalance();
    error NothingToBurn();
    error TransferFailed();
    error ReferralCodeAlreadyExists();
    error ReferrerAlreadySet();
    error ReferralCodeNotFound();
    error CannotBeOwnReferrer();
    error UserAlreadyHasCode();
    error InvalidBatchSize();
    error MaxBatchSizeExceeded();
    error BatchSizeMustBePositive();
    error InsufficientValueForBatch();

    uint256 public maxSupply;
    uint256 public currentReward;
    uint256 public roundId;
    uint256 public lastHalvingRound;
    uint256 public lastRoundTs;
    address public liquidityVault;
    uint256 public totalClicks;

    uint256 public constant INITIAL_REWARD          = 666 * 1e18;
    uint256 public constant HALVING_INTERVAL_ROUNDS = 50050;
    uint256 public constant ROUND_DURATION          = 60;
    uint256 public constant FEE                     = 0.01 ether;
    uint256 public constant LIQUIDITY_SHARE         = 5;
    uint32  public constant CALLBACK_GAS_LIMIT      = 200_000;

    mapping(uint256 => mapping(uint256 => address)) public players;
    mapping(uint256 => uint256) public playerCount;
    mapping(uint256 => uint256) private requestToRoundId;
    mapping(uint256 => uint256) private rewardPerRound;
    mapping(address => uint256) public totalUserClicks;
    mapping(address => uint256) public totalUserWins;
    mapping(address => uint256) public totalUserReferrals;
    mapping(bytes32 => address) public referralCodeOwner;
    mapping(address => bytes32) public referralCodeOf;
    mapping(address => address) public referrerOf;

    event Clicked(uint256 indexed roundId, address indexed player);
    event RoundRequested(uint256 indexed requestId, uint256 indexed roundId, uint256 playersCount, uint256 reward);
    event WinnerMinted(uint256 indexed requestId, uint256 indexed roundId, address indexed winner, uint256 amount);
    event Burned(address indexed burner, uint256 amount, uint256 ethOut);

    constructor(address vrfCoordinatorAddress, address _vaultAddress)
        ERC20("Clicks Token", "C")
        PaintswapVRFConsumer(vrfCoordinatorAddress)
    {
        maxSupply = 66_666_666 * 1e18;
        currentReward = INITIAL_REWARD;
        liquidityVault = _vaultAddress;
        lastRoundTs = block.timestamp;
        roundId = 0;
        lastHalvingRound = 0;
    }

    function _performClickLogic(address clicker) internal returns (uint256) {
        bool timeIsUp = (block.timestamp >= lastRoundTs + ROUND_DURATION);
        bool hasPlayers = (playerCount[roundId] > 0);
        uint256 vrfFee = 0;
        uint256 actualCost = FEE;

        if (timeIsUp && hasPlayers) {
            vrfFee = IPaintswapVRFCoordinator(_vrfCoordinator).calculateRequestPriceNative(CALLBACK_GAS_LIMIT);
            actualCost += vrfFee;

            uint256 count = playerCount[roundId];
            uint256 rewardForRound = rewardPerRound[roundId];
            if (rewardForRound == 0) rewardForRound = currentReward;

            uint256 requestId = IPaintswapVRFCoordinator(_vrfCoordinator)
                .requestRandomnessPayInNative{value: vrfFee}(
                    CALLBACK_GAS_LIMIT,
                    1,
                    address(this)
                );

            requestToRoundId[requestId] = roundId;
            rewardPerRound[roundId] = rewardForRound;
            emit RoundRequested(requestId, roundId, count, rewardForRound);

            if (roundId >= lastHalvingRound + HALVING_INTERVAL_ROUNDS) {
                currentReward /= 2;
                lastHalvingRound = roundId;
            }

            roundId += 1;
            lastRoundTs = block.timestamp;
        }

        address referrer = referrerOf[clicker];
        uint256 cashback = 0;
        if (referrer != address(0)) {
            cashback = (FEE * 5) / 10000;
        }
        uint256 liquidityAmount = (FEE * LIQUIDITY_SHARE) / 100;

        uint256 idx = playerCount[roundId];
        players[roundId][idx] = clicker;
        playerCount[roundId] = idx + 1;

        totalClicks += 1;
        totalUserClicks[clicker] += 1;
        
        emit Clicked(roundId, clicker);

        if (referrer != address(0) && (totalUserClicks[clicker] % 100 == 0)) {
            idx = playerCount[roundId];
            players[roundId][idx] = referrer;
            playerCount[roundId] = idx + 1;
        }

        (bool ok, ) = payable(liquidityVault).call{value: liquidityAmount}("");
        if (!ok) revert FeeTransferFailed();

        if (cashback > 0) {
            (ok, ) = payable(clicker).call{value: cashback}("");
            if (!ok) revert FeeTransferFailed();
        }

        return actualCost;
    }

    function _click() public payable nonReentrant {
        uint256 actualCost = _performClickLogic(msg.sender);

        if (msg.value < actualCost) revert FeeTooLow();

        uint256 change = msg.value - actualCost;
        if (change > 0) {
            (bool success, ) = payable(msg.sender).call{value: change}("");
            if (!success) revert RefundFailed();
        }
    }

    function batchClick(uint256 n) public payable nonReentrant {
        if (n == 0) revert BatchSizeMustBePositive();
        if (n > 500) revert MaxBatchSizeExceeded();

        uint256 totalCost = 0;
        
        unchecked {
            for (uint256 i = 0; i < n; i++) {
                totalCost += _performClickLogic(msg.sender);
            }
        }
        
        if (msg.value < totalCost) revert InsufficientValueForBatch();

        uint256 change = msg.value - totalCost;
        if (change > 0) {
            (bool success, ) = payable(msg.sender).call{value: change}("");
            if (!success) revert RefundFailed();
        }
    }

    function burn(uint256 amount) external nonReentrant {
        if (amount == 0) revert NothingToBurn();

        uint256 contractBalance = address(this).balance;
        if (contractBalance == 0) revert InsufficientContractBalance();

        uint256 supply = totalSupply();
        if (supply == 0) revert InsufficientContractBalance();

        uint256 ethOut = (amount * contractBalance) / supply;

        _burn(msg.sender, amount);
        maxSupply -= amount;

        (bool success, ) = payable(msg.sender).call{value: ethOut}("");
        if (!success) revert TransferFailed();

        emit Burned(msg.sender, amount, ethOut);
    }

    function _fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 resolvedRound = requestToRoundId[requestId];
        delete requestToRoundId[requestId];

        uint256 n = playerCount[resolvedRound];
        if (n > 0) {
            uint256 idx = randomWords[0] % n;
            address winner = players[resolvedRound][idx];

            uint256 reward = rewardPerRound[resolvedRound];
            if (reward == 0) reward = currentReward;

            if (totalSupply() + reward > maxSupply) {
                reward = maxSupply - totalSupply();
            }
            if (reward > 0) {
                _mint(winner, reward);
                totalUserWins[winner] += 1;
                emit WinnerMinted(requestId, resolvedRound, winner, reward);
            }
        }
    }

    function getPlayersCountInRound(uint256 _roundId) external view returns (uint256) {
        return playerCount[_roundId];
    }

    function nextHalvingRound() external view returns (uint256) {
        return lastHalvingRound + HALVING_INTERVAL_ROUNDS;
    }

    function createReferralCode(bytes32 _code) public {
        if (referralCodeOf[msg.sender] != bytes32(0)) {
            revert UserAlreadyHasCode();
        }
        if (referralCodeOwner[_code] != address(0)) {
            revert ReferralCodeAlreadyExists();
        }

        referralCodeOwner[_code] = msg.sender;
        referralCodeOf[msg.sender] = _code;
    }

    function applyReferralCode(bytes32 _code) public {
        address referrerAddress = referralCodeOwner[_code];

        if (referrerAddress == msg.sender) {
            revert CannotBeOwnReferrer();
        }
        if (referrerAddress == address(0)) {
            revert ReferralCodeNotFound();
        }
        if (referrerOf[msg.sender] != address(0)) {
            revert ReferrerAlreadySet();
        }
        
        referrerOf[msg.sender] = referrerAddress;
        totalUserReferrals[referrerAddress] += 1;
    }

    function getReferralCodeOf(address _user) public view returns(bytes32) {
        return referralCodeOf[_user];
    }
    function getAddressByCode(bytes32 _code) public view returns(address) {
        return referralCodeOwner[_code];
    }
    function getReferrerOf(address _user) public view returns(address) {
        return referrerOf[_user];
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 230)
        );
        require(_success, "FeeM registration failed");
    }
}