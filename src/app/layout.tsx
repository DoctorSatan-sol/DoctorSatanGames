"use client";

import { metadata } from "./metadata";
import "./globals.css";
import { Providers } from "./providers";
import { ReactNode } from "react";
import Header from "@/components/Header";

import { GameWallet } from '@/components/GameWallet';
import { GameWalletProvider } from '@/components/GameWalletContext';
import BottomWidgets from '@/components/BottomWidgets';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link href="https://fonts.googleapis.com/css2?family=Creepster&display=swap" rel="stylesheet" />
      </head>
      <body>
        <GameWalletProvider>
          <Providers>
            <link href="https://fonts.googleapis.com/css2?family=Creepster&display=swap" rel="stylesheet" />
            <Header />
            {children}
            <BottomWidgets />
          </Providers>
        </GameWalletProvider>
      </body>
    </html>
  );
}