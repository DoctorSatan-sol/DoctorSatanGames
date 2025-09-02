"use client";

import { useState, useEffect } from 'react';
import { ethers, Wallet, HDNodeWallet, Contract } from 'ethers';
import { useGameWalletContext } from '@/components/GameWalletContext';
import { GrumpyWombatCheckbox } from './GrumpyWombatCheckbox';
import { chains, pocAbi } from '@/constants';

const SONIC_RPC_URL = 'https://rpc.soniclabs.com';
const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);

const NeonInput = ({ value, onChange, placeholder, type = 'text' }: { value: string, onChange: (val: string) => void, placeholder: string, type?: string }) => (
    <div className="relative w-full">
        <input 
            type={type}
            className="w-full rounded-lg bg-[#1a1a1a] p-3 text-gray-200 border border-gray-700 transition-all duration-300 focus:outline-none focus:border-red-700 focus:shadow-[0_0_12px_rgba(220,38,38,0.7),inset_0_0_4px_rgba(185,28,28,0.5)]"
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder} 
        />
        {value && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-gray-300 hover:bg-red-600 hover:text-white" onClick={() => onChange('')}>
                &times;
            </button>
        )}
    </div>
);

export const GameWallet = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'loading' | 'locked' | 'no_wallet' | 'unlocked' | 'create' | 'import' | 'send' | 'show_pk'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const { useGameWallet, setUseGameWallet } = useGameWalletContext();
    const [account, setAccount] = useState<Wallet | HDNodeWallet | null>(null);
    const [balance, setBalance] = useState<string>('0');
    const [encryptedKeystore, setEncryptedKeystore] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [privateKeyInput, setPrivateKeyInput] = useState('');
    const [sendToAddress, setSendToAddress] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [revealedPrivateKey, setRevealedPrivateKey] = useState<string | null>(null);
    const [riskAccepted, setRiskAccepted] = useState(false);
    
    const [cTokenBalance, setCTokenBalance] = useState<string>('0');
    const [assetToSend, setAssetToSend] = useState<'S' | 'C'>('S');
    const [chainId, setChainId] = useState<number | null>(null);

    useEffect(() => {
        const getNetwork = async () => {
            try {
                const network = await provider.getNetwork();
                setChainId(Number(network.chainId));
            } catch (e) {
                console.error("Could not get network", e);
                setError("Could not connect to network");
            }
        };
        getNetwork();
    }, []);
    
    useEffect(() => {
        const sessionKey = sessionStorage.getItem('gameWalletSessionKey');
        if (sessionKey) {
            try {
                const sessionWallet = new ethers.Wallet(sessionKey);
                setAccount(sessionWallet);
                const storedKeystore = localStorage.getItem('gameWalletKeystore');
                if (storedKeystore) setEncryptedKeystore(storedKeystore);
                setView('unlocked');
                return;
            } catch {
                sessionStorage.removeItem('gameWalletSessionKey');
            }
        }
        const storedKeystore = localStorage.getItem('gameWalletKeystore');
        if (storedKeystore) {
            setEncryptedKeystore(storedKeystore);
            setView('locked');
        } else {
            setView('no_wallet');
        }
    }, []);

    const fetchBalance = async (wallet: Wallet | HDNodeWallet) => {
        if (!wallet || !chainId) return;
        setIsLoadingBalance(true);
        setError(null);
        try {
            const bal = await provider.getBalance(wallet.address);
            setBalance(ethers.formatEther(bal));

            const CAddress = chains[chainId]?.poc as `0x${string}`;
            if (CAddress) {
                const cTokenContract = new Contract(CAddress, pocAbi, provider);
                const cTokenBal = await cTokenContract.balanceOf(wallet.address);
                const decimals = await cTokenContract.decimals();
                setCTokenBalance(ethers.formatUnits(cTokenBal, decimals));
            }
        } catch (e: any) {
            console.error('Balance fetch error:', e);
            setError('Failed to update balance');
        } finally {
            setIsLoadingBalance(false);
        }
    };
    
    useEffect(() => {
        if (account && chainId) {
            fetchBalance(account);
            const interval = setInterval(() => fetchBalance(account), 30000);
            return () => clearInterval(interval);
        }
    }, [account, chainId]);

    const handleMaxClick = () => {
        if (assetToSend === 'S') {
            const maxAmount = parseFloat(balance) - 0.01;
            setSendAmount(maxAmount > 0 ? maxAmount.toString() : '0');
        } else {
            setSendAmount(cTokenBalance);
        }
    };

    const handleSend = async () => {
        if (!account || !chainId) return;
        clearError();
        try {
            if (assetToSend === 'S') {
                const walletWithProvider = account.connect(provider);
                const tx = await walletWithProvider.sendTransaction({ to: sendToAddress, value: ethers.parseEther(sendAmount) });
                alert(`Transaction sent! Hash: ${tx.hash}`);
                await tx.wait();
            } else {
                const CAddress = chains[chainId]?.poc as `0x${string}`;
                if (!CAddress) {
                    setError("Token C not configured for this network.");
                    return;
                }
                const cTokenContract = new Contract(CAddress, pocAbi, account.connect(provider));
                const decimals = await cTokenContract.decimals();
                const amountToSend = ethers.parseUnits(sendAmount, decimals);
                const tx = await cTokenContract.transfer(sendToAddress, amountToSend);
                alert(`Transaction sent! Hash: ${tx.hash}`);
                await tx.wait();
            }
            fetchBalance(account);
            setView('unlocked');
            clearInputs();
        } catch (e: any) {
            console.error(e);
            setError(e.reason || e.message || 'Transaction error');
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    const clearError = () => setError(null);
    const clearInputs = () => {
        setPassword(''); setPrivateKeyInput(''); setSendAmount(''); setSendToAddress(''); setRevealedPrivateKey(null); setRiskAccepted(false);
    };
    const handleCreateWallet = async () => {
        clearError();
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
        try {
            const newWallet = ethers.Wallet.createRandom();
            const keystore = await newWallet.encrypt(password);
            localStorage.setItem('gameWalletKeystore', keystore);
            sessionStorage.setItem('gameWalletSessionKey', newWallet.privateKey);
            setEncryptedKeystore(keystore);
            setAccount(newWallet);
            setView('unlocked');
            clearInputs();
        } catch (e) { console.error(e); setError('Error creating wallet'); }
    };
    const handleImportWallet = async () => {
        clearError();
        if (!ethers.isHexString(privateKeyInput, 32)) { setError('Invalid private key format'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
        try {
            const importedWallet = new ethers.Wallet(privateKeyInput);
            const keystore = await importedWallet.encrypt(password);
            localStorage.setItem('gameWalletKeystore', keystore);
            sessionStorage.setItem('gameWalletSessionKey', importedWallet.privateKey);
            setEncryptedKeystore(keystore);
            setAccount(importedWallet);
            setView('unlocked');
            clearInputs();
        } catch (e) { console.error(e); setError('Failed to import wallet'); }
    };
    const handleUnlock = async () => {
        clearError();
        if (!encryptedKeystore) return;
        try {
            const unlockedWallet = await ethers.Wallet.fromEncryptedJson(encryptedKeystore, password);
            sessionStorage.setItem('gameWalletSessionKey', unlockedWallet.privateKey);
            setAccount(unlockedWallet);
            setView('unlocked');
            clearInputs();
        } catch (e) { console.error(e); setError('Wrong password'); }
    };
    const handleVerifyPasswordAndShowPk = async () => {
        clearError();
        if (!encryptedKeystore) return;
        try {
            const wallet = await ethers.Wallet.fromEncryptedJson(encryptedKeystore, password);
            setRevealedPrivateKey(wallet.privateKey);
            setPassword('');
        } catch (e) { setError('Wrong password'); }
    };
    const handleDeleteWallet = () => {
        if (window.confirm('Are you sure? This action cannot be undone.')) {
            localStorage.removeItem('gameWalletKeystore');
            sessionStorage.removeItem('gameWalletSessionKey');
            setAccount(null);
            setEncryptedKeystore(null);
            setView('no_wallet');
            setUseGameWallet(false);
            clearInputs();
        }
    };
    const navigate = (newView: typeof view) => {
        clearError();
        clearInputs();
        setView(newView);
    }
    
    const renderContent = () => {
        if (view === 'loading') return <p className="text-center text-gray-400">Loading wallet...</p>;
        
        if (error) {
            return (
                <div className="flex flex-col gap-4">
                    <div className="text-center text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">Error: {error}</div>
                    <button className="w-full rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white" onClick={() => { clearError(); if(account) setView('unlocked'); else if(encryptedKeystore) setView('locked'); else setView('no_wallet'); }}>Back</button>
                </div>
            );
        }

        switch (view) {
            case 'no_wallet':
                return (
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="text-2xl font-medium text-white">Game Wallet</h3>
                        <p className="text-gray-400">No wallet found.</p>
                        <div className="w-full flex flex-col gap-3">
                           <button onClick={() => navigate('create')} className="w-full rounded-lg border border-red-600 px-4 py-2 text-red-300 transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.7)]">Create New Wallet</button>
                           <button onClick={() => navigate('import')} className="w-full rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Import Wallet</button>
                        </div>
                    </div>
                );
            case 'create':
            case 'import':
                return (
                     <div>
                        <h3 className="mb-4 text-center text-2xl font-medium text-white">{view === 'create' ? 'Create Wallet' : 'Import Wallet'}</h3>
                        {view === 'import' && <NeonInput type="password" value={privateKeyInput} onChange={setPrivateKeyInput} placeholder="Private key (0x...)" />}
                        <NeonInput type="password" value={password} onChange={setPassword} placeholder="Password (min 8 chars)" />
                        
                        <div className="my-4">
                            <label className="flex cursor-pointer items-start gap-3">
                                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-red-600" checked={riskAccepted} onChange={(e) => setRiskAccepted(e.target.checked)} />
                                <span className="text-xs text-gray-400">I understand the risks: my key is stored in the browser, which can be insecure. Loss of the key or password will result in loss of access to funds.</span>
                            </label>
                        </div>

                        <div className="mt-4 flex w-full gap-4">
                            <button onClick={() => navigate('no_wallet')} className="w-full rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Back</button>
                            <button onClick={view === 'create' ? handleCreateWallet : handleImportWallet} disabled={!riskAccepted} className="w-full rounded-lg border border-red-600 px-4 py-2 text-red-300 transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.7)] disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-gray-800 disabled:border-gray-600">
                                {view === 'create' ? 'Create' : 'Import'}
                            </button>
                        </div>
                    </div>
                );
            case 'locked':
                 return (
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="text-2xl font-medium text-white">Wallet Locked</h3>
                        <NeonInput type="password" value={password} onChange={setPassword} placeholder="Enter password" />
                        <button onClick={handleUnlock} className="w-full rounded-lg border border-red-600 px-4 py-2 text-red-300 transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.7)]">Unlock</button>
                    </div>
                );
            case 'unlocked':
                if (!account) return <p className="text-center text-gray-400">Loading...</p>;
                return (
                    <div className="flex flex-col gap-4">
                        <h3 className="text-center text-2xl font-medium text-white">Your Wallet</h3>
                        
                        <div className="space-y-3 rounded-lg bg-gray-900/50 p-3 border border-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-gray-300">{`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}</span>
                                <button onClick={() => copyToClipboard(account.address)} className="text-xs text-red-400 hover:text-red-300">{isCopied ? 'Copied!' : 'Copy Address'}</button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Balance (S):</span>
                                <span className="font-mono text-white">{isLoadingBalance ? '...' : `${parseFloat(balance).toFixed(5)}`}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Balance (C):</span>
                                <span className="font-mono text-white">{isLoadingBalance ? '...' : `${parseFloat(cTokenBalance).toFixed(5)}`}</span>
                            </div>
                            <button onClick={() => fetchBalance(account)} disabled={isLoadingBalance} className="w-full pt-2 text-xs text-center text-gray-500 hover:text-white disabled:opacity-50 border-t border-gray-800">
                                {isLoadingBalance ? 'Updating...' : 'Refresh balances'}
                            </button>
                        </div>

                        {/* Чекбокс перенесён в хедер */}
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('send')} className="rounded-lg border border-gray-600 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Send</button>
                            <button onClick={() => navigate('show_pk')} className="rounded-lg border border-gray-600 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Private Key</button>
                        </div>
                        <button onClick={handleDeleteWallet} className="w-full rounded-lg border border-red-800/50 bg-red-500/10 py-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300">Delete Wallet</button>
                    </div>
                );
             case 'send':
                return (
                    <div>
                        <h3 className="mb-4 text-center text-2xl font-medium text-white">Send</h3>
                        
                        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-900 p-1 border border-gray-800">
                            <button onClick={() => setAssetToSend('S')} className={`w-full rounded-md py-1 text-sm transition ${assetToSend === 'S' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>S</button>
                            <button onClick={() => setAssetToSend('C')} className={`w-full rounded-md py-1 text-sm transition ${assetToSend === 'C' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>C</button>
                        </div>

                        <div className="mb-0"><NeonInput type="text" value={sendToAddress} onChange={setSendToAddress} placeholder="Recipient address (0x...)" /></div>
                        
                        <div className="relative w-full mb-3">
                            <NeonInput type="text" value={sendAmount} onChange={setSendAmount} placeholder={`Amount (${assetToSend})`} />
                            <button onClick={handleMaxClick} className="absolute right-10 top-1/2 -translate-y-1/2 rounded bg-red-800/70 px-2 py-0.5 text-xs text-red-200 hover:bg-red-700">
                                MAX
                            </button>
                        </div>
                        
                        <div className="mt-4 flex w-full gap-4">
                            <button onClick={() => navigate('unlocked')} className="w-full rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Back</button>
                            <button onClick={handleSend} className="w-full rounded-lg border border-red-600 px-4 py-2 text-red-300 transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.7)]">Send Transaction</button>
                        </div>
                    </div>
                );
            case 'show_pk':
                return (
                    <div>
                        <h3 className="mb-4 text-center text-2xl font-medium text-white">Private Key</h3>
                        {revealedPrivateKey ? (
                            <div className="flex flex-col gap-4">
                                <div className="text-center text-yellow-400 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30 text-xs">
                                    ⚠️ Never share this key with anyone!
                                </div>
                                <div className="break-all rounded-lg bg-gray-900 p-3 font-mono text-sm text-red-400 border border-gray-700">
                                    {revealedPrivateKey}
                                </div>
                                <div className="flex w-full gap-4">
                                    <button onClick={() => setRevealedPrivateKey(null)} className="w-full rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Hide</button>
                                    <button onClick={() => copyToClipboard(revealedPrivateKey)} className="w-full rounded-lg border border-red-600 px-4 py-2 text-red-300 transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.7)]">
                                        {isCopied ? 'Copied!' : 'Copy Key'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="mb-4 text-center text-gray-400">Enter password to reveal private key.</p>
                                <NeonInput type="password" value={password} onChange={setPassword} placeholder="Enter password" />
                                <div className="mt-4 flex w-full gap-4">
                                    <button onClick={() => navigate('unlocked')} className="w-full rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition hover:bg-gray-700 hover:text-white">Back</button>
                                    <button onClick={handleVerifyPasswordAndShowPk} className="w-full rounded-lg border border-red-600 px-4 py-2 text-red-300 transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.7)]">Reveal</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="rounded-lg border border-red-800 bg-[#111] px-2 py-2 font-medium text-red-300 shadow-[0_0_15px_rgba(200,0,0,0.6),inset_0_0_4px_rgba(180,20,20,0.5)] transition-all duration-300 hover:bg-red-700 hover:text-white hover:border-red-600 hover:shadow-[0_0_20px_rgba(255,0,0,0.8),inset_0_0_6px_rgba(255,100,100,0.5)]"
                >
                    <span className="inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 20 16" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 2.25c.38-1.01 1.87-1.01 2.25 0l.19.5a1.13 1.13 0 001.45.65l.5-.19c.97-.37 1.93.59 1.56 1.56l-.19.5a1.13 1.13 0 00.65 1.45l.5.19c1.01.38 1.01 1.87 0 2.25l-.5.19a1.13 1.13 0 00-.65 1.45l.19.5c.37.97-.59 1.93-1.56 1.56l-.5-.19a1.13 1.13 0 00-1.45.65l-.19.5c-.38 1.01-1.87 1.01-2.25 0l-.19-.5a1.13 1.13 0 00-1.45-.65l-.5.19c-.97.37-1.93-.59-1.56-1.56l.19-.5a1.13 1.13 0 00-.65-1.45l-.5-.19c-1.01-.38-1.01-1.87 0-2.25l.5-.19a1.13 1.13 0 00.65-1.45l-.19-.5c-.37-.97.59-1.93 1.56-1.56l.5.19a1.13 1.13 0 001.45-.65l.19-.5z" />
                            <circle cx="12.5" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Game Wallet
                    </span>
                </button>
            </div>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative w-[400px] max-w-[90vw] rounded-xl border border-red-800/70 bg-[#0A0A0A] p-6 shadow-[0_0_30px_rgba(200,0,0,0.5),inset_0_0_10px_rgba(100,0,0,0.5)]">
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-gray-500 transition hover:text-white text-2xl"
                        >
                            &times;
                        </button>
                        {renderContent()}
                    </div>
                </div>
            )}
        </>
    );
};