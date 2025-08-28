// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

error SNotSent();
error ZeroShares();
error InsufficientAssetsForShares();
error EthTransferFailed();
error NotEnoughBalanceForPayout();

contract SatanGamesLP is ERC20, AccessControl{

    constructor() ERC20("SatanGames S Token", "sgS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    uint256 public reservedForBets;

    function addOwner(address newOwnerContract) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OWNER_ROLE, newOwnerContract);
    }

    function removeOwner(address ownerContract) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(OWNER_ROLE, ownerContract);
    }

    function stake() external payable {
        if (msg.value < 1 ether) {
            revert SNotSent();
        }

        uint256 totalShares = totalSupply();
        uint256 totalAssets = address(this).balance - msg.value;
        uint256 sharesToMint;

        if (totalShares == 0 || totalAssets == 0) {
            sharesToMint = msg.value;
        } else {
            sharesToMint = (msg.value * totalShares) / totalAssets;
        }

        _mint(msg.sender, sharesToMint);
    }

    function unstake(uint256 _shares) external {
        if (_shares == 0) {
            revert ZeroShares();
        }

        uint256 totalShares = totalSupply();
        uint256 totalAssets = address(this).balance;
        uint256 availableAssets = totalAssets - reservedForBets;

        uint256 assetsToReturn = (_shares * totalAssets) / totalShares;

        if (assetsToReturn > availableAssets) {
            revert InsufficientAssetsForShares();
        }

        if (assetsToReturn == 0) {
            revert InsufficientAssetsForShares();
        }

        _burn(msg.sender, _shares);

        (bool success, ) = msg.sender.call{value: assetsToReturn}("");
        if (!success) {
            revert EthTransferFailed();
        }
    }

    function mint(address to, uint256 amount) internal {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) internal {
        _burn(from, amount);
    }

    function getBalance(address _user) public view returns(uint256 balance) {
        uint256 userLpBalance = balanceOf(_user);
        return userLpBalance;
    }

    function getLiquidity() external view returns (uint256) {
        return address(this).balance;
    }

    function getReservedForBets() external view returns (uint256) {
        return reservedForBets;
    }

    function payout(address _winner, uint256 _amount) external onlyRole(OWNER_ROLE) {
        uint256 currentBalance = address(this).balance;
        if (_amount > currentBalance) {
            revert NotEnoughBalanceForPayout();
        }

        (bool success, ) = _winner.call{value: _amount}("");
        if (!success) {
            revert EthTransferFailed();
        }
    }

    function increaseReserve(uint256 _amount) external onlyRole(OWNER_ROLE) {
        reservedForBets += _amount;
    }

    function decreaseReserve(uint256 _amount) external onlyRole(OWNER_ROLE) {
        if (_amount > reservedForBets) {
            revert("Cannot decrease more than reserved");
        }
        reservedForBets -= _amount;
    }

    receive() external payable {}
}