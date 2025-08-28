"use client"

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sonicBlazeTestnet, sonic } from "viem/chains";

export default getDefaultConfig({
    chains: [sonicBlazeTestnet, sonic],
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
    appName: "Tsender",
    ssr: false,
});