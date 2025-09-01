"use client"

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const sonic = defineChain({
  id: 146,
  name: 'Sonic',
  nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://sonic-rpc.publicnode.com'],
      webSocket: ['wss://sonic-rpc.publicnode.com'],
    },
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://sonicscan.org' },
  },
  testnet: false,
});

export default getDefaultConfig({
  chains: [sonic],
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  appName: "Tsender",
  ssr: false,
});