"use client";
import "../roulette/hide-scrollbar.css";

export default function ProofOfClickUI() {
	// Только оформление, без логики и хуков
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
								<div className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg border-2 shadow transition cursor-pointer bg-red-800 border-red-400 w-12 h-12 max-w-full">
									<span className="font-bold text-lg select-none">x0</span>
									<span className="text-xs font-mono select-none">LOSE</span>
								</div>
								<div className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg border-2 shadow transition cursor-pointer bg-green-700 border-green-400 w-12 h-12 max-w-full">
									<span className="font-bold text-lg select-none">x2.1</span>
									<span className="text-xs font-mono select-none">WIN</span>
								</div>
								<div className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg border-2 shadow transition cursor-pointer bg-red-800 border-red-400 w-12 h-12 max-w-full">
									<span className="font-bold text-lg select-none">x0</span>
									<span className="text-xs font-mono select-none">LOSE</span>
								</div>
								{/* ...ещё элементы... */}
							</div>
							<div className="text-gray-400 text-sm italic text-center mt-2">No new games</div>
						</div>
					</div>
				</div>
				{/* Referral System + Leaderboard — 1/5 экрана */}
				<div className="flex flex-col gap-4 basis-full md:basis-1/5 max-w-full md:max-w-[20%] mb-5 md:mb-0 h-[340px] order-2">
					<div className="bg-black/60 border-2 border-red-800 rounded-xl p-6 flex flex-col justify-between shadow-lg gap-0.5">
						<h2 className="text-lg font-bold text-red-200 mb-0 text-center">My Statistics</h2>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Blocks Won:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Clicks:</span> <span className="font-mono">0</span></div>
						<div className="text-gray-300 mb-1 flex justify-between"><span>Balance:</span> <span className="font-mono text-green-400">666C</span></div>
					</div>
					<div className="bg-black/60 border-2 border-yellow-700 rounded-xl p-6 flex flex-col justify-up shadow-lg">
						<h2 className="text-lg font-bold text-yellow-200 mb-4 text-center">Info</h2>
						<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Total Supply:</span>
									<span className="font-bold">123,456</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Max Supply:</span>
									<span className="font-bold">1,000,000</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Burn Supply:</span>
									<span className="font-bold">1,000,000</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Price:</span>
									<span className="font-bold">1,000,000</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>TVL C:</span>
									<span className="font-bold">1,000,000</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>TVL $:</span>
									<span className="font-bold">1,000,000</span>
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
						<div className="mt-8 w-full flex flex-col items-center">
							<div className="bg-black/70 border-2 border-yellow-700 rounded-xl px-6 py-4 shadow-lg flex flex-col gap-2 w-full max-w-md">
							<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Clicks:</span>
									<span className="font-bold">1,234</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Current Reward:</span>
									<span className="font-bold">0.05</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Current Block:</span>
									<span className="font-bold">8,888</span>
								</div>
								<div className="flex justify-between text-base text-yellow-200 font-mono">
									<span>Miners in Block:</span>
									<span className="font-bold">8,888</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
