"use client"
import { darkTheme } from '@rainbow-me/rainbowkit';

const customTheme = darkTheme({
    accentColor: '#991b1b', 
    accentColorForeground: '#ffffff',
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'small',
  });
  
  customTheme.colors.accentColor = '#dc2626';
  customTheme.colors.accentColorForeground = '#fecaca';
  customTheme.colors.actionButtonBorder = '#ef4444';
  customTheme.colors.closeButton = '#f87171';
  customTheme.colors.closeButtonBackground = '#7f1d1d';
  customTheme.colors.connectButtonBackground = '#000000';
  customTheme.colors.connectButtonInnerBackground = '#7f1d1d';
  customTheme.colors.modalBackground = '#1a1a1a';
  customTheme.colors.modalBorder = '#dc2626';

import { type ReactNode, useState } from "react"
import config from "@/raibowKitConfig"
import { WagmiProvider } from "wagmi"
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@rainbow-me/rainbowkit/styles.css"

export function Providers(props: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())
    return (
        
        <WagmiProvider config={config} >
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={customTheme}>
                    {props.children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}