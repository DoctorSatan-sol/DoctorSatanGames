// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@paintswap/vrf/contracts/PaintswapVRFConsumer.sol";
import "@paintswap/vrf/contracts/interfaces/IPaintswapVRFCoordinator.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ILiquidityVault {
        struct userInfo {
            uint256 totalReferrals;
            bytes32 referralCode;
            address referrer;
        }

    function payout(address _winner, uint256 _amount) external;
    function getLiquidity() external view returns (uint256);
    function increaseReserve(uint256 _amount) external;
    function decreaseReserve(uint256 _amount) external;
    function getReservedForBets() external view returns (uint256);

    function gameWallet(address _userAddress) external view returns (address _ownerWallet);

    function user(address _userAddress) 
        external 
        view 
        returns (
            uint256 totalReferrals, 
            bytes32 referralCode, 
            address referrer
        );
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

        address ownerAddress = liquidityVault.gameWallet(msg.sender);
        if (ownerAddress == address(0)) {
            ownerAddress = msg.sender;
        }
        ( , , address referrer) = liquidityVault.user(ownerAddress);
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

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 230)
        );
        require(_success, "FeeM registration failed");
    }
}