// Paintswap VRF Coordinator ABI (minimal for fee calculation)
export const paintswapVrfCoordinatorAbi = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "callbackGasLimit", "type": "uint256" }
    ],
    "name": "calculateRequestPriceNative",
    "outputs": [
      { "internalType": "uint256", "name": "payment", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Sonic Mainnet VRF Coordinator address
export const PAINTSWAP_VRF_COORDINATOR = "0x6E3efcB244e74Cb898A7961061fAA43C3cf79691";

// Default callback gas limit (should match contract)
export const CALLBACK_GAS_LIMIT = 200000;
