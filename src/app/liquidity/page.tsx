"use client";

import { useChainId, useConfig, useAccount, useReadContract, useBalance } from "wagmi";
import { writeContract, simulateContract, waitForTransactionReceipt } from "@wagmi/core";
import { chains, sgSAbi, chainlinkAbi } from "@/constants";
import toast, { Toaster } from 'react-hot-toast';
import { FiArrowDownCircle, FiArrowUpCircle } from "react-icons/fi";
import { useState } from 'react';

export default function Liquidity() {
  const chainId = useChainId();
  const poolAddress = chains[chainId]?.pool as `0x${string}`;
  const config = useConfig();
  const { address } = useAccount();

  const launchDate = new Date('2025-08-13');
  const daysSinceLaunch = Math.floor((Date.now() - launchDate.getTime()) / (1000 * 60 * 60 * 24));

  const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
    abi: sgSAbi,
    address: poolAddress,
    functionName: 'balanceOf',
    args: [address ?? "0x0000000000000000000000000000000000000000"]
  });

  const { data: tvlData, refetch: refetchTvl } = useBalance({
    address: poolAddress
  });

  const { data: totalSupplyData, refetch: refetchTotalSupply } = useReadContract({
    abi: sgSAbi,
    address: poolAddress,
    functionName: 'totalSupply'
  });

  const { data: roundData } = useReadContract({
    abi: chainlinkAbi,
    address: chains[chainId]?.chainlink as `0x${string}`,
    functionName: 'latestRoundData',
  });

  const { data: nativeBalance } = useBalance({
    address: address
  });

  const { data: exchangeRate, refetch: refetchExchangeRate } = useReadContract({
    abi: sgSAbi,
    address: poolAddress,
    functionName: 'getExchangeRate'
  });

  const answer = roundData && Array.isArray(roundData) ? roundData[1] : BigInt(0);
  const tvlValue = tvlData ? parseFloat(tvlData.value.toString()) / 1e18 : 0;
  const price = answer ? Number(answer) / 1e8 : 0;
  const totalSupply = totalSupplyData ? parseFloat(totalSupplyData.toString()) / 1e18 : 0;
  
  const poolBalance$ = tvlValue * price;
  const apyValue = daysSinceLaunch > 0 ? (((tvlValue - totalSupply) / totalSupply) / daysSinceLaunch) * 365 * 100 : 0;

  const poolStats = {
    apy: apyValue > 0 ? apyValue.toFixed(2) : 0,
    tvl: Math.round(poolBalance$),
    yourStake: userBalance ? (parseFloat(userBalance.toString()) / 1e18).toFixed(1) : 0,
  };

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const maxDepositAmount = nativeBalance ? 
    Math.max(0, parseFloat(nativeBalance.formatted) - 0.1).toFixed(3) : '0';

  const halfDepositAmount = nativeBalance ? 
    (Math.max(0, parseFloat(nativeBalance.formatted)) / 2).toFixed(3) : '0';

  const expectedSgS = stakeAmount ? 
    totalSupply > 0 ? 
      ((parseFloat(stakeAmount) * totalSupply) / tvlValue).toFixed(3) 
      : parseFloat(stakeAmount).toFixed(3)
    : '0';

  const expectedS = unstakeAmount ? 
    ((parseFloat(unstakeAmount) * tvlValue) / totalSupply).toFixed(3) 
    : '0';

  async function handleStake() {
    if (!stakeAmount || parseFloat(stakeAmount) < 1) {
      toast.error('Minimum stake amount is 1');
      return;
    }

    const toastId = toast.loading('Transaction in progress...');
    
    try {
      const simulation = await simulateContract(config, {
        abi: sgSAbi,
        address: poolAddress,
        functionName: 'stake',
        value: BigInt(parseFloat(stakeAmount) * 1e18)
      });

      const tx = await writeContract(config, {
        ...simulation.request,
        value: BigInt(parseFloat(stakeAmount) * 1e18),
      });

      const receipt = await waitForTransactionReceipt(config, { hash: tx });
      
      await Promise.all([
        refetchUserBalance(),
        refetchTotalSupply(),
        refetchTvl(),
        refetchExchangeRate()
      ]);
      
      setStakeAmount('');
      toast.success('Stake completed', { id: toastId });

    } catch (error) {
      toast.error('Deposit failed', { id: toastId });
    }
  }

  async function handleUnstake() {
    if (!unstakeAmount || parseFloat(unstakeAmount) < 1) {
      toast.error('Minimum unstake amount is 1');
      return;
    }

    const toastId = toast.loading('Transaction in progress...');

    try {
      const simulation = await simulateContract(config, {
        abi: sgSAbi,
        address: poolAddress,
        functionName: 'unstake',
        args: [BigInt(parseFloat(unstakeAmount) * 1e18)]
      });

      const tx = await writeContract(config, simulation.request);

      const receipt = await waitForTransactionReceipt(config, { hash: tx });
      
      await Promise.all([
        refetchUserBalance(),
        refetchTotalSupply(),
        refetchTvl(),
        refetchExchangeRate()
      ]);
      
      setUnstakeAmount('');
      toast.success('Unstake completed', { id: toastId });

    } catch (error) {
      toast.error('Unstake failed', { id: toastId });
    }
  }

  return (
    <div className="h-screen overflow-auto bg-gradient-to-b from-red-950 to-black">
      <Toaster position="bottom-right" 
        toastOptions={{
          className: 'bg-black border border-red-900 text-red-200'
        }} 
      />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-red-100 mb-8 text-center"
            style={{ textShadow: '2px 2px 4px rgba(220, 38, 38, 0.8)' }}>
          Liquidity
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-black/50 border border-red-800 rounded-lg p-4">
            <div className="text-red-400">APY</div>
            <div className="text-2xl text-red-200 font-mono">{poolStats.apy}%</div>
          </div>
          <div className="bg-black/50 border border-red-800 rounded-lg p-4">
            <div className="text-red-400">TVL</div>
            <div className="text-2xl text-red-200 font-mono">${poolStats.tvl.toLocaleString()}</div>
          </div>
          <div className="bg-black/50 border border-red-800 rounded-lg p-4">
            <div className="text-red-400">Your Stake</div>
            <div className="text-2xl text-red-200 font-mono">{poolStats.yourStake.toLocaleString()} sgS</div>
          </div>
        </div>

        <div className="bg-black/50 border-2 border-red-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-red-300 mb-4 flex items-center">
                <FiArrowDownCircle className="mr-2 text-red-400" /> Deposit
              </h3>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-red-400">Amount (S)</label>
                  {stakeAmount && parseFloat(stakeAmount) > 0 && (
                    <span className="text-red-400 text-sm">
                      Expected sgS: {expectedSgS}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full bg-black/30 border border-red-900 text-red-200 px-4 py-2 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    onWheel={e => e.currentTarget.blur()}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={() => setStakeAmount(halfDepositAmount)}
                      className="px-2 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-200 rounded"
                    >
                      HALF
                    </button>
                    <button 
                      onClick={() => setStakeAmount(maxDepositAmount)}
                      className="px-2 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-200 rounded"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleStake}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-900 to-black border border-red-700 text-red-200 rounded-lg 
                          hover:bg-gradient-to-r hover:from-red-800 hover:to-black transition-all
                          font-bold tracking-tight text-lg"
              >
                STAKE S
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold text-red-300 mb-4 flex items-center">
                <FiArrowUpCircle className="mr-2 text-red-400" /> Withdraw
              </h3>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-red-400">Amount (sgS)</label>
                  {unstakeAmount && parseFloat(unstakeAmount) > 0 && (
                    <span className="text-red-400 text-sm">
                      Expected S: {expectedS}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full bg-black/30 border border-red-900 text-red-200 px-4 py-2 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    placeholder="0.0"
                    value={unstakeAmount}
                    onChange={e => setUnstakeAmount(e.target.value)}
                    onWheel={e => e.currentTarget.blur()}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={() => setUnstakeAmount(userBalance ? 
                        ((parseFloat(userBalance.toString()) / 1e18) / 2).toFixed(3) : '0')}
                      className="px-2 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-200 rounded"
                    >
                      HALF
                    </button>
                    <button 
                      onClick={() => setUnstakeAmount(userBalance ? 
                        (parseFloat(userBalance.toString()) / 1e18).toFixed(3) : '0')}
                      className="px-2 py-1 text-sm bg-red-900/50 hover:bg-red-800 text-red-200 rounded"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleUnstake}
                className="w-full px-6 py-3 bg-gradient-to-r from-black to-red-900 border border-red-700 text-red-200 rounded-lg 
                          hover:bg-gradient-to-r hover:from-black hover:to-red-800 transition-all
                          font-bold tracking-tight text-lg"
              >
                UNSTAKE S
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}