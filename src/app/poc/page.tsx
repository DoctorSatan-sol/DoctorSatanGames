
"use client";
import React from "react";
import { useChainId, useConfig, useReadContract } from "wagmi";
import { chains, pocAbi } from "@/constants";
import "../roulette/hide-scrollbar.css";

export default function ProofOfClickUI() {
 // ...existing code...
 const [showDetails, setShowDetails] = React.useState(false);
 const chainId = useChainId();
 const config = useConfig();
 const pocAddress = chains[chainId]?.poc as `0x${string}`;
 const { data: totalSupply } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "totalSupply", query: { enabled: !!pocAddress } });
 const { data: maxSupply } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "maxSupply", query: { enabled: !!pocAddress } });
 // Для Burn Supply, Price, TVL C, TVL $ — если нет прямых методов, оставить "..." или добавить позже

	 // Основные значения
	 const { data: currentReward } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "currentReward", query: { enabled: !!pocAddress } });
	 const { data: roundId } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "roundId", query: { enabled: !!pocAddress } });
	 const { data: playersInRound } = useReadContract({ abi: pocAbi, address: pocAddress, functionName: "playerCount", args: [roundId ?? 0], query: { enabled: !!pocAddress && roundId !== undefined } });

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
	return (
		<div className="min-h-screen bg-gradient-to-b from-red-950 to-black flex flex-col items-center justify-start pt-4">
			<div className="flex flex-col md:flex-row gap-5 w-full justify-center items-stretch">
				{/* Live Feed — 1/5 экрана */}
				<div className="flex flex-col basis-full md:basis-1/5 max-w-full md:max-w-[20%] mb-5 md:mb-0 md:mr-2">
					<div className="bg-black/70 border-2 border-red-800 rounded-xl p-2 shadow-lg w-full flex flex-col items-center">
						<h2 className="text-lg font-bold text-red-200 mb-2 text-center">Live</h2>
						<div className="bg-black/70 border-2 border-red-800 rounded-xl p-2 shadow-lg w-full flex flex-col gap-2 items-center min-h-[700px]">
							{/* Пример вертикальных элементов live-ленты */}
							<div className="flex flex-col items-center gap-1 w-full">
							<div className="flex flex-col items-center gap-3 w-full">
								{/* Пример 3D прямоугольника live-ленты */}
								<div className="w-full bg-gradient-to-br from-red-900 via-black to-red-800 border-2 border-red-400 rounded-xl shadow-2xl p-4 flex flex-col gap-2 transform hover:scale-105 transition-all duration-150" style={{boxShadow:'0 6px 24px 0 #7f1d1d99, 0 1.5px 0 #fff4 inset'}}>
									<div className="flex justify-between items-center text-yellow-200 font-mono text-sm">
										<span>Block #8888</span>
										<span>Miners: <span className="font-bold">12</span></span>
									</div>
									<div className="flex justify-between items-center text-white font-mono text-xs">
										<span>Winner:</span>
										<span className="truncate max-w-[120px] text-green-300">0xA5H2...C377</span>
									</div>
									<div className="flex justify-between items-center text-white font-mono text-xs">
										<span>Win Chance:</span>
										<span className="font-bold text-blue-300">22.8%</span>
									</div>
								</div>
								<div className="w-full bg-gradient-to-br from-red-900 via-black to-red-800 border-2 border-red-400 rounded-xl shadow-2xl p-4 flex flex-col gap-2 transform hover:scale-105 transition-all duration-150" style={{boxShadow:'0 6px 24px 0 #7f1d1d99, 0 1.5px 0 #fff4 inset'}}>
									<div className="flex justify-between items-center text-yellow-200 font-mono text-sm">
										<span>Block #8887</span>
										<span>Miners: <span className="font-bold">52</span></span>
									</div>
									<div className="flex justify-between items-center text-white font-mono text-xs">
										<span>Winner:</span>
										<span className="truncate max-w-[120px] text-green-300">0xA1b2...C3d4</span>
									</div>
									<div className="flex justify-between items-center text-white font-mono text-xs">
										<span>Win Chance:</span>
										<span className="font-bold text-blue-300">18.2%</span>
									</div>
								</div>
								{/* ...ещё элементы... */}
							</div>
							</div>
							<div className="text-gray-400 text-sm italic text-center mt-2">No new games</div>
						</div>
					</div>
				</div>
				{/* Referral System + Leaderboard — 1/5 экрана */}
				<div className="flex flex-col gap-4 basis-full md:basis-1/5 max-w-full md:max-w-[20%] mb-5 md:mb-0 h-[340px] order-2">
					<div className="bg-black/60 border-2 border-red-800 rounded-xl p-6 flex flex-col justify-between shadow-lg gap-0.5">
						<h2 className="text-lg font-bold text-red-200 mb-0 text-center">My Statistics</h2>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Clicks:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Blocks Won:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between text-green-400"><span>Balance:</span> <span className="font-mono text-green-400">666C</span></div>
					</div>
					<div className="bg-black/60 border-2 border-yellow-700 rounded-xl p-6 flex flex-col justify-up shadow-lg">
						<h2 className="text-lg font-bold text-yellow-200 mb-4 text-center">Info</h2>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Total Supply:</span>
							<span className="font-bold">{totalSupply ? Number(totalSupply) / 1e18 : '...'}</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Max Supply:</span>
							<span className="font-bold">{maxSupply ? Number(maxSupply) / 1e18 : '...'}</span>
						</div>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
							<span>Burn Supply:</span>
							<span className="font-bold">...</span>
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
							disabled
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
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Current Reward:</span><span className="font-bold">{currentReward ? Number(currentReward) / 1e18 : '...'}</span></div>
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Current Block (Round):</span><span className="font-bold">{roundId?.toString() ?? '...'}</span></div>
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Players in Round:</span><span className="font-bold">{playersInRound?.toString() ?? '...'}</span></div>
								<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Clicks in round:</span><span className="font-bold">12</span></div>
								<div className="text-xs text-yellow-300 text-center mt-2">{showDetails ? "Скрыть детали ▲" : "Показать детали ▼"}</div>
												{showDetails && (
													<div className="mt-3 flex flex-col gap-2 animate-fade-in">
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Token Name:</span><span className="font-bold">{typeof tokenName === 'string' ? tokenName : '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Symbol:</span><span className="font-bold">{typeof symbol === 'string' ? symbol : '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Initial Reward:</span><span className="font-bold">{initialReward ? Number(initialReward) / 1e18 : '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Fee:</span><span className="font-bold">{fee ? Number(fee) / 1e18 : '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Halving Interval:</span><span className="font-bold">{halvingInterval?.toString() ?? '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Last Halving Round:</span><span className="font-bold">{lastHalvingRound?.toString() ?? '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Next Halving Round:</span><span className="font-bold">{nextHalvingRound?.toString() ?? '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Round Duration:</span><span className="font-bold">{roundDuration?.toString() ?? '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Last Round Timestamp:</span><span className="font-bold">{lastRoundTs?.toString() ?? '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Liquidity Share:</span><span className="font-bold">{liquidityShare?.toString() ?? '...'}</span></div>
														<div className="flex justify-between text-base text-yellow-200 font-mono"><span>Liquidity Vault:</span><span className="font-bold">{typeof liquidityVault === 'string' ? liquidityVault : liquidityVault?.toString() ?? '...'}</span></div>
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
