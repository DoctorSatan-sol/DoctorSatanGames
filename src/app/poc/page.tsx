
"use client";
// TypeScript: declare custom property for manual nonce management
declare global {
	interface Window {
		_gwNonceRef?: { value: number | null, address: string | null };
	}
}

// Helper: get highest pending nonce for address from mempool (if any), else use latest
async function getInitialGameWalletNonce(provider: any, address: string): Promise<number> {
	// Try to get all pending transactions from mempool (block 'pending')
	try {
		const pendingBlock = await provider.send('eth_getBlockByNumber', ['pending', true]);
		let maxPendingNonce: number | null = null;
		if (pendingBlock && pendingBlock.transactions && Array.isArray(pendingBlock.transactions)) {
			for (const tx of pendingBlock.transactions) {
				if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
					const txNonce = parseInt(tx.nonce, 16);
					if (maxPendingNonce === null || txNonce > maxPendingNonce) {
						maxPendingNonce = txNonce;
					}
				}
			}
		}
		if (maxPendingNonce !== null) {
			return maxPendingNonce + 1;
		}
	} catch (e) {
		// fallback below
	}
	// Fallback: use latest confirmed nonce
	const latestNonce = await provider.getTransactionCount(address, 'latest');
	return latestNonce;
}

import { useEffect, useState } from "react";
import { Wallet, HDNodeWallet, ethers } from "ethers";
import React from "react";
import { simulateContract, writeContract, waitForTransactionReceipt, readContract } from "@wagmi/core";
import { toast } from "react-hot-toast";
import { useChainId, useConfig, useReadContract, useAccount, useWatchContractEvent, useBalance } from "wagmi";
import { chains, pocAbi, chainlinkAbi } from "@/constants";
import { paintswapVrfCoordinatorAbi, PAINTSWAP_VRF_COORDINATOR, CALLBACK_GAS_LIMIT } from "@/paintswapVrf";
import "../roulette/hide-scrollbar.css";
import { useGameWalletContext } from "@/components/GameWalletContext";


export default function ProofOfClickUI() {
	// Get regular wallet address via wagmi
	const { address } = useAccount();
	// Game Wallet context
	const { useGameWallet, setUseGameWallet } = useGameWalletContext();
	// For Game Wallet
	const [gameWalletAddress, setGameWalletAddress] = useState<string | null>(null);
	useEffect(() => {
		try {
			const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem('gameWalletSessionKey') : null;
			if (sessionKey) {
				const wallet = new Wallet(sessionKey);
				setGameWalletAddress(wallet.address);
			} else {
				setGameWalletAddress(null);
			}
		} catch (e) {
			setGameWalletAddress(null);
		}
	}, []);

	// For totalUserClicks, totalUserReferrals, totalUserWins you need the user address, can be added later via useAccount
	// ...existing code...
	const [showDetails, setShowDetails] = React.useState(false);
	const chainId = useChainId();
	const config = useConfig();
	const pocAddress = chains[chainId]?.poc as `0x${string}`;
	const SONIC_RPC_URL = 'https://sonic-rpc.publicnode.com';
	const { data: nativeBalance } = useBalance({ address: pocAddress });

// Chainlink FTM/USD (or other native/USD) for price in $ (address should be in chains[chainId]?.chainlink)
const { data: roundData } = useReadContract({
	abi: chainlinkAbi,
	address: chains[chainId]?.chainlink as `0x${string}`,
	functionName: 'latestRoundData',
	query: { enabled: !!chains[chainId]?.chainlink }
});
const answer = roundData && Array.isArray(roundData) ? roundData[1] : BigInt(0);
const nativePriceUSD = answer ? Number(answer) / 1e8 : 0;
 // Live feed for WinnerMinted
 const [liveFeed, setLiveFeed] = useState<any[]>([]);

 // Load all past WinnerMinted events (universal function)
 async function fetchPastWinners() {
	 if (!pocAddress) return;
	 try {
		 const { ethers } = await import("ethers");
		 const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);
		 const contract = new ethers.Contract(pocAddress, pocAbi, provider);
		 const filter = contract.filters.WinnerMinted();
		 const logs = await contract.queryFilter(filter, -2000);
		 const { Interface } = await import("ethers");
		 const iface = new Interface(pocAbi);
		 const blockTimestamps: Record<string, number> = {};
		 for (const log of logs) {
			 const blockNumStr = String(log.blockNumber);
			 if (!blockTimestamps[blockNumStr]) {
				 const block = await provider.getBlock(log.blockNumber);
				 if (block && block.timestamp) {
					 blockTimestamps[blockNumStr] = block.timestamp * 1000;
				 }
			 }
		 }
		 const events = logs.map(log => {
			 let args;
			 if ('args' in log && log.args) {
				 args = log.args;
			 } else {
				 args = iface.decodeEventLog("WinnerMinted", log.data, log.topics);
			 }
			 const blockNumStr = String(log.blockNumber);
			 return {
				 winner: args.winner,
				 roundId: Number(args.roundId),
				 amount: Number(args.amount) / 1e18,
				 time: blockTimestamps[blockNumStr] || Date.now(),
				 txHash: log.transactionHash,
			 };
		 });
		 setLiveFeed(prev => {
			 // Merge new events with previous ones by txHash (uniqueness)
			 const all = [...events.reverse(), ...prev];
			 const unique = [];
			 const seen = new Set();
			 for (const e of all) {
				 if (!seen.has(e.txHash)) {
					 unique.push(e);
					 seen.add(e.txHash);
				 }
				 if (unique.length >= 5) break;
			 }
			 return unique;
		 });
	 } catch {}
 }

 // Load on mount
 useEffect(() => { fetchPastWinners(); }, [pocAddress]);
 const [refreshTrigger, setRefreshTrigger] = useState(0);
const [pageClicks, setPageClicks] = useState(0);
// New counter for batchClick
const [pendingClicks, setPendingClicks] = useState(0);
const pendingClicksRef = React.useRef(0);
const batchClickTimeout = React.useRef<NodeJS.Timeout | null>(null);

// Track the actual value of pendingClicks
React.useEffect(() => {
	pendingClicksRef.current = pendingClicks;
}, [pendingClicks]);

// Function to send batchClick (500 at a time)
async function sendBatchClicks(n: number) {
	if (!pocAddress || !config) return;
	if (n <= 0) return;
	const send = async (count: number) => {
		try {
			// Calculate the sum: count * 0.01 + vrfFee
			const baseValue = ethers.parseEther('0.01');
			const countBig = BigInt(count);
			const totalValue = baseValue * countBig + (vrfFee ? BigInt(vrfFee) : BigInt(0));
						if (useGameWallet) {
								const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem('gameWalletSessionKey') : null;
								if (!sessionKey) throw new Error('Game Wallet is not unlocked');
								const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);
								const wallet = new Wallet(sessionKey, provider);
								const contract = new ethers.Contract(pocAddress, pocAbi, wallet);
								await contract.batchClick(count, { value: totalValue });
								// After a successful transaction — recalculate nonce
								if (window._gwNonceRef) {
									const address = await wallet.getAddress();
									window._gwNonceRef.value = await getInitialGameWalletNonce(provider, address);
									window._gwNonceRef.address = address;
								}
						} else {
				await writeContract(config, {
					abi: pocAbi,
					address: pocAddress,
					functionName: 'batchClick',
					args: [count],
					value: totalValue,
				});
			}
			toast.success(`batchClick(${count}) sent`);
		} catch (e) {
			toast.error('batchClick failed');
		}
		debouncedStatsUpdate();
	};
	// Send in batches of 500 at a time
	let left = n;
	while (left > 0) {
		const toSend = Math.min(left, 500);
		await send(toSend);
		left -= toSend;
	}
}

