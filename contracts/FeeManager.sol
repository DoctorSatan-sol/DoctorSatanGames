// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IFEEM {
    function newRewardClaim(uint256 projectId) external;
    function updateProjectOwner(uint256 projectId, address newOwner) external;
}

error TransferFailed();

contract FeeManager{
    IFEEM public feem;
    uint256 immutable public projectId;
    address immutable public owner;
    uint256 public houseFeeBps = 2000; // 20%
    address public liquidityPool;
    address public poc;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address feemAddress, uint256 _projectId, address _liquidityPool, address _poc) {
        feem = IFEEM(feemAddress);
        projectId = _projectId;
        owner = msg.sender;
        liquidityPool = _liquidityPool;
        poc = _poc;
    }
    
    function claim() external {
        feem.newRewardClaim(projectId);
        _distribute();
    }

    function _distribute() internal {
        uint256 houseFee = (address(this).balance * houseFeeBps) / 10000;
        (bool success, ) = poc.call{value: address(this).balance - houseFee}("");
        if (!success){revert TransferFailed();}
        (bool success2, ) = liquidityPool.call{value: houseFee}("");
        if (!success2){revert TransferFailed();}
    }

    function changeFeemOwner(address _newOwner) external onlyOwner{
        feem.updateProjectOwner(projectId, _newOwner);
    }

    function changeHouseFeeBps(uint256 _newHouseFeeBps) external onlyOwner{
        houseFeeBps = _newHouseFeeBps;
    }

    function setAddresses(address _liquidityPool, address _poc) external onlyOwner {
        liquidityPool = _liquidityPool;
        poc = _poc;
    }

    receive() external payable {}

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 230)
        );
        require(_success, "FeeM registration failed");
    }
}