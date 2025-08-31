// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@paintswap/vrf/contracts/PaintswapVRFConsumer.sol";
import "@paintswap/vrf/contracts/interfaces/IPaintswapVRFCoordinator.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ILiquidityVault {
    function payout(address _winner, uint256 _amount) external;
    function getLiquidity() external view returns (uint256);
    function increaseReserve(uint256 _amount) external;
    function decreaseReserve(uint256 _amount) external;
    function getReservedForBets() external view returns (uint256);
}

error InvalidBulletCount();
error InsufficientPayment();
error BetNotFound();
error PayoutExceedsLimit();
error ReferralCodeAlreadyExists();
error ReferrerAlreadySet();
error ReferralCodeNotFound();
error CannotBeOwnReferrer();
error UserAlreadyHasCode();
error EtherTransferFailed();
error FeeTooHigh();
error NewBPSExceedsMaxLimit();
error FailedToTransferStake();
error BetTooSmall();

contract RussianRoulette is PaintswapVRFConsumer, Ownable, ReentrancyGuard {
    ILiquidityVault public liquidityVault;
    event BetPlaced(uint256 indexed requestId, address indexed player, uint256 amount, uint8 bullets);
    event BetResult(uint256 indexed requestId, address indexed player, bool alive, uint256 spin, uint256 amount, uint256 payout);

    struct Bet {
        address player;
        uint256 amount;
        uint8 bullets;
    }

    struct Player {
        uint256 totalBetsAmount;
        uint256 totalPayout;
        uint256 totalGamesPlayed;
        uint256 totalGamesWon;
        uint256 totalReferrals;
    }

    mapping(uint256 => Bet) public bets;
    mapping(bytes32 => address) public referralCodeOwner;
    mapping(address => bytes32) public referralCodeOf;
    mapping(address => address) public referrerOf;
    mapping(address => Player) public playerInfo;

    uint256 public houseFeeBps = 500; // 5%
    uint256 public constant MAX_HOUSE_FEE_BPS = 2000;
    uint32 public constant CALLBACK_GAS_LIMIT = 200_000;
    uint256 public maxPayoutBps = 500; // 5%
    uint256 public constant MAX_PAYOUT_BPS = 5000;
    uint256 public totalBets;
    uint256 public totalPayout;
    uint256 public totalGamesPlayed;
    uint256 public totalGamesWon;

    constructor(address vrfCoordinatorAddress, address _vaultAddress) PaintswapVRFConsumer(vrfCoordinatorAddress) Ownable(msg.sender) {
        liquidityVault = ILiquidityVault(_vaultAddress);
    }

    function bet(uint8 bullets) external payable nonReentrant returns (uint256 requestId) {
        if (bullets < 1 || bullets > 5) {
            revert InvalidBulletCount();
        }

        uint256 vrfFee = IPaintswapVRFCoordinator(_vrfCoordinator).calculateRequestPriceNative(CALLBACK_GAS_LIMIT);
        if (msg.value <= vrfFee) {
            revert InsufficientPayment();
        }

        uint256 stake = msg.value - vrfFee;
        if (msg.value < 1 ether) {
            revert BetTooSmall();
        }

        uint256 vaultLiquidity = liquidityVault.getLiquidity();
        uint256 potentialFairPayout = (((stake * 6) / (6 - bullets)) * (10000 - houseFeeBps)) / 10000;
        uint256 maxAllowedPayout = ((vaultLiquidity * maxPayoutBps) / 10000) - liquidityVault.getReservedForBets();

        if (potentialFairPayout > maxAllowedPayout) {
            revert PayoutExceedsLimit();
        }

        address referrer = referrerOf[msg.sender];
        uint256 referralFee;
        uint256 cashback;
        if (referrer != address(0)) {
            referralFee = (stake * 10) / 10000;
            cashback = (stake * 5) / 10000;
        }
        uint256 amountToVault = stake - referralFee - cashback;

        requestId = IPaintswapVRFCoordinator(_vrfCoordinator).requestRandomnessPayInNative{value: vrfFee}(
            CALLBACK_GAS_LIMIT,
            1,
            address(liquidityVault)
        );

        bets[requestId] = Bet(msg.sender, stake, bullets);
        liquidityVault.increaseReserve(potentialFairPayout);
        totalBets += stake;
        totalGamesPlayed += 1;
        playerInfo[msg.sender].totalBetsAmount += stake;
        playerInfo[msg.sender].totalGamesPlayed += 1;
        
        emit BetPlaced(requestId, msg.sender, stake, bullets);

        (bool success, ) = payable(address(liquidityVault)).call{value: amountToVault}("");
        if (!success) revert FailedToTransferStake();

        if (referralFee > 0) {
            (success, ) = payable(referrer).call{value: referralFee}("");
            if (!success) revert FailedToTransferStake();
        }

        if (cashback > 0) {
            (success, ) = payable(msg.sender).call{value: cashback}("");
            if (!success) revert FailedToTransferStake();
        }
    }

    function _fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        Bet memory b = bets[requestId];
        if (b.player == address(0)) {
            revert BetNotFound();
        }
        uint256 reservedAmount = (((b.amount * 6) / (6 - b.bullets)) * (10000 - houseFeeBps)) / 10000;

        uint256 spin = randomWords[0] % 6;
        bool alive = spin >= b.bullets;
        uint256 payout = 0;

        if (alive) {
            payout = reservedAmount; 
            playerInfo[b.player].totalGamesWon += 1;
            totalGamesWon += 1;
        }

        delete bets[requestId];

        if (payout > 0) {
            liquidityVault.payout(b.player, payout);
            totalPayout += payout;
            playerInfo[b.player].totalPayout += payout;
        }
        liquidityVault.decreaseReserve(reservedAmount);
        emit BetResult(requestId, b.player, alive, spin, b.amount, payout);
    }

    function setHouseFee(uint256 _newFeeBps) external onlyOwner {
        if (_newFeeBps > MAX_HOUSE_FEE_BPS) {
            revert FeeTooHigh();
        }
        houseFeeBps = _newFeeBps;
    }

    function setMaxPayoutBps(uint256 _newBps) external onlyOwner {
        if (_newBps > MAX_PAYOUT_BPS) {
            revert NewBPSExceedsMaxLimit();
        }
        maxPayoutBps = _newBps;
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
        playerInfo[referrerAddress].totalReferrals += 1;
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
}