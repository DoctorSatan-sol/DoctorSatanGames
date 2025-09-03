// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

error SNotSent();
error ZeroShares();
error InsufficientAssetsForShares();
error EthTransferFailed();
error NotEnoughBalanceForPayout();
error ReferralCodeAlreadyExists();
error ReferrerAlreadySet();
error ReferralCodeNotFound();
error CannotBeOwnReferrer();
error UserAlreadyHasCode();

contract SatanGamesLP is ERC20, AccessControl{

    constructor() ERC20("SatanGames S Token", "sgS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    struct userInfo {
        uint256 totalReferrals;
        bytes32 referralCode;
        address referrer;
    }

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    uint256 public reservedForBets;
    mapping(bytes32 => address) public referralCodeOwner;
    mapping(address => userInfo) public user;

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

    function createReferralCode(bytes32 _code) public {
        if (user[msg.sender].referralCode != bytes32(0)) {
            revert UserAlreadyHasCode();
        }
        if (referralCodeOwner[_code] != address(0)) {
            revert ReferralCodeAlreadyExists();
        }

        referralCodeOwner[_code] = msg.sender;
        user[msg.sender].referralCode = _code;
    }

    function applyReferralCode(bytes32 _code) public {
        address referrerAddress = referralCodeOwner[_code];

        if (referrerAddress == msg.sender) {
            revert CannotBeOwnReferrer();
        }
        if (referrerAddress == address(0)) {
            revert ReferralCodeNotFound();
        }
        if (user[msg.sender].referrer != address(0)) {
            revert ReferrerAlreadySet();
        }
        
        user[msg.sender].referrer = referrerAddress;
        user[msg.sender].totalReferrals += 1;
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 230)
        );
        require(_success, "FeeM registration failed");
    }

    receive() external payable {}
}