"use client";
import "../roulette/hide-scrollbar.css";

export default function ProofOfClickUI() {
	// Только оформление, без логики и хуков
	return (
		<div className="min-h-screen bg-gradient-to-b from-red-950 to-black flex flex-col items-center justify-start pt-4">
			{/* Live Feed */}
			<div className="w-full mb-8">
				<div className="bg-black/70 border-2 border-red-800 rounded-xl p-2 shadow-lg w-full">
					<h2 className="text-lg font-bold text-red-200 mb-2 text-center">Live</h2>
					<div className="bg-black/70 border-2 border-red-800 rounded-xl p-2 shadow-lg">
						<div className="text-gray-400 text-sm italic text-center">No new games</div>
					</div>
				</div>
			</div>
			<div className="flex flex-col md:flex-row gap-5 w-full justify-center items-stretch">
				{/* Stats */}
				<div className="flex flex-col gap-4 max-w-xs w-full mb-5 md:mb-0 h-[340px]">
					<div className="bg-black/60 border-2 border-red-800 rounded-xl p-6 flex flex-col justify-between shadow-lg">
						<h2 className="text-lg font-bold text-red-200 mb-2 text-center">My Statistics</h2>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Games Played:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Games Won:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Amount Spent:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Amount Won:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>ROI:</span> <span className="font-mono">0%</span></div>
					</div>
					<div className="bg-black/60 border-2 border-yellow-800 rounded-xl p-6 flex flex-col justify-up shadow-lg">
						<h2 className="text-lg font-bold text-yellow-200 mb-2 text-center">Global Statistics</h2>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Games Played:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Games Won:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Games Lost:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Total Bets:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Total Payout:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>ROI:</span> <span className="font-mono">0%</span></div>
					</div>
				</div>
				{/* Game Window */}
				<div className="bg-black/60 border-1 border-red-700 rounded-xl p-8 w-full max-w-md shadow-lg flex flex-col justify-start">
					<h1 className="text-4xl font-bold text-red-100 mb-8 text-center" style={{ textShadow: '2px 2px 4px rgba(220, 38, 38, 0.8)' }}>Proof Of Click</h1>
					{/* Кнопка для Proof Of Click */}
					<div className="flex flex-col items-center mb-6">
						<button
							className="w-64 h-64 rounded-full bg-gradient-to-br from-red-700 via-red-900 to-black border-4 border-red-800 shadow-2xl flex items-center justify-center text-4xl font-extrabold text-white hover:scale-105 active:scale-95 transition-all duration-150 select-none"
							style={{ boxShadow: '0 0 60px 10px #7f1d1d88, 0 8px 32px #000a' }}
							disabled
						>
							CLICK ME
						</button>
						<div className="text-gray-400 text-sm mt-4">Click the button to play</div>
					</div>
				</div>
				{/* Bet controls (заглушка) */}
				<div className="w-full max-w-xs md:ml-0 md:mt-0 mt-0 flex flex-col justify-start h-[340px]"> 
					<div className="bg-black/70 border-2 border-red-800 rounded-xl p-3 shadow-lg flex flex-col gap-2 mb-4 justify-between" style={{ minWidth: '350px', maxWidth: '700px', width: '100%' }}>
						<div className="text-gray-300 text-base mb-0.5">Count of click: <span className="font-bold text-green-400">83.33%</span></div>
						<div className="text-gray-300 text-base">Coefficient: <span className="font-bold text-red-400">x1.14</span></div>
						<div className="text-gray-300 text-base mt-0.5">Possible winnings: <span className="font-bold text-green-400">1.09</span></div>
						<div className="flex flex-col gap-1 mt-2">
							<div className="flex items-center gap-1 justify-center">
								<div className="flex items-center w-full bg-gradient-to-r from-black to-red-900 border border-red-700 rounded-xl px-1 py-1 shadow-inner">
									<input type="number" className="w-full text-center bg-black/60 border-none text-red-100 rounded-l-xl px-2 py-1 text-base font-mono focus:outline-none appearance-none no-arrows" placeholder="Enter bet amount" value={1} min={1} step={0.1} disabled />
									<div className="flex gap-1 ml-1">
										<button type="button" className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-black to-red-900 border border-red-700 rounded-full text-base text-red-100 transition-all duration-150 shadow" style={{zIndex:2}} disabled>-</button>
										<button type="button" className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-black to-red-900 border border-red-700 rounded-full text-base text-red-100 transition-all duration-150 shadow" style={{zIndex:2}} disabled>+</button>
										<button type="button" className="px-2 py-1 text-xs bg-red-900/70 text-red-200 rounded ml-1 font-bold border border-red-700 shadow" style={{zIndex:2}} disabled>½</button>
										<button type="button" className="px-2 py-1 text-xs bg-red-900/70 text-red-200 rounded font-bold border border-red-700 shadow" style={{zIndex:2}} disabled>MAX</button>
									</div>
								</div>
							</div>
							<button className="w-full px-4 py-2 bg-gradient-to-r from-red-900 to-black border border-red-700 text-red-200 rounded-lg font-bold tracking-tight text-base mb-1 disabled:opacity-60" disabled>
								Start
							</button>
						</div>
					</div>
					{/* Referral system UI (заглушка) */}
					<div className="w-half max-w-4xl mb-8">
						<div className="bg-black/60 border-2 border-yellow-700 rounded-xl p-6 flex flex-col gap-2" style={{ minWidth: '350px', maxWidth: '700px', width: '100%' }}>
							<h3 className="text-yellow-300 text-lg font-bold mb-1 text-center">Referral System</h3>
							<div className="flex flex-col md:flex-row gap-2 items-center justify-center">
								<input type="text" maxLength={32} className="text-center bg-black/80 border border-gray-700 text-gray-100 rounded-lg py-1 text-base font-mono focus:outline-none" style={{ width: '520px', paddingLeft: 0, paddingRight: 0, fontFamily: 'monospace' }} placeholder="Enter referral code" disabled value="" />
							</div>
							<button className="px-4 py-1.5 bg-gradient-to-r from-green-700 to-green-900 border border-green-500 rounded-lg text-xs text-white font-bold shadow transition-all duration-150 disabled:opacity-60" disabled>Apply</button>
							<button className="px-4 py-1.5 bg-gradient-to-r from-yellow-700 to-yellow-900 border border-yellow-500 rounded-lg text-xs text-white font-bold shadow transition-all duration-150 disabled:opacity-60" disabled>Create</button>
							<div className="text-xs text-gray-400 font-mono break-all mt-2">Bytes32: </div>
							<div className="text-gray-300 text-sm mt-0">Your referrer: <span className="font-mono text-yellow-200">---</span></div>
							<div className="text-gray-300 text-sm mt-0">Referrals: <span className="font-mono text-yellow-200">0</span></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
