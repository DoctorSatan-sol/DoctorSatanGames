"use client";
import React, { useState } from "react";
import "../roulette/hide-scrollbar.css";

export default function BlackjackDiceUI() {
	// Game state
	 const [playerScore, setPlayerScore] = useState<number>(0);
	 const [dealerScore, setDealerScore] = useState<number>(0);
	 const [dice, setDice] = useState<number[]>([]);
	 const [dealerDice, setDealerDice] = useState<number[]>([]);
	 const [gameState, setGameState] = useState<'idle'|'lobby'|'betting'|'playing'|'finished'>('idle');
	 const [message, setMessage] = useState<string>("");
	 const [bet, setBet] = useState<number>(0);
	 type LogEntry = { text: string; type: string };
	 const [log, setLog] = useState<LogEntry[]>([]);
	 const [activeLobby, setActiveLobby] = useState<number|null>(null);

	// Statistics
	 const [personalStats, setPersonalStats] = useState({ games: 0, wins: 0, bets: 0 });
	 const [globalStats, setGlobalStats] = useState({ games: 0, bets: 0 });

	// Dice: roll (2-6)
	function rollDie() {
		return Math.floor(Math.random() * 5) + 2;
	}

	 function enterLobby(id: number) {
		 setActiveLobby(id);
		 setGameState('playing');
		 setLog([{ text: `Entered lobby #${id}`, type: 'lobby' }]);
		 setPlayerScore(0);
		 setDealerScore(0);
		 setDice([]);
		 setDealerDice([]);
		 setMessage('');
	 }

	 function startGame() {
		 setPlayerScore(0);
		 setDealerScore(0);
		 setDice([]);
		 setDealerDice([]);
		 setBet(0);
		 setGameState('betting');
		 setMessage('');
		 setLog([]);
		 setActiveLobby(null);
	// Update statistics on game start
		 setPersonalStats(prev => ({ ...prev, games: prev.games + 1, bets: prev.bets + bet }));
		 setGlobalStats(prev => ({ ...prev, games: prev.games + 1, bets: prev.bets + bet }));
	 }

	 function placeBet(amount: number) {
		 setBet(amount);
		 setGameState('playing');
		 setLog(prev => [...prev, { text: `Bet: ${amount}`, type: 'bet' }]);
	// Update bet statistics
		 setPersonalStats(prev => ({ ...prev, bets: prev.bets + amount }));
		 setGlobalStats(prev => ({ ...prev, bets: prev.bets + amount }));
	 }

	 function playerHit() {
		 if (gameState !== 'playing') return;
		 const die = rollDie();
		 const newScore = playerScore + die;
		 setDice(prev => [...prev, die]);
		 setPlayerScore(newScore);
		 setLog(prev => [...prev, { text: `Player 1 rolled: ${die} (total: ${newScore})`, type: 'p1' }]);
		 if (newScore > 21) {
			 setGameState('finished');
			 setMessage('Bust! Player 2 wins.');
			 setLog(prev => [...prev, { text: 'Player 2 wins!', type: 'win2' }]);
		 }
	 }

	 function playerStand() {
		 if (gameState !== 'playing') return;
		 let score = dealerScore;
		 let rolls: number[] = [];
		 let dealerLog: LogEntry[] = [];
		 while (score < 17) {
			 const die = rollDie();
			 rolls.push(die);
			 score += die;
			 dealerLog.push({ text: `Player 2 rolled: ${die} (total: ${score})`, type: 'p2' });
		 }
		 setDealerDice(rolls);
		 setDealerScore(score);
		 let resultMsg = '';
		 let win = false;
		 if (score > 21) {
			 resultMsg = 'Player 2 bust! Player 1 wins.';
			 setLog(prev => [...prev, ...dealerLog, { text: 'Player 1 wins!', type: 'win1' }]);
			 win = true;
		 } else if (score >= playerScore) {
			 resultMsg = 'Player 2 wins.';
			 setLog(prev => [...prev, ...dealerLog, { text: 'Player 2 wins!', type: 'win2' }]);
		 } else {
			 resultMsg = 'Player 1 wins!';
			 setLog(prev => [...prev, ...dealerLog, { text: 'Player 1 wins!', type: 'win1' }]);
			 win = true;
		 }
		 setGameState('finished');
		 setMessage(resultMsg);
	// Update personal win statistics
		 if (win) {
			 setPersonalStats(prev => ({ ...prev, wins: prev.wins + 1 }));
		 }
	 }

	 function reshance() {
		 setGameState('playing');
		 setPlayerScore(0);
		 setDealerScore(0);
		 setDice([]);
		 setDealerDice([]);
		 setMessage('');
		 setLog(prev => [...prev, { text: 'Rematch! Playing again with the same bet.', type: 'reshance' }]);
	 }

		// Пример лобби (можно заменить на реальные данные)
			 const lobbies = [
				 { id: 101, name: "Black Jack Dice #101", players: 2, status: "Playing", bet: 50 },
				 { id: 202, name: "Black Jack Dice #202", players: 1, status: "Waiting", bet: 100 },
			 ];

			return (
				<div className="min-h-screen bg-gradient-to-b from-red-950 to-black flex flex-row items-start justify-center pt-4">
					<div className="flex flex-row w-full h-full">
						{/* Lobby */}
						<div className="flex flex-col gap-4 w-1/4 p-4">
							<div className="bg-black/70 border-2 border-red-800 rounded-xl shadow-lg p-4 flex flex-col items-center h-full">
								<h2 className="text-lg font-bold text-red-200 mb-2 text-center">Game Lobbies</h2>
								<div className="flex flex-col gap-3 w-full">
									{lobbies.map(lobby => (
										<div key={lobby.id} className="w-full bg-gradient-to-br from-red-900 via-black to-red-800 border-2 border-red-400 rounded-xl shadow p-3 flex flex-col gap-1 hover:scale-[1.03] transition-all duration-150">
											<div className="flex justify-between items-center">
												<span className="font-bold text-yellow-200">{lobby.name}</span>
												<span className="text-xs text-gray-400">{lobby.status}</span>
											</div>
											 <div className="flex justify-between items-center text-sm text-gray-300">
													<span>ID: {lobby.id}</span>
													<span>Bet: <span className="text-yellow-400 font-bold">{lobby.bet}</span></span>
													<span>Players: {lobby.players}</span>
											 </div>
											 {lobby.status === "Waiting" && (
													<button
															className="mt-2 px-4 py-1 bg-gradient-to-br from-yellow-600 via-red-700 to-black border border-yellow-400 rounded-xl text-white font-bold shadow hover:scale-105 active:scale-95 transition-all duration-150"
															onClick={() => enterLobby(lobby.id)}
													>Join</button>
											 )}
										</div>
									))}
								</div>
							</div>
						</div>
						{/* Event Log */}
						<div className="flex flex-col gap-4 w-1/4 p-4">
							<div className="bg-black/70 border-2 border-yellow-700 rounded-xl shadow-lg p-4 flex flex-col items-center h-full">
								<h2 className="text-lg font-bold text-yellow-200 mb-2 text-center">Event Log</h2>
								<div className="w-full max-h-[320px] overflow-y-auto text-sm font-mono">
									{log.length === 0 ? <span className="text-gray-500">No events</span> : log.map((entry, i) => {
										let color = 'text-gray-200';
										if (entry.type === 'p1') color = 'text-blue-400';
										if (entry.type === 'p2') color = 'text-red-400';
										if (entry.type === 'win1') color = 'text-green-400 font-bold';
										if (entry.type === 'win2') color = 'text-pink-400 font-bold';
										if (entry.type === 'bet') color = 'text-yellow-300';
										if (entry.type === 'reshance') color = 'text-purple-400';
										if (entry.type === 'lobby') color = 'text-gray-400';
										return (<div key={i} className={`mb-1 ${color}`}>{entry.text}</div>);
									})}
								</div>
							</div>
						</div>
						{/* Game Window */}
						<div className="flex flex-col items-center w-2/4 p-4">
							<div className="bg-black/70 border-2 border-red-800 rounded-xl shadow-lg p-6 flex flex-col items-center w-full h-full">
								<div className="flex items-center justify-center rounded-lg bg-black/1 p-1 mb-6">
									<span
										className="text-5xl font-bold select-none"
										style={{
											fontFamily: "'Creepster', cursive, sans-serif",
											textShadow: '3px 3px 0 rgba(131, 30, 4, 1), 6px 6px 0 rgba(22, 22, 20, 1)',
											letterSpacing: '12px',
											color: '#f01b1bff',
										}}
									>
										Black Jack Dice
									</span>
								</div>
								{/* If not in lobby — lobby creation settings */}
								{activeLobby === null ? (
									<div className="bg-black/70 border-2 border-yellow-700 rounded-xl shadow-lg p-6 flex flex-col items-center w-full mb-6">
										<h2 className="text-xl font-bold text-yellow-200 mb-4">Create Lobby</h2>
										<div className="flex gap-2 items-center mb-4">
											<input
												type="number"
												min="1"
												step="1"
												className="px-3 py-2 rounded-lg bg-black/80 border-2 border-yellow-700 text-yellow-200 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-gray-500 shadow-inner w-32"
												placeholder="Bet"
												value={bet > 0 ? bet : ''}
												onChange={e => setBet(Number(e.target.value))}
											/>
											<button
												className="px-4 py-2 bg-gradient-to-br from-yellow-600 via-red-700 to-black border-2 border-yellow-400 rounded-xl text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
												disabled={bet <= 0}
																onClick={() => {
																	// Simulate lobby creation
																	setActiveLobby(999);
																	setGameState('playing');
																	setLog(prev => [...prev, { text: `Created lobby #999 with bet ${bet}`, type: 'lobby' }]);
																}}
											>Create Lobby</button>
										</div>
									</div>
								) : (
									<div className="bg-black/70 border-2 border-red-800 rounded-xl shadow-lg p-6 flex flex-col items-center w-full">
										<div className="text-xl text-red-200 font-bold mb-2">Your score: <span className="text-yellow-300">{playerScore}</span></div>
										<div className="flex gap-2 mb-4">
											{dice.map((d, i) => (
												<div
													key={i}
													className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-red-700 via-black to-red-900 border-2 border-red-400 rounded-xl text-2xl text-white font-bold shadow-lg animate-dice"
													style={{
														animation: `dice-pop 0.5s`,
														animationFillMode: 'backwards',
														animationDelay: `${i * 0.1}s`,
													}}
												>
													{d}
												</div>
											))}
					{/* Dealer dice animation */}
					<div className="flex gap-2 mb-4">
						{dealerDice.map((d, i) => (
							<div
								key={i}
								className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-gray-700 via-black to-gray-900 border-2 border-gray-400 rounded-xl text-2xl text-white font-bold shadow-lg animate-dice"
								style={{
									animation: `dice-pop 0.5s`,
									animationFillMode: 'backwards',
									animationDelay: `${i * 0.1}s`,
								}}
							>
								{d}
							</div>
						))}
					</div>
		{/* CSS for dice animation */}
		<style jsx>{`
			@keyframes dice-pop {
				0% {
					opacity: 0;
					transform: scale(0.5) rotate(-10deg);
				}
				60% {
					opacity: 1;
					transform: scale(1.1) rotate(5deg);
				}
				100% {
					opacity: 1;
					transform: scale(1) rotate(0deg);
				}
			}
			.animate-dice {
				animation-name: dice-pop;
			}
		`}</style>
										</div>
										<div className="text-lg text-gray-300 mb-2">Player 2: <span className="text-yellow-200">{gameState === 'finished' ? dealerScore : '?'}</span></div>
										{message && <div className="text-red-400 font-bold mb-2">{message}</div>}
										<div className="flex gap-4 mt-4">
											{gameState === 'idle' && (
												<button
													className="px-6 py-3 bg-gradient-to-br from-red-700 via-red-900 to-black border-2 border-red-800 rounded-xl text-white font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
													onClick={startGame}
												>Start Game</button>
											)}
											{/* ...bet removed inside lobby... */}
											{gameState === 'playing' && (
												<>
													<button
														className="px-6 py-3 bg-gradient-to-br from-yellow-600 via-red-700 to-black border-2 border-yellow-400 rounded-xl text-white font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
														onClick={playerHit}
													>Hit</button>
													<button
														className="px-6 py-3 bg-gradient-to-br from-gray-700 via-black to-red-900 border-2 border-gray-400 rounded-xl text-white font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
														onClick={playerStand}
													>Stand</button>
												</>
											)}
											{gameState === 'finished' && (
												<>
													<button
														className="px-6 py-3 bg-gradient-to-br from-red-700 via-red-900 to-black border-2 border-red-800 rounded-xl text-white font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
														onClick={startGame}
													>Leave Lobby</button>
													<button
														className="px-6 py-3 bg-gradient-to-br from-yellow-700 via-red-900 to-black border-2 border-yellow-400 rounded-xl text-white font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 ml-2"
														onClick={reshance}
													>Rematch</button>
												</>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
						{/* Statistics */}
						<div className="flex flex-col items-center w-1/8 p-4">
							<div className="bg-black/70 border-2 border-green-700 rounded-xl shadow-lg p-6 flex flex-col items-center w-full h-full">
								<h2 className="text-lg font-bold text-green-300 mb-2 text-center">Statistics</h2>
								<div className="mb-4 w-full">
									<h4 className="font-semibold text-gray-300 mb-1">Personal</h4>
									<div>Games: <span className="font-bold">{personalStats.games}</span></div>
									<div>Wins: <span className="font-bold">{personalStats.wins}</span></div>
									<div>Win Rate: <span className="font-bold">{personalStats.games ? ((personalStats.wins / personalStats.games) * 100).toFixed(1) : '0'}%</span></div>
									<div>Bets: <span className="font-bold">{personalStats.bets}</span></div>
								</div>
								<div className="w-full">
									<h4 className="font-semibold text-gray-300 mb-1">Global</h4>
									<div>Total Games: <span className="font-bold">{globalStats.games}</span></div>
									<div>Total Bets: <span className="font-bold">{globalStats.bets}</span></div>
								</div>
							</div>
						</div>
					</div>
				</div>);
}
