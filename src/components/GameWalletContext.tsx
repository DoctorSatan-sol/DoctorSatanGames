"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface GameWalletContextType {
    useGameWallet: boolean;
    setUseGameWallet: (value: boolean) => void;
}

const GameWalletContext = createContext<GameWalletContextType | undefined>(undefined);

export const GameWalletProvider = ({ children }: { children: ReactNode }) => {
    const [useGameWallet, setUseGameWalletState] = useState(false);

    useEffect(() => {
        const storedPreference = localStorage.getItem('useGameWallet');
        if (storedPreference === 'true') {
            setUseGameWalletState(true);
        }
    }, []);

    const setUseGameWallet = (value: boolean) => {
        localStorage.setItem('useGameWallet', value.toString());
        setUseGameWalletState(value);
    };

    return (
        <GameWalletContext.Provider value={{ useGameWallet, setUseGameWallet }}>
            {children}
        </GameWalletContext.Provider>
    );
};

export const useGameWalletContext = () => {
    const context = useContext(GameWalletContext);
    if (context === undefined) {
        throw new Error('useGameWalletContext must be used within a GameWalletProvider');
    }
    return context;
};