
"use client";

import { useEffect, useState } from "react";
import { Wallet, HDNodeWallet, ethers } from "ethers";
import React from "react";
import { simulateContract, writeContract, waitForTransactionReceipt, readContract } from "@wagmi/core";
import { toast } from "react-hot-toast";
import { useChainId, useConfig, useReadContract, useAccount, useWatchContractEvent } from "wagmi";
import { chains, pocAbi } from "@/constants";
import "../roulette/hide-scrollbar.css";
import { useGameWalletContext } from "@/components/GameWalletContext";


export default function ProofOfClickUI() {
	// Game Wallet context
	const { useGameWallet, setUseGameWallet } = useGameWalletContext();
	// Для Game Wallet
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
		} catch { setGameWalletAddress(null); }
	}, [useGameWallet]);
	const { address } = useAccount();
		// Новые значения из ABI
	// Для totalUserClicks, totalUserReferrals, totalUserWins нужен адрес пользователя, можно добавить позже через useAccount
 // ...existing code...
 const [showDetails, setShowDetails] = React.useState(false);
 const chainId = useChainId();
 const config = useConfig();
 const pocAddress = chains[chainId]?.poc as `0x${string}`;
 // Live feed for WinnerMinted
 const [liveFeed, setLiveFeed] = useState<any[]>([]);

 // Загрузка всех прошлых WinnerMinted (универсальная функция)
 async function fetchPastWinners() {
	 if (!pocAddress) return;
	 try {
		 const { ethers } = await import("ethers");
		 const SONIC_RPC_URL = 'https://rpc.blaze.soniclabs.com';
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
			 // Мержим новые события с предыдущими по txHash (уникальность)
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

 // Загружать при монтировании
 useEffect(() => { fetchPastWinners(); }, [pocAddress]);
 const [refreshTrigger, setRefreshTrigger] = useState(0);
 const [pageClicks, setPageClicks] = useState(0);
 useWatchContractEvent({
	 address: pocAddress,
	 abi: pocAbi,
	 eventName: 'WinnerMinted',
	 onLogs(logs) {
		 for (const log of logs) {
			 const args = (log as any).args;
			 if (!args) continue;
									 // Получить timestamp блока для нового WinnerMinted
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
 // Статистика и балансы (без queryKey)
const [gwUserClicks, setGwUserClicks] = useState<number|null>(null);
const [gwUserWins, setGwUserWins] = useState<number|null>(null);
const [userBalance, setUserBalance] = useState<number|null>(null);
const [gwBalance, setGwBalance] = useState<number|null>(null);
const [totalClicks, setTotalClicks] = useState<number|null>(null);
const [userClicks, setUserClicks] = useState<number|null>(null);
const [userWins, setUserWins] = useState<number|null>(null);
const [totalSupply, setTotalSupply] = useState<number|null>(null);
const [maxSupply, setMaxSupply] = useState<number|null>(null);

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
 // Для Burn Supply, Price, TVL C, TVL $ — если нет прямых методов, оставить "..." или добавить позже

	 // Основные значения
	 const { data: currentReward } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "currentReward", query: { enabled: !!pocAddress } });
	 const { data: roundId, refetch: refetchRoundId } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "roundId", query: { enabled: !!pocAddress } });
	 const { data: playersInRound, refetch: refetchPlayersInRound } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "playerCount", args: [roundId ?? 0], query: { enabled: !!pocAddress && roundId !== undefined } });

	 // Детальные значения для раскрывающегося меню
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
	// Очередь для Game Wallet транзакций
	const [gwTxQueue, setGwTxQueue] = useState<any[]>([]);
	const gwTxQueueRef = React.useRef<any[]>([]);
	const gwTxProcessing = React.useRef(false);

	// Синхронизируем ref с состоянием очереди
	useEffect(() => { gwTxQueueRef.current = gwTxQueue; }, [gwTxQueue]);

		// Функция для обработки очереди Game Wallet (обрабатывает всю очередь подряд)
		async function processGwTxQueue() {
			if (gwTxProcessing.current) return;
			gwTxProcessing.current = true;
			try {
				while (gwTxQueueRef.current.length > 0) {
					const next = gwTxQueueRef.current[0];
					const toastId = toast.loading('Processing click...');
					try {
						const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem('gameWalletSessionKey') : null;
						if (!sessionKey) throw new Error('Game Wallet не разблокирован');
						const SONIC_RPC_URL = 'https://rpc.blaze.soniclabs.com';
						const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);
						const wallet = new Wallet(sessionKey, provider);
						const contract = new ethers.Contract(pocAddress, pocAbi, wallet);
						await contract._click({ value: ethers.parseEther('0.01') });
						toast.success('Click sent (Game Wallet)', { id: toastId });
					} catch {
						toast.error('Click failed', { id: toastId });
					}
					// Сразу обновляем статистику и ленту
					fetchStats();
					fetchPastWinners();
					refetchRoundId();
					refetchPlayersInRound();
					setPageClicks(c => c + 1);
					// Удаляем обработанную транзакцию
					gwTxQueueRef.current = gwTxQueueRef.current.slice(1);
					setGwTxQueue(gwTxQueueRef.current);
				}
			} finally {
				gwTxProcessing.current = false;
			}
		}

		useEffect(() => {
			if (useGameWallet && gwTxQueue.length > 0 && !gwTxProcessing.current) {
				processGwTxQueue();
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [gwTxQueue, useGameWallet]);

		async function handleClick() {
			if (!pocAddress || !config) return;
			setIsClicking(true);
			if (useGameWallet) {
				// Добавляем в очередь, обработка очереди асинхронная
				setGwTxQueue(q => [...q, { ts: Date.now() }]);
				setIsClicking(false);
				return;
			}
			const toastId = toast.loading('Processing click...');
			try {
				// Обычный кошелек через wagmi
				await simulateContract(config, {
					abi: pocAbi,
					address: pocAddress,
					functionName: '_click',
					value: BigInt(0.01 * 1e18),
				})
				.then(simulation => writeContract(config, {
					...simulation.request,
					value: BigInt(0.01 * 1e18),
				}));
				toast.success('Click sent', { id: toastId });
				// Сразу обновляем статистику и ленту
				fetchStats();
				fetchPastWinners();
				refetchRoundId();
				refetchPlayersInRound();
				setPageClicks(c => c + 1);
			} catch (error) {
				toast.error('Click failed', { id: toastId });
			} finally {
				setIsClicking(false);
			}
		}
	// ...existing code...
	return (
		<div key={refreshTrigger} className="min-h-screen bg-gradient-to-b from-red-950 to-black flex flex-col items-center justify-start pt-4">
			{/* Переключатель Game Wallet */}
			<div className="flex flex-col md:flex-row gap-5 w-full justify-center items-stretch">
				{/* Live Feed — 1/5 экрана */}
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
												<a href={`https://ftmscan.com/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline truncate max-w-[120px]">{item.txHash?.slice(0, 8)}...{item.txHash?.slice(-6)}</a>
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
					<div className="bg-black/60 border-2 border-red-800 rounded-xl p-6 flex flex-col justify-between shadow-lg gap-0.5">
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
					<div className="bg-black/60 border-2 border-yellow-700 rounded-xl p-6 flex flex-col justify-up shadow-lg">
						<h2 className="text-lg font-bold text-yellow-200 mb-4 text-center">Info</h2>
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
							<span className="font-bold">...</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>TVL C:</span>
							<span className="font-bold">...</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>TVL $:</span>
							<span className="font-bold">...</span>
						</div>
						
					</div>
					<div className="w-half max-w-4xl mb-8">
						<div className="bg-black/60 border-2 border-yellow-700 rounded-xl p-6 flex flex-col gap-2" style={{ minWidth: '350px', maxWidth: '700px', width: '100%' }}>
							<h3 className="text-yellow-300 text-lg font-bold mb-1 text-center">Referral System</h3>
							<div className="flex flex-col md:flex-row gap-2 items-center justify-center">
								<input type="text" maxLength={32} className="text-center bg-black/80 border border-gray-700 text-gray-100 rounded-lg py-1 text-base font-mono focus:outline-none" style={{ width: '520px', paddingLeft: 0, paddingRight: 0, fontFamily: 'monospace' }} placeholder="Enter referral code" disabled value="" />
							</div>
							<button className="px-4 py-1.5 bg-gradient-to-r from-green-700 to-green-900 border border-green-500 rounded-lg text-xs text-white font-bold shadow transition-all duration-150 disabled:opacity-60" disabled>Apply</button>
							<button className="px-4 py-1.5 bg-gradient-to-r from-yellow-700 to-yellow-900 border border-yellow-500 rounded-lg text-xs text-white font-bold shadow transition-all duration-150 disabled:opacity-60" disabled>Create</button>
							<div className="text-gray-300 text-sm mt-0">Your referrer: <span className="font-mono text-yellow-200">---</span></div>
							<div className="text-gray-300 text-sm mt-0">Referrals: <span className="font-mono text-yellow-200">0</span></div>
						</div>
						
					</div>
				</div>
				{/* Proof Of Click — 2/5 экрана */}
				<div className="bg-black/60 border-1 border-red-700 rounded-xl p-8 w-full md:basis-2/5 md:max-w-[40%] shadow-lg flex flex-col justify-start order-1">
					<h1 className="text-4xl font-bold text-red-100 mb-8 text-center" style={{ textShadow: '2px 2px 4px rgba(220, 38, 38, 0.8)' }}>Proof Of Click</h1>
					{/* Кнопка для Proof Of Click */}
					 <div className="flex flex-col items-center mb-6">
						 <button
							 className="w-[380px] h-[380px] rounded-full bg-gradient-to-br from-red-700 via-red-900 to-black border-4 border-red-800 shadow-2xl flex items-center justify-center text-6xl font-extrabold text-white hover:scale-105 active:scale-95 transition-all duration-150 select-none"
							 style={{ boxShadow: '0 0 80px 18px #7f1d1d88, 0 12px 48px #000a' }}
							 onClick={handleClick}
							 disabled={isClicking}
						 >
							 CLICK ME
						 </button>
						 <div className="text-gray-400 text-sm mt-4">Click the button to play</div>
							
						{/* Информация о наградах и блоках */}
						{/* Краткая инфа + раскрывающееся меню */}
						{/* eslint-disable-next-line react-hooks/rules-of-hooks */}
						<div className="mt-8 w-full flex flex-col items-center">
							<div
								className="bg-black/70 border-2 border-yellow-700 rounded-xl px-6 py-4 shadow-lg flex flex-col gap-2 w-full max-w-md cursor-pointer select-none"
								onClick={() => setShowDetails((v) => !v)}
							>
																								<div className="flex justify-between text-base text-yellow-200 font-mono">
																									<span>Ожидает отправки:</span>
																									<span className="font-bold">{useGameWallet ? gwTxQueue.length : 0}</span>
																								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Current Reward:</span><span className="font-bold">{currentReward ? (Number(currentReward) / 1e18).toLocaleString() : '...'}</span></div>
								
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Current Block (Round):</span><span className="font-bold">{roundId !== undefined ? Number(roundId).toLocaleString() : '...'}</span></div>
								
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Clicks in Round:</span><span className="font-bold">{playersInRound !== undefined ? Number(playersInRound).toLocaleString() : '...'}</span></div>
								
								<div className="text-xs text-yellow-300 text-center mt-2">{showDetails ? "Скрыть детали ▲" : "Показать детали ▼"}</div>
																			{showDetails && (
																				<div className="mt-3 flex flex-col gap-2 animate-fade-in">
														
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Halving Interval:</span><span className="font-bold">{halvingInterval !== undefined ? Number(halvingInterval).toLocaleString() : '...'}</span></div>
														
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Last Halving Round:</span><span className="font-bold">{lastHalvingRound !== undefined ? Number(lastHalvingRound).toLocaleString() : '...'}</span></div>
														
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Next Halving Round:</span><span className="font-bold">{nextHalvingRound !== undefined ? Number(nextHalvingRound).toLocaleString() : '...'}</span></div>
														
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Total Clicks:</span><span className="font-bold">{totalClicks !== undefined ? Number(totalClicks).toLocaleString() : '...'}</span></div>
													</div>
												)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
