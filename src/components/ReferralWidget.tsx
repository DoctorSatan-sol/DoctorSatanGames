
import React, { useState, useEffect } from 'react';
import './ReferralWidget.css';
import { useAccount, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import { sgSAbi, chains } from '../constants';


const ReferralWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [myReferrer, setMyReferrer] = useState('');
  const [myCode, setMyCode] = useState('');
  const [refCount, setRefCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();

  // Get referral contract address from chains config (replace with correct key if needed)
  const referralContractAddress = chains[chainId]?.pool;

  useEffect(() => {
    const fetchReferralInfo = async () => {
      if (!address || !referralContractAddress) return;
      setLoading(true);
      try {
        // Use default provider (can be replaced with custom RPC)
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(referralContractAddress, sgSAbi, provider);
        // playerInfo returns: totalBetsAmount, totalPayout, totalGamesPlayed, totalGamesWon, totalReferrals
        const info = await contract.playerInfo(address);
        setRefCount(Number(info.totalReferrals || 0));
        // If contract has getReferrer/getReferralCode, call them (example names)
        if (contract.getReferrer) {
          const referrer = await contract.getReferrer(address);
          setMyReferrer(referrer);
        }
        if (contract.getReferralCode) {
          const code = await contract.getReferralCode(address);
          setMyCode(code);
        }
      } catch (err) {
        // fallback: clear fields
        setRefCount(0);
        setMyReferrer('');
        setMyCode('');
      }
      setLoading(false);
    };
    fetchReferralInfo();
  }, [address, referralContractAddress]);

  const handleAccept = () => {
    // TODO: implement contract call to accept referral code
    setMyReferrer(inputCode);
    setInputCode('');
  };

  const handleCreate = () => {
    // TODO: implement contract call to create referral code
    setMyCode('NEWCODE123');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg border border-red-800 bg-[#111] px-2 py-2 font-medium text-red-300 shadow-[0_0_15px_rgba(200,0,0,0.6),inset_0_0_4px_rgba(180,20,20,0.5)] transition-all duration-300 hover:bg-red-700 hover:text-white hover:border-red-600 hover:shadow-[0_0_20px_rgba(255,0,0,0.8),inset_0_0_6px_rgba(255,100,100,0.5)] flex items-center justify-center"
      >
        <span className="inline-flex items-center gap-2 justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 20 16" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 2v2m0 0v2m0-2h2m-2 0H2m12 8v2m0 0v2m0-2h2m-2 0h-2M8 8v2m0 0v2m0-2h2m-2 0H6" />
          </svg>
          <span className="leading-none flex items-center">Реф. система</span>
        </span>
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="relative w-[400px] max-w-[90vw] rounded-xl border border-red-800/70 bg-[#0A0A0A] p-6 shadow-[0_0_30px_rgba(200,0,0,0.5),inset_0_0_10px_rgba(100,0,0,0.5)]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-gray-500 transition hover:text-white text-2xl"
            >
              &times;
            </button>
            <div className="referral-modal-header">
              <span>Referral System</span>
            </div>
            <div className="referral-widget">
              <div className="referral-input-group" style={{ marginBottom: 12, flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
                  <button onClick={handleAccept}>Accept</button>
                  <button onClick={handleCreate}>Create</button>
                </div>
              </div>
              <div className="referral-info">
                <div>My referrer: <span>{loading ? 'Loading...' : (myReferrer || '—')}</span></div>
                <div>My code: <span>{loading ? 'Loading...' : (myCode || '—')}</span></div>
                <div>My referrals: <span>{loading ? 'Loading...' : refCount}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReferralWidget;
