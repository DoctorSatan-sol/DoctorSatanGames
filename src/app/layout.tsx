"use client";

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ReactNode } from "react";
import Header from "@/components/Header";

import { GameWallet } from '@/components/GameWallet';
import { GameWalletProvider } from '@/components/GameWalletContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameWalletProvider>
          <Providers>
            <link href="https://fonts.googleapis.com/css2?family=Creepster&display=swap" rel="stylesheet" />
            
            <Header />
            {children}

            <div className="fixed bottom-5 right-5 z-50">
              <GameWallet />
            </div>

          </Providers>
        </GameWalletProvider>
      </body>
    </html>
  );
}