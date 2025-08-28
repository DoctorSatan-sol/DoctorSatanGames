// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@paintswap/vrf/contracts/PaintswapVRFConsumer.sol";
import "@paintswap/vrf/contracts/interfaces/IPaintswapVRFCoordinator.sol";

contract POC is PaintswapVRFConsumer, ERC20 {
    error FeeTooLow();
    error FeeTransferFailed();
    error RefundFailed();
    error InsufficientContractBalance();
    error NothingToBurn();
    error TransferFailed();

    uint256 public maxSupply;
    uint256 public currentReward;
    uint256 public roundId;
    uint256 public lastHalvingRound;
    uint256 public lastRoundTs;
    address public liquidityVault;

    uint256 public constant INITIAL_REWARD          = 666 * 1e18;
    uint256 public constant HALVING_INTERVAL_ROUNDS = 50050;
    uint256 public constant ROUND_DURATION          = 60;
    uint256 public constant FEE                     = 0.1 ether;
    uint256 public constant LIQUIDITY_SHARE         = 5;
    uint32  public constant CALLBACK_GAS_LIMIT      = 200_000;

    mapping(uint256 => mapping(uint256 => address)) public players;
    mapping(uint256 => uint256) public playerCount;
    mapping(uint256 => uint256) private requestToRoundId;
    mapping(uint256 => uint256) private rewardPerRound;

    event Clicked(uint256 indexed roundId, address indexed player);
    event RoundRequested(uint256 indexed requestId, uint256 indexed roundId, uint256 playersCount, uint256 reward);
    event WinnerMinted(uint256 indexed requestId, uint256 indexed roundId, address indexed winner, uint256 amount);
    event Burned(address indexed burner, uint256 amount, uint256 ethOut);

    constructor(address vrfCoordinatorAddress, address _vaultAddress)
        ERC20("SatanGames S Token", "sgS")
        PaintswapVRFConsumer(vrfCoordinatorAddress)
    {
        maxSupply = 66_666_666 * 1e18;
        currentReward = INITIAL_REWARD;
        liquidityVault = _vaultAddress;
        lastRoundTs = block.timestamp;
        roundId = 0;
        lastHalvingRound = 0;
    }

    function Click() external payable {
        if (msg.value < FEE) revert FeeTooLow();

        bool timeIsUp = (block.timestamp >= lastRoundTs + ROUND_DURATION);
        bool hasPlayers = (playerCount[roundId] > 0);

        if (timeIsUp && hasPlayers) {
            uint256 vrfFee = IPaintswapVRFCoordinator(_vrfCoordinator).calculateRequestPriceNative(CALLBACK_GAS_LIMIT);
            if (address(this).balance < vrfFee) revert InsufficientContractBalance();

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

        uint256 idx = playerCount[roundId];
        players[roundId][idx] = msg.sender;
        playerCount[roundId] = idx + 1;

        emit Clicked(roundId, msg.sender);

        uint256 liquidityAmount = (FEE * LIQUIDITY_SHARE) / 100;
        (bool ok, ) = payable(liquidityVault).call{value: liquidityAmount}("");
        if (!ok) revert FeeTransferFailed();

        uint256 change = msg.value - FEE;
        if (change > 0) {
            (ok, ) = payable(msg.sender).call{value: change}("");
            if (!ok) revert RefundFailed();
        }
    }

    function burn(uint256 amount) external {
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
}