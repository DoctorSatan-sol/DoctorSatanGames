"use client";

import { useState, useRef, useEffect } from "react";
import { useChainId, useConfig, useAccount, useReadContract, useSimulateContract, useWatchContractEvent } from "wagmi";
import { readContract, writeContract, simulateContract } from "@wagmi/core";
import { chains, sgSAbiV2 } from "@/constants";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { ModalWinLose } from "@/components/ModalWinLose";

export default function RussianRoulette() {

  // Обновление глобальной статистики
  
  // Константы для игры
  const TOTAL_CHAMBERS = 6;
  const MIN_CHARGED = 1;
  const MAX_CHARGED = 5;

  // Тип liveFeed
  type LiveFeedItem = {
    player: string;
    alive: boolean;
    spin: number;
    payout: string;
    amount?: string;
    x?: string;
    time: number;
    txHash?: string;
    requestId?: string;
  };
  // Global statistics state
  const [globalStats, setGlobalStats] = useState<{
    totalBets: string;
    totalPayout: string;
    totalGamesPlayed: string;
    totalGamesWon: string;
    totalGamesLost: string;
  }>({
    totalBets: "0",
    totalPayout: "0",
    totalGamesPlayed: "0",
    totalGamesWon: "0",
    totalGamesLost: "0",
  });

  // Player statistics state
  const [playerStats, setPlayerStats] = useState<{
    totalBetsAmount: string;
    totalPayout: string;
    totalGamesPlayed: string;
    totalGamesWon: string;
    totalReferrals: string;
  }>({
    totalBetsAmount: "0",
    totalPayout: "0",
    totalGamesPlayed: "0",
    totalGamesWon: "0",
    totalReferrals: "0",
  });

  const [chargedBullets, setChargedBullets] = useState(1);
  const [bet, setBet] = useState("1.1");
  const [coefficient, setCoefficient] = useState(1.14);
  const [winChance, setWinChance] = useState(83.33);
  const [started, setStarted] = useState(false);
  const [spinResult, setSpinResult] = useState<number|null>(null);
  const [isWin, setIsWin] = useState<boolean|null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  // wagmi hooks
  const chainId = useChainId();
  const config = useConfig();
  const account = useAccount();
  const rouletteAddress = chains[chainId]?.roulette as `0x${string}`;
  const rouletteAbi = sgSAbiV2;


  useEffect(() => {
      async function fetchGlobalStats() {
        if (!rouletteAddress) return;
        try {
          const [totalBets, totalPayout, totalGamesPlayed, totalGamesWon] = await Promise.all([
            readContract(config, { abi: rouletteAbi, address: rouletteAddress, functionName: "totalBets" }),
            readContract(config, { abi: rouletteAbi, address: rouletteAddress, functionName: "totalPayout" }),
            readContract(config, { abi: rouletteAbi, address: rouletteAddress, functionName: "totalGamesPlayed" }),
            readContract(config, { abi: rouletteAbi, address: rouletteAddress, functionName: "totalGamesWon" }),
          ]);
          setGlobalStats({
            totalBets: (Number(totalBets) / 1e18).toFixed(3),
            totalPayout: (Number(totalPayout) / 1e18).toFixed(3),
            totalGamesPlayed: String(totalGamesPlayed),
            totalGamesWon: String(totalGamesWon),
            totalGamesLost: String(Number(totalGamesPlayed) - Number(totalGamesWon)),
          });
        } catch (e) {
          // ignore
        }
      }
      fetchGlobalStats();
    }, [rouletteAddress, started, isWin]);
  // Fetch player statistics from contract
  useEffect(() => {
    async function fetchPlayerStats() {
      if (!account.address || !rouletteAddress) return;
      try {
        const result = await readContract(config, {
          abi: rouletteAbi,
          address: rouletteAddress,
          functionName: "playerInfo",
          args: [account.address],
        });
        if (Array.isArray(result) && result.length >= 5) {
          setPlayerStats({
            totalBetsAmount: (Number(result[0]) / 1e18).toFixed(3),
            totalPayout: (Number(result[1]) / 1e18).toFixed(3),
            totalGamesPlayed: String(result[2]),
            totalGamesWon: String(result[3]),
            totalReferrals: String(result[4]),
          });
        }
      } catch (e) {
        // ignore
      }
    }
    fetchPlayerStats();
  }, [account.address, rouletteAddress, started, isWin]);

  // Коэффициент: всего ячеек / заряжено патронов
  function updateCoefficient(newCharged: number) {
    // Шанс на выигрыш
    const winChancePercent = ((TOTAL_CHAMBERS - newCharged) / TOTAL_CHAMBERS) * 100;
    setWinChance(Number(winChancePercent.toFixed(2)));
    // Коэффициент выплаты (x): (6 / (6 - bullets)) * 0.95
    let payout = (TOTAL_CHAMBERS / (TOTAL_CHAMBERS - newCharged)) * 0.95;
    payout = Math.round(payout * 100) / 100;
    setCoefficient(payout);
  }

  function handleChargedChange(delta: number) {
    let newCharged = chargedBullets + delta;
    if (newCharged < MIN_CHARGED) newCharged = MIN_CHARGED;
    if (newCharged > MAX_CHARGED) newCharged = MAX_CHARGED;
    setChargedBullets(newCharged);
    updateCoefficient(newCharged);
  }

  const [waitForResult, setWaitForResult] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const pendingRequestIdRef = useRef<string | null>(null);
  useEffect(() => {
    pendingRequestIdRef.current = pendingRequestId;
  }, [pendingRequestId]);
    // Для устранения гонки: сохраняем requestId в useRef синхронно
    const lastBetResultRef = useRef<any>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  async function handleStart() {
  if (!bet || Number(bet) < 1.1 || started || isLoading) return;
    setStarted(true);
    setIsLoading(true);
    setSpinResult(null);
    setIsWin(null);
    setPendingRequestId(null);
    setErrorMsg(null);
    try {
      // Simulation
      const simulation = await simulateContract(config, {
        abi: rouletteAbi,
        address: rouletteAddress,
        functionName: 'bet',
        args: [chargedBullets],
        value: BigInt(Math.floor(Number(bet) * 1e18)),
        account: account.address,
      });
      if (!simulation || !simulation.request) throw new Error('Simulation failed');
      // Transaction
      const tx = await writeContract(config, {
        ...simulation.request,
        value: BigInt(Math.floor(Number(bet) * 1e18)),
      });
      // Wait for BetPlaced to get requestId
      setWaitForResult(true);
      // Set timeout for result (60 sec)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setStarted(false);
        setWaitForResult(false);
        setPendingRequestId(null);
        setErrorMsg('Result timeout. Please try again.');
      }, 60000); // 60 seconds
    } catch (e) {
      setIsLoading(false);
      setStarted(false);
      setErrorMsg('Transaction error or cancelled');
    }
  }

  // Слушаем событие BetPlaced для получения requestId
  useWatchContractEvent({
    address: rouletteAddress,
    abi: rouletteAbi,
    eventName: 'BetPlaced',
    onLogs(logs) {
      if (!waitForResult || !account.address) return;
      console.log('BetPlaced logs:', logs);
      for (const log of logs) {
        // requestId = topics[1]
        const player = (log as any).args?.[1];
        if (typeof player === 'string' && player.toLowerCase() !== account.address?.toLowerCase()) continue;
        const requestId = log.topics?.[1];
        console.log('Set pendingRequestId (from topics[1]):', requestId);
    pendingRequestIdRef.current = requestId ? String(requestId) : null;
    setPendingRequestId(pendingRequestIdRef.current);
        break;
      }
    },
  });

  // Слушаем событие BetResult по requestId
  useWatchContractEvent({
    address: rouletteAddress,
    abi: rouletteAbi,
    eventName: 'BetResult',
    onLogs(logs) {
      const lastPendingId = pendingRequestIdRef.current;
      for (const log of logs) {
        const requestId = log.topics?.[1];
        const args = (log as any).args;
        // Добавляем в liveFeed только если такого requestId или txHash ещё нет
        if (args && args.player && args.spin !== undefined && args.alive !== undefined) {
          setLiveFeed(prev => {
            // amount и payout теперь есть в ивенте
            const amount = args.amount ? (typeof args.amount === 'bigint' ? Number(args.amount) / 1e18 : Number(args.amount)) : 0;
            const payout = args.payout ? (typeof args.payout === 'bigint' ? Number(args.payout) / 1e18 : Number(args.payout)) : 0;
            // Вычисляем x (иксы)
            let x = amount > 0 ? payout / amount : 0;
            x = x && isFinite(x) ? x : 0;
            const newItem = {
              player: args.player,
              alive: typeof args.alive === 'boolean' ? args.alive : (typeof args.alive === 'bigint' ? args.alive !== BigInt(0) : Boolean(args.alive)),
              spin: typeof args.spin === 'bigint' ? Number(args.spin) : Number(args.spin),
              payout: payout.toFixed(3),
              amount: amount.toFixed(3),
              x: x.toFixed(2),
              time: Date.now(),
              txHash: log.transactionHash || undefined,
              requestId: log.topics?.[1],
            };
            // Проверяем дубли по requestId или txHash
            if (prev.some(item => (item.requestId && item.requestId === newItem.requestId) || (item.txHash && item.txHash === newItem.txHash))) {
              return prev;
            }
            return [newItem, ...prev].slice(0, 30);
          });
        }
        // ...остальная логика для текущего игрока...
        if (!args) continue;
        if (requestId === lastPendingId && lastPendingId) {
          // ...existing code...
          const alive = args.alive;
          const spin = args.spin;
          setSpinResult(typeof spin === 'bigint' ? Number(spin) : Number(spin));
          let winValue;
          if (typeof alive === 'boolean') winValue = alive;
          else if (typeof alive === 'bigint') winValue = alive !== BigInt(0);
          else winValue = Boolean(alive);
          setIsWin(winValue);
          setIsLoading(false);
          setStarted(false);
          setWaitForResult(false);
          setPendingRequestId(null);
          setErrorMsg(null);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        } else {
          // Если pendingRequestId ещё не установлен, сохраняем результат
          if (!lastPendingId && requestId) {
            lastBetResultRef.current = { log, args };
          }
        }
      }
    },
  });
  
    useEffect(() => {
      if (pendingRequestId && lastBetResultRef.current) {
        const { log, args } = lastBetResultRef.current;
        const requestId = log.topics?.[1];
        if (requestId === pendingRequestId) {
          // обработать результат
          const alive = args.alive;
          const spin = args.spin;
          setSpinResult(typeof spin === 'bigint' ? Number(spin) : Number(spin));
          let winValue;
          if (typeof alive === 'boolean') winValue = alive;
          else if (typeof alive === 'bigint') winValue = alive !== BigInt(0);
          else winValue = Boolean(alive);
          setIsWin(winValue);
          setIsLoading(false);
          setStarted(false);
          setWaitForResult(false);
          setPendingRequestId(null);
          setErrorMsg(null);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          lastBetResultRef.current = null;
        }
      }
    }, [pendingRequestId]);
  
  // ...удалён дублирующий useWatchContractEvent для BetResult...


  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 to-black flex flex-col items-center justify-start pt-4">
      {/* Live-лента игр */}
      <div className="w-full max-w-10xl mb-8">
        <div className="bg-black/70 border-2 border-red-800 rounded-xl p-3 shadow-lg">
        <h2 className="text-lg font-bold text-red-200 mb-2 text-center">Live</h2>
          <div className="bg-black/70 border-2 border-red-800 rounded-xl p-3 shadow-lg">{liveFeed.length === 0 ? (
              <div className="text-gray-400 text-sm italic text-center">No new games</div>
            ) : (
              <div className="flex flex-row-reverse gap-2 justify-end items-center max-w-full py-2" style={{overflowX: 'hidden'}}>
                {liveFeed.map((item, idx) => {
                  const color = item.alive ? 'bg-green-700 border-green-400' : 'bg-red-800 border-red-400';
                  const xLabel = item.x && Number(item.x) > 0 ? `x${item.x}` : 'x0';
                  const tooltip = `Player: ${item.player}\nSpin: ${item.spin + 1}\n${item.alive ? 'WIN' : 'LOSE'}\nAmount: ${item.amount}\nPayout: ${item.payout}\nX: ${item.x}\n${new Date(item.time).toLocaleTimeString()}`;
                  // Ссылка на tx или на адрес игрока
                  const link = item.txHash
                    ? `https://testnet.sonicscan.org/tx/${item.txHash}`
                    : `https://testnet.sonicscan.org/address/${item.player}`;
                  return (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={tooltip}
                      className={`w-12 h-12 min-w-12 min-h-12 flex flex-col items-center justify-center rounded-lg border-2 shadow transition hover:scale-105 cursor-pointer ${color}`}
                    >
                      <span className="font-bold text-lg select-none">{xLabel}</span>
                      <span className="text-xs font-mono select-none">{item.alive ? 'WIN' : 'LOSE'}</span>
                    </a>
                  );
                })}
              </div>
            )}</div>  
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-5 w-full justify-center items-stretch">
        {/* Моя статистика и глобальная статистика */}
        <div className="flex flex-col gap-4 max-w-xs w-full mb-8 md:mb-0">
          <div className="bg-black/60 border-2 border-red-800 rounded-xl p-6 flex flex-col justify-up shadow-lg">
            <h2 className="text-lg font-bold text-red-200 mb-2 text-center">My Statistics</h2>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Games Played:</span> <span className="font-mono">{playerStats.totalGamesPlayed}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Games Won:</span> <span className="font-mono">{playerStats.totalGamesWon}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Amount Spent:</span> <span className="font-mono">{playerStats.totalBetsAmount}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Amount Won:</span> <span className="font-mono">{playerStats.totalPayout}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Referrals:</span> <span className="font-mono">{playerStats.totalReferrals}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>ROI:</span> <span className="font-mono">{Number(playerStats.totalBetsAmount) > 0 ? ((Number(playerStats.totalPayout) / Number(playerStats.totalBetsAmount)) * 100).toFixed(1) : 0}%</span></div>
          </div>
          <div className="bg-black/60 border-2 border-yellow-800 rounded-xl p-6 flex flex-col justify-up shadow-lg">
            <h2 className="text-lg font-bold text-yellow-200 mb-2 text-center">Global Statistics</h2>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Games Played:</span> <span className="font-mono">{globalStats.totalGamesPlayed}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Games Won:</span> <span className="font-mono">{globalStats.totalGamesWon}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Games Lost:</span> <span className="font-mono">{globalStats.totalGamesLost}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Total Bets:</span> <span className="font-mono">{globalStats.totalBets}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>Total Payout:</span> <span className="font-mono">{globalStats.totalPayout}</span></div>
            <div className="text-gray-300 mb-1 flex justify-between"><span>ROI:</span> <span className="font-mono">{Number(globalStats.totalBets) > 0 ? ((Number(globalStats.totalPayout) / Number(globalStats.totalBets)) * 100).toFixed(1) : 0}%</span></div>
          </div>
        </div>
        {/* Основное окно игры */}
  <div className="bg-black/60 border-1 border-red-700 rounded-xl p-8 w-full max-w-md shadow-lg flex flex-col justify-start">
          <h1 className="text-4xl font-bold text-red-100 mb-8 text-center"
              style={{ textShadow: '2px 2px 4px rgba(220, 38, 38, 0.8)' }}>
            Roulette
          </h1>
          {/* Барабан */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-150 h-90 flex items-center justify-center mb-4">
              {/* Барабан визуально */}
              <svg
                width="400" height="400" viewBox="0 0 160 160"
                style={{
                  transition: 'transform 2.5s cubic-bezier(.4,2,.3,1)',
                  transform: spinResult !== null ? `rotate(${(spinResult / TOTAL_CHAMBERS) * 360}deg)` : 'none',
                }}
              >
                <circle cx="80" cy="80" r="75" fill="#222" stroke="#444" strokeWidth="6" />
                {[...Array(TOTAL_CHAMBERS)].map((_, i) => {
                  const angle = (i / TOTAL_CHAMBERS) * 2 * Math.PI;
                  const x = 80 + 55 * Math.cos(angle - Math.PI / 2);
                  const y = 80 + 55 * Math.sin(angle - Math.PI / 2);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="16"
                      fill={i < chargedBullets ? "#e11d48" : "#444"}
                      stroke="#222"
                      strokeWidth="3"
                    />
                  );
                })}
                <circle cx="80" cy="80" r="26" fill="#111" stroke="#333" strokeWidth="1" />
              </svg>
            </div>
            {/* Стрелки и выбор заряжаемых патронов */}
            <div className="flex items-center gap-4 mb-2">
              <button
                className="p-2 rounded-full bg-gradient-to-r from-red-900 to-black hover:bg-gray-700 border border-gray-600 text-gray-200"
                onClick={() => handleChargedChange(-1)}
                disabled={chargedBullets === MIN_CHARGED || started}
              >
                <FiArrowLeft size={24} />
              </button>
              <div className="flex gap-1">
                {[...Array(MAX_CHARGED)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full border-2 ${i < chargedBullets ? "bg-red-700 border-red-400" : "bg-gray-700 border-gray-500"}`}
                  />
                ))}
              </div>
              <button
                className="p-2 rounded-full bg-gradient-to-r from-black-900 to-red-900 hover:bg-gray-700 border border-gray-600 text-gray-200"
                onClick={() => handleChargedChange(1)}
                disabled={chargedBullets === MAX_CHARGED || started}
              >
                <FiArrowRight size={24} />
              </button>
            </div>
            <div className="text-gray-400 text-sm mb-2">
              Loaded ammos: <span className="text-gray-100 font-bold">{chargedBullets}</span> of <span className="text-gray-100 font-bold">{TOTAL_CHAMBERS}</span>
            </div>
          </div>
        </div>
        <div className="w-full max-w-md md:ml-0 md:mt-0 mt-0 flex flex-col justify-start">
          <div className="bg-black/70 border-2 border-red-800 rounded-xl p-3 shadow-lg flex flex-col gap-3 mb-4">
            <div className="text-gray-300 text-lg mb-1">Chance to win: <span className="font-bold text-green-400">{winChance}%</span></div>
            <div className="text-gray-300 text-lg">Coefficient: <span className="font-bold text-red-400">x{coefficient}</span></div>
            {bet && Number(bet) > 0 && (
              <div className="text-gray-300 text-lg mt-1">Possible winnings: <span className="font-bold text-green-400">{((Number(bet) * TOTAL_CHAMBERS) / (TOTAL_CHAMBERS - chargedBullets) * 0.95).toFixed(2)}</span></div>
            )}
            {/* Новое окно для ставки и кнопки старта */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2 justify-center">
                <div className="flex items-center w-full bg-gradient-to-r from-black to-red-900 border border-red-700 rounded-xl px-2 py-2 shadow-inner">
                  <input
                    type="number"
                    className="w-full text-center bg-black/60 border-none text-red-100 rounded-l-xl px-4 py-2 text-lg font-mono focus:outline-none appearance-none no-arrows"
                    placeholder="Enter bet amount"
                    value={bet}
                    min={1.1}
                    step={0.1}
                    onChange={e => {
                      const value = e.target.value;
                      if (Number(value) < 1.1 && value !== "") {
                        setBet("1.1");
                      } else {
                        setBet(value);
                      }
                    }}
                    disabled={started}
                  />
                  <div className="flex gap-2 ml-2">
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-black to-red-900 border border-red-700 rounded-full text-xl text-red-100 hover:from-red-900 hover:to-black hover:text-white disabled:opacity-60 transition-all duration-150 shadow"
                      style={{zIndex:2}}
                      onClick={() => setBet(prev => {
                        const val = Number(prev) || 0;
                        return val > 1.1 ? (val - 0.1).toFixed(2) : "1.1";
                      })}
                      disabled={started}
                    >-</button>
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-black to-red-900 border border-red-700 rounded-full text-xl text-red-100 hover:from-red-900 hover:to-black hover:text-white disabled:opacity-60 transition-all duration-150 shadow"
                      style={{zIndex:2}}
                      onClick={() => setBet(prev => {
                        const val = Number(prev) || 0;
                        return (val + 0.1).toFixed(2);
                      })}
                      disabled={started}
                    >+</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-center mt-2">
                <button
                  className="px-3 py-1.5 bg-gradient-to-r from-green-700 to-green-900 border border-green-500 rounded-lg text-xs text-white font-bold shadow hover:from-green-600 hover:to-green-800 transition-all duration-150 flex items-center gap-1 disabled:opacity-60"
                  onClick={() => setBet("1.1")}
                  disabled={started}
                  title="Minimum bet"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="inline"><text x="12" y="16" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">min</text></svg>
                </button>
                <button
                  className="px-3 py-1.5 bg-gradient-to-r from-yellow-700 to-yellow-900 border border-yellow-500 rounded-lg text-xs text-white font-bold shadow hover:from-yellow-600 hover:to-yellow-800 transition-all duration-150 flex items-center gap-1 disabled:opacity-60"
                  onClick={() => setBet((prev) => (Number(prev) > 0 ? Math.max((Number(prev) / 2), 1.1).toFixed(2) : "1.1"))}
                  disabled={started || !bet || Number(bet) <= 1.1}
                  title="Half of current bet"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="inline"><text x="12" y="16" textAnchor="middle" fontSize="15" fontWeight="bold" fill="white">½</text></svg>
                </button>
                <button
                  className="px-3 py-1.5 bg-gradient-to-r from-red-700 to-red-900 border border-red-500 rounded-lg text-xs text-white font-bold shadow hover:from-red-600 hover:to-red-800 transition-all duration-150 flex items-center gap-1 disabled:opacity-60"
                  onClick={() => setBet("10")}
                  disabled={started}
                  title="Maximum bet"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="inline"><text x="12" y="16" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">max</text></svg>
                </button>
              </div>
              <button
                className="w-full px-6 py-3 bg-gradient-to-r from-red-900 to-black border border-red-700 text-red-200 rounded-lg hover:bg-gradient-to-r hover:from-red-800 hover:to-black transition-all font-bold tracking-tight text-lg mb-2 disabled:opacity-60"
                onClick={handleStart}
                disabled={started || isLoading || !bet || Number(bet) < 1.1}
              >
                {isLoading ? 'Spinning...' : 'Start'}
              </button>
              {/* Окна выигрыша/проигрыша и ошибок */}
              {pendingRequestId && isWin === null && (
                <div className="mt-2 px-4 py-2 bg-blue-900/80 border border-blue-600 text-blue-200 rounded-lg text-xs font-mono">pendingRequestId: {pendingRequestId}</div>
              )}
              {/* Fullscreen win/lose modal with fade/scale animation */}
              <ModalWinLose isWin={isWin} onClose={() => setIsWin(null)} />

              {errorMsg && (
                <div className="mt-2 px-4 py-2 bg-yellow-900/80 border border-yellow-600 text-yellow-200 rounded-lg text-base font-bold animate-pulse">{errorMsg}</div>
              )}

            </div>
          </div>
        {/* Referral system UI separate block */}
        <div className="w-half max-w-4xl mb-8">
          <div className="bg-black/60 border border-yellow-700 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-yellow-300 text-lg font-bold mb-2 text-center">Referral System</h3>
            <div className="flex flex-col md:flex-row gap-2 items-center justify-center">
              <input
                type="text"
                className="w-40 text-center bg-black/80 border border-gray-700 text-gray-100 rounded-lg px-2 py-1 text-base font-mono focus:outline-none"
                placeholder="Enter referral code"
                disabled={started}
              />
              <button
                className="px-4 py-1.5 bg-gradient-to-r from-green-700 to-green-900 border border-green-500 rounded-lg text-xs text-white font-bold shadow hover:from-green-600 hover:to-green-800 transition-all duration-150 disabled:opacity-60"
                disabled={started}
              >Apply</button>
              <button
                className="px-4 py-1.5 bg-gradient-to-r from-yellow-700 to-yellow-900 border border-yellow-500 rounded-lg text-xs text-white font-bold shadow hover:from-yellow-600 hover:to-yellow-800 transition-all duration-150 disabled:opacity-60"
                disabled={started}
              >Create</button>
            </div>
            <div className="text-gray-300 text-sm mt-2">Your referrer: <span className="font-mono text-yellow-200">---</span></div>
            <div className="text-gray-300 text-sm mt-1">Your referrals:</div>
            <ul className="text-xs text-yellow-100 font-mono pl-4 list-disc">
              <li>---</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    </div>
    
  );
}