// Debounce function for sending batchClick after a pause
function scheduleBatchClick() {
	if (batchClickTimeout.current) clearTimeout(batchClickTimeout.current);
	batchClickTimeout.current = setTimeout(() => {
		const clicks = pendingClicksRef.current;
		if (clicks > 0) {
			sendBatchClicks(clicks);
			setPendingClicks(0);
		}
	}, 500); // 500 ms after the last click
}
 useWatchContractEvent({
	 address: pocAddress,
	 abi: pocAbi,
	 eventName: 'WinnerMinted',
	 onLogs(logs) {
		 for (const log of logs) {
			 const args = (log as any).args;
			 if (!args) continue;
									 // Get block timestamp for new WinnerMinted
									 (async () => {
										 let blockTimestamp = Date.now();
										 try {
											 if (log.blockNumber && window.ethereum) {
												 const { ethers } = await import("ethers");
												 const provider = new ethers.BrowserProvider(window.ethereum);
												 const block = await provider.getBlock(log.blockNumber);
												 if (block && block.timestamp) blockTimestamp = block.timestamp * 1000;
											 }
										 } catch {}
										 setLiveFeed(prev => [
											 {
												 winner: args.winner,
												 roundId: Number(args.roundId),
												 amount: Number(args.amount) / 1e18,
												 time: blockTimestamp,
												 txHash: log.transactionHash,
											 },
											 ...prev
										 ].slice(0, 5));
									 })();
		 }
	 },
 });

 
const [gwUserClicks, setGwUserClicks] = useState<number|null>(null);
const [gwUserWins, setGwUserWins] = useState<number|null>(null);
const [userBalance, setUserBalance] = useState<number|null>(null);
const [gwBalance, setGwBalance] = useState<number|null>(null);
const [totalClicks, setTotalClicks] = useState<number|null>(null);
const [userClicks, setUserClicks] = useState<number|null>(null);
const [userWins, setUserWins] = useState<number|null>(null);
const [totalSupply, setTotalSupply] = useState<number|null>(null);

const [maxSupply, setMaxSupply] = useState<number|null>(null);
// State for the burn modal window
const [showBurnModal, setShowBurnModal] = useState(false);
const [burnAmount, setBurnAmount] = useState<string>('');
const [burnLoading, setBurnLoading] = useState(false);
// Function for burning tokens
async function handleBurn() {
	if (!pocAddress || !burnAmount || isNaN(Number(burnAmount))) return;
	setBurnLoading(true);
	try {
		const amount = ethers.parseUnits(burnAmount, 18);
		if (useGameWallet) {
			// Burn via Game Wallet
			const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem('gameWalletSessionKey') : null;
			if (!sessionKey) throw new Error('Game Wallet is not unlocked');
			const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);
			const wallet = new Wallet(sessionKey, provider);
			const contract = new ethers.Contract(pocAddress, pocAbi, wallet);
			await contract.burn(amount);
		} else {
			if (!address) return;
			await writeContract(config, {
				abi: pocAbi,
				address: pocAddress,
				functionName: 'burn',
				args: [amount],
			});
		}
		toast.success('Tokens burned successfully!');
		setShowBurnModal(false);
		setBurnAmount('');
		fetchStats();
	} catch (e) {
		toast.error('Burn failed');
	} finally {
		setBurnLoading(false);
	}
}

async function fetchStats() {
	if (!pocAddress) return;
	try {
		if (gameWalletAddress) setGwUserClicks(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "totalUserClicks", args: [gameWalletAddress] })));
		if (gameWalletAddress) setGwUserWins(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "totalUserWins", args: [gameWalletAddress] })));
		if (address) setUserBalance(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "balanceOf", args: [address] })));
		if (gameWalletAddress) setGwBalance(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "balanceOf", args: [gameWalletAddress] })));
		setTotalClicks(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "totalClicks" })));
		if (address) setUserClicks(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "totalUserClicks", args: [address] })));
		if (address) setUserWins(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "totalUserWins", args: [address] })));
		setTotalSupply(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "totalSupply" })));
		setMaxSupply(Number(await readContract(config, { abi: pocAbi, address: pocAddress, functionName: "maxSupply" })));
	} catch {}
}

useEffect(() => { fetchStats(); }, [pocAddress, address, gameWalletAddress]);
// For Burn Supply, Price, TVL C, TVL $ — if there are no direct methods, leave as "..." or add later


// Token price: 1 * contract balance (native) / totalSupply
let price: string | number = '...';
let tvl: string | number = '...';
let priceUSD: string | number = '...';
let tvlUSD: string | number = '...';
if (nativeBalance) {
	const contractNative = Number(nativeBalance.value) / 1e18;
	tvl = contractNative.toLocaleString(undefined, { maximumFractionDigits: 4 });
	if (nativePriceUSD) {
		tvlUSD = (contractNative * nativePriceUSD).toLocaleString(undefined, { maximumFractionDigits: 2 });
	}
}
if (nativeBalance && totalSupply && Number(totalSupply) > 0) {
	const contractNative = Number(nativeBalance.value) / 1e18;
	const supply = Number(totalSupply) / 1e18;
	price = (contractNative / supply).toFixed(6);
	if (nativePriceUSD) {
		priceUSD = ((contractNative / supply) * nativePriceUSD).toFixed(6);
	}
}

