  // Helper for bytes32
  function toBytes32(str: string): string {
    const encoder = new TextEncoder();
    let bytes = encoder.encode(str);
    if (bytes.length > 32) bytes = bytes.slice(0, 32);
    const padded = new Uint8Array(32);
    padded.set(bytes);
    return '0x' + Array.from(padded).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { sgSAbi, chains } from '@/constants';
import './ReferralWidget.css';

const ReferralWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [myReferrer, setMyReferrer] = useState('');
  const [myCode, setMyCode] = useState('');
  const [refCount, setRefCount] = useState(0);
  const [loading, setLoading] = useState(false);
  // Replace with your chainId logic if needed
  const chainId = 146;
  const contractAddress = chains[chainId]?.pool;
  const SONIC_RPC_URL = 'https://rpc.soniclabs.com';


  // Fetch user info from contract
  // bytes32 to string
  function bytes32ToString(hex: string): string {
    if (!hex || hex === '—') return '—';
    try {
      let str = '';
      if (hex.startsWith('0x')) {
        str = Buffer.from(hex.replace(/^0x/, ''), 'hex').toString('utf8');
      } else {
        str = hex;
      }
      return str.replace(/\u0000+$/, '').replace(/\0+$/, '');
    } catch {
      return hex;
    }
  }

  const fetchUserInfo = async (address: string) => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(SONIC_RPC_URL);
      const contract = new ethers.Contract(contractAddress, sgSAbi, provider);
      const user = await contract.user(address);
      setRefCount(Number(user.totalReferrals));
      setMyCode(user.referralCode ? bytes32ToString(user.referralCode) : '—');
      // Ограничить длину адреса реферера
      if (user.referrer && typeof user.referrer === 'string' && user.referrer.length > 10) {
        setMyReferrer(user.referrer.slice(0, 6) + '...' + user.referrer.slice(-4));
      } else {
        setMyReferrer(user.referrer ? user.referrer : '—');
      }
    } catch (e) {
      setRefCount(0);
      setMyCode('—');
      setMyReferrer('—');
    }
    setLoading(false);
  };

  // Replace with your wallet logic
  useEffect(() => {
    if (isOpen) {
      // Try to get address from wallet (wagmi, window.ethereum, etc.)
      let address = '';
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.selectedAddress) {
        address = window.ethereum.selectedAddress;
      }
      // fallback: ask user to connect wallet or use wagmi
      if (address) fetchUserInfo(address);
    }
  }, [isOpen]);

  const handleAccept = async () => {
    if (!inputCode) return;
    setLoading(true);
    try {
      const bytes32 = toBytes32(inputCode);
      let address = '';
      let wallet;
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.selectedAddress) {
        address = window.ethereum.selectedAddress;
        // Try to get signer from MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);
        wallet = await provider.getSigner();
      } else {
        throw new Error('No wallet connected');
      }
      const contract = new ethers.Contract(contractAddress, sgSAbi, wallet);
      const tx = await contract.applyReferralCode(bytes32);
      await tx.wait();
      setInputCode('');
      fetchUserInfo(address);
    } catch (e) {
      // handle error
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!inputCode) return;
    setLoading(true);
    try {
      const bytes32 = toBytes32(inputCode);
      let address = '';
      let wallet;
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.selectedAddress) {
        address = window.ethereum.selectedAddress;
        const provider = new ethers.BrowserProvider(window.ethereum);
        wallet = await provider.getSigner();
      } else {
        throw new Error('No wallet connected');
      }
      const contract = new ethers.Contract(contractAddress, sgSAbi, wallet);
      const tx = await contract.createReferralCode(bytes32);
      await tx.wait();
      setInputCode('');
      fetchUserInfo(address);
    } catch (e) {
      // handle error
    }
    setLoading(false);
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
          <span className="leading-none flex items-center">Referral System</span>
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
                {loading ? (
                  <div style={{ color: '#ff4c4c' }}>Loading...</div>
                ) : (
                  <>
                    <div>My referrer: <span>{myReferrer || '—'}</span></div>
                    <div>My code: <span>{myCode && myCode !== '—' ? myCode : '—'}</span></div>
                    <div>My referrals: <span>{refCount}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReferralWidget;