// VRF fee calculation (like in roulette)
const { data: vrfFeeData } = useReadContract({
	abi: paintswapVrfCoordinatorAbi,
	address: PAINTSWAP_VRF_COORDINATOR,
	functionName: 'calculateRequestPriceNative',
	args: [CALLBACK_GAS_LIMIT],
	query: { enabled: true },
});
const [vrfFee, setVrfFee] = useState<bigint | null>(null);
useEffect(() => { if (vrfFeeData) setVrfFee(BigInt(vrfFeeData.toString())); }, [vrfFeeData]);
// Main values
const { data: currentReward } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "currentReward", query: { enabled: !!pocAddress } });
const { data: roundId, refetch: refetchRoundId } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "roundId", query: { enabled: !!pocAddress } });
const { data: playersInRound, refetch: refetchPlayersInRound } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "playerCount", args: [roundId ?? 0], query: { enabled: !!pocAddress && roundId !== undefined } });

// Detailed values for the dropdown menu
const { data: tokenName } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "name", query: { enabled: !!pocAddress } });
const { data: symbol } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "symbol", query: { enabled: !!pocAddress } });
const { data: initialReward } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "INITIAL_REWARD", query: { enabled: !!pocAddress } });
const { data: fee } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "FEE", query: { enabled: !!pocAddress } });
const { data: halvingInterval } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "HALVING_INTERVAL_ROUNDS", query: { enabled: !!pocAddress } });
const { data: lastHalvingRound } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "lastHalvingRound", query: { enabled: !!pocAddress } });
const { data: nextHalvingRound } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "nextHalvingRound", query: { enabled: !!pocAddress } });
	 const { data: roundDuration } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "ROUND_DURATION", query: { enabled: !!pocAddress } });
	 const { data: lastRoundTs } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "lastRoundTs", query: { enabled: !!pocAddress } });
	 const { data: liquidityShare } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "LIQUIDITY_SHARE", query: { enabled: !!pocAddress } });
	 const { data: liquidityVault } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "liquidityVault", query: { enabled: !!pocAddress } });
		// ...existing code...

		const [isClicking, setIsClicking] = useState(false);

		function handleClick() {
			setPageClicks(c => c + 1);
			setPendingClicks(c => c + 1);
			scheduleBatchClick();
		}
	// ...existing code...
	// Disable click button only for regular wallet
	const clickDisabled = useGameWallet ? false : isClicking;

	// Debounced stats update (1 second)
	const statsUpdateTimeout = React.useRef<NodeJS.Timeout | null>(null);
	function debouncedStatsUpdate() {
		if (statsUpdateTimeout.current) clearTimeout(statsUpdateTimeout.current);
		statsUpdateTimeout.current = setTimeout(() => {
			fetchStats();
			fetchPastWinners();
			refetchRoundId();
			refetchPlayersInRound();
		}, 1000);
	}

	return (
		<div key={refreshTrigger} className="min-h-screen bg-gradient-to-b from-red-950 to-black flex flex-col items-center justify-start pt-4">
			{/* Game Wallet toggle */}
			<div className="flex flex-col md:flex-row gap-5 w-full justify-center items-stretch">
				{/* Live Feed — 1/5 of the screen */}
				<div className="flex flex-col basis-full md:basis-1/5 max-w-full md:max-w-[20%] mb-5 md:mb-0 md:mr-2">
					<div className="bg-black/70 border-2 border-red-800 rounded-xl p-2 shadow-lg w-full flex flex-col items-center">
						<h2 className="text-lg font-bold text-red-200 mb-2 text-center">Live</h2>
						<div className="bg-black/70 border-2 border-red-800 rounded-xl p-2 shadow-lg w-full flex flex-col gap-2 items-center min-h-[700px]">
							<div className="flex flex-col items-center gap-1 w-full">
								<div className="flex flex-col items-center gap-3 w-full">
									{liveFeed.length === 0 && (
										<div className="text-gray-400 text-sm italic text-center mt-2">No winners yet</div>
									)}
									{liveFeed.map((item, idx) => (
										<div key={item.txHash || idx} className="w-full bg-gradient-to-br from-red-900 via-black to-red-800 border-2 border-red-400 rounded-xl shadow-2xl p-4 flex flex-col gap-2 transform hover:scale-105 transition-all duration-150" style={{boxShadow:'0 6px 24px 0 #7f1d1d99, 0 1.5px 0 #fff4 inset'}}>
											<div className="flex justify-between items-center text-yellow-200 font-mono text-sm">
												<span>Round #{item.roundId}</span>
												<span>Reward: <span className="font-bold">{item.amount.toLocaleString()}C</span></span>
											</div>
											<div className="flex justify-between items-center text-white font-mono text-xs">
												<span>Winner:</span>
												<span className="truncate max-w-[120px] text-green-300">{item.winner.slice(0, 6)}...{item.winner.slice(-4)}</span>
											</div>
											<div className="flex justify-between items-center text-white font-mono text-xs">
												<span>Tx:</span>
												<a href={`https://sonicscan.org/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline truncate max-w-[120px]">{item.txHash?.slice(0, 8)}...{item.txHash?.slice(-6)}</a>
											</div>
											<div className="flex justify-between items-center text-white font-mono text-xs">
												<span>Time:</span>
												<span>{new Date(item.time).toLocaleTimeString()}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
				{/* Referral System + Leaderboard — 1/5 экрана */}
				<div className="flex flex-col gap-4 basis-full md:basis-1/5 max-w-full md:max-w-[20%] mb-5 md:mb-0 h-[340px] order-2">
					<div className="bg-black/60 border-2 border-red-800 rounded-xl p-2 flex flex-col justify-between shadow-lg gap-0.5 relative">
		{/* Burn button */}
		<button
			className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-br from-yellow-500 via-red-700 to-black border border-yellow-400 rounded-full text-sm text-white font-extrabold shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
			style={{ boxShadow: '0 0 8px 1px #fbbf24cc, 0 1px 0 #fff4 inset' }}
			onClick={() => setShowBurnModal(true)}
		>
			<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 2c.28 0 .53.15.66.39l3.5 6.06a.75.75 0 0 1-.66 1.11H8.5a.75.75 0 0 1-.66-1.11l3.5-6.06A.75.75 0 0 1 12 2Zm0 2.62L10.13 7.5h3.74L12 4.62ZM5.25 9.5A.75.75 0 0 1 6 8.75h12a.75.75 0 0 1 .75.75v7A6.25 6.25 0 0 1 12.5 22h-1A6.25 6.25 0 0 1 5.25 16.5v-7Zm1.5.75v6.25a4.75 4.75 0 0 0 4.75 4.75h1a4.75 4.75 0 0 0 4.75-4.75V10.25h-10.5Z"/></svg>
			<span className="drop-shadow">Burn</span>
		</button>
{/* Модальное окно для сжигания токенов */}
{showBurnModal && (
	<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(20, 0, 0, 0.75)', backdropFilter: 'blur(2px)'}}>
		<div className="relative animate-fade-in-up bg-gradient-to-br from-black/90 via-red-950 to-black/80 border-2 border-red-700 rounded-2xl p-8 shadow-2xl flex flex-col gap-5 min-w-[340px] max-w-[95vw] w-full max-w-md" style={{boxShadow:'0 8px 40px 0 #7f1d1dcc, 0 2px 0 #fff4 inset'}}>
			<button onClick={() => setShowBurnModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-red-300 text-2xl font-bold transition-colors">×</button>
					<div className="flex flex-col items-center gap-2">
										<label className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-gray-900/50 p-3 border border-gray-800 mb-2">
											<span className="text-gray-300">Use Game Wallet</span>
											<div className="relative">
												<input type="checkbox" className="peer sr-only" checked={useGameWallet} onChange={e => setUseGameWallet(e.target.checked)} disabled={burnLoading} />
												<div className="block h-6 w-10 rounded-full bg-gray-600 peer-checked:bg-red-600 transition-colors"></div>
												<div className="dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-full"></div>
											</div>
										</label>
				<div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-lg mb-2">
					<svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 2c.28 0 .53.15.66.39l3.5 6.06a.75.75 0 0 1-.66 1.11H8.5a.75.75 0 0 1-.66-1.11l3.5-6.06A.75.75 0 0 1 12 2Zm0 2.62L10.13 7.5h3.74L12 4.62ZM5.25 9.5A.75.75 0 0 1 6 8.75h12a.75.75 0 0 1 .75.75v7A6.25 6.25 0 0 1 12.5 22h-1A6.25 6.25 0 0 1 5.25 16.5v-7Zm1.5.75v6.25a4.75 4.75 0 0 0 4.75 4.75h1a4.75 4.75 0 0 0 4.75-4.75V10.25h-10.5Z"/></svg>
				</div>
				<h2 className="text-2xl font-extrabold text-red-200 mb-1 text-center drop-shadow">Burn tokens</h2>
				<div className="text-gray-300 text-center text-sm mb-2">Enter the amount of tokens you want to burn. This action is irreversible!</div>
			</div>
			<div className="relative mb-2">
				<input
					type="number"
					min="0"
					step="any"
					className="w-full p-3 rounded-lg bg-black/80 border-2 border-red-700 text-red-200 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-500 shadow-inner pr-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					placeholder="Amount to burn"
					value={burnAmount}
					onChange={e => setBurnAmount(e.target.value)}
					disabled={burnLoading}
				/>
				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
								<button
									className="px-2 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-200 rounded shadow border border-red-700 font-bold transition-all duration-150 disabled:opacity-60"
									disabled={burnLoading || !(useGameWallet ? gwBalance : userBalance)}
									onClick={() => {
										const bal = useGameWallet ? gwBalance : userBalance;
										if (bal) setBurnAmount((Number(bal) / 2e18).toFixed(6));
									}}
								>Half</button>
								<button
									className="px-2 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-200 rounded shadow border border-red-700 font-bold transition-all duration-150 disabled:opacity-60"
									disabled={burnLoading || !(useGameWallet ? gwBalance : userBalance)}
									onClick={() => {
										const bal = useGameWallet ? gwBalance : userBalance;
										if (bal) setBurnAmount((Number(bal) / 1e18).toFixed(6));
									}}
								>Max</button>
				</div>
			</div>
			<div className="flex gap-3 mt-2">
				<button
					className="flex-1 px-4 py-2 bg-gradient-to-r from-red-700 to-red-900 border-2 border-red-500 rounded-lg text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-60"
					onClick={handleBurn}
					disabled={burnLoading || !burnAmount || isNaN(Number(burnAmount)) || Number(burnAmount) <= 0}
				>
					{burnLoading ? 'Burning...' : 'Confirm'}
				</button>
				<button
					className="flex-1 px-4 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
					onClick={() => setShowBurnModal(false)}
					disabled={burnLoading}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
)}
						<h2 className="text-lg font-bold text-red-200 mb-0 text-center">My Statistics</h2>
						<div className="text-xs text-yellow-400 mb-1">Wallet</div>
						
						<div className="text-gray-300 mb-1 flex justify-between"><span>Clicks:</span> <span className="font-mono">{userClicks !== undefined ? Number(userClicks).toLocaleString() : '...'}</span></div>

						<div className="text-gray-300 mb-1 flex justify-between"><span>Blocks Won:</span> <span className="font-mono">{userWins !== undefined ? Number(userWins).toLocaleString() : '...'}</span></div>
						 <div className="text-gray-300 mb-1 flex justify-between text-green-400"><span>Balance:</span> <span className="font-mono text-green-400">{userBalance ? (Number(userBalance) / 1e18).toLocaleString() : '...'}C</span></div>
						 <div className="mt-2 border-t border-gray-700 pt-2">
							
							<div className="text-xs text-yellow-400 mb-1">Game Wallet</div>
							
							<div className="text-gray-300 mb-1 flex justify-between"><span>Clicks:</span> <span className="font-mono">{gwUserClicks !== undefined ? Number(gwUserClicks).toLocaleString() : '...'}</span></div>
							
							 <div className="text-gray-300 mb-1 flex justify-between"><span>Blocks Won:</span> <span className="font-mono">{gwUserWins !== undefined ? Number(gwUserWins).toLocaleString() : '...'}</span></div>
							 <div className="text-gray-300 mb-1 flex justify-between text-green-400"><span>Balance:</span> <span className="font-mono text-green-400">{gwBalance ? (Number(gwBalance) / 1e18).toLocaleString() : '...'}C</span></div>
						</div>
					</div>
					<div className="bg-black/60 border-2 border-yellow-700 rounded-xl p-2 flex flex-col justify-up shadow-lg">
						<h2 className="text-lg font-bold text-yellow-200 text-center">Info</h2>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Total Supply:</span>
							<span className="font-bold">{totalSupply ? (Number(totalSupply) / 1e18).toLocaleString() : '...'}</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Max Supply:</span>
							<span className="font-bold">{maxSupply ? (Number(maxSupply) / 1e18).toLocaleString() : '...'}</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Burn Supply:</span>
							<span className="font-bold">{maxSupply ? (66666666 - Number(maxSupply) / 1e18).toLocaleString() : '...'}</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Price:</span>
							<span className="font-bold">{price} S{priceUSD !== '...' ? ` / ${priceUSD} $` : ''}</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>TVL:</span>
							<span className="font-bold">{tvl} S{tvlUSD !== '...' ? ` / ${tvlUSD} $` : ''}</span>
						</div>
					</div>
				</div>
				{/* Proof Of Click */}
					<div className="bg-black/60 border-1 border-red-700 rounded-xl p-8 w-full md:basis-2/5 md:max-w-[40%] shadow-lg flex flex-col justify-start order-1">
						<div className="basis-[10%] min-w-[180px] flex-shrink-0 flex flex-col items-center">
						<div className="flex items-center justify-center rounded-lg  bg-black/1 p-1">
							<span
								className="text-5xl font-bold select-none"
								style={{    
									fontFamily: "'Creepster', cursive, sans-serif",
									textShadow: '3px 3px 0 rgba(131, 30, 4, 1), 6px 6px 0 rgba(22, 22, 20, 1)',
									letterSpacing: '12px',
									color: '#f01b1bff',
								}}
							>
								Click to hell
							</span>
						</div>
					</div>
					{/* Proof Of Click */}
					 <div className="flex flex-col items-center mb-6">
						 <button
							 className="w-[380px] h-[380px] rounded-full bg-gradient-to-br from-red-700 via-red-900 to-black border-4 border-red-800 shadow-2xl flex items-center justify-center text-6xl font-extrabold text-white hover:scale-105 active:scale-95 transition-all duration-150 select-none"
							 style={{ boxShadow: '0 0 80px 18px #7f1d1d88, 0 12px 48px #000a' }}
							 onClick={handleClick}
							 disabled={isClicking}
						 >
							 CLICK ME
						 </button>
							
						<div className="mt-8 w-full flex flex-col items-center">
							<div
								className="bg-black/70 border-2 border-yellow-700 rounded-xl p-2 shadow-lg flex flex-col gap-t w-full max-w-md cursor-pointer select-none"
								onClick={() => setShowDetails((v) => !v)}
							>
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Current Reward:</span><span className="font-bold">{currentReward ? (Number(currentReward) / 1e18).toLocaleString() : '...'}</span></div>
								
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Current Block (Round):</span><span className="font-bold">{roundId !== undefined ? Number(roundId).toLocaleString() : '...'}</span></div>
								
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Clicks in Round:</span><span className="font-bold">{playersInRound !== undefined ? Number(playersInRound).toLocaleString() : '...'}</span></div>
														
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Halving Interval:</span><span className="font-bold">{halvingInterval !== undefined ? Number(halvingInterval).toLocaleString() : '...'}</span></div>
														
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Last Halving Round:</span><span className="font-bold">{lastHalvingRound !== undefined ? Number(lastHalvingRound).toLocaleString() : '...'}</span></div>
														
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Next Halving Round:</span><span className="font-bold">{nextHalvingRound !== undefined ? Number(nextHalvingRound).toLocaleString() : '...'}</span></div>
														
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Total Clicks:</span><span className="font-bold">{totalClicks !== undefined ? Number(totalClicks).toLocaleString() : '...'}</span></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
