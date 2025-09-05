"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaXTwitter } from "react-icons/fa6";
import { FaGithub } from "react-icons/fa";
import { SiGitbook } from "react-icons/si";
import Link from "next/link";
import { useGameWalletContext } from "./GameWalletContext";
import { FancyCheckbox } from "./FancyCheckbox";

export default function Header() {
  const { useGameWallet, setUseGameWallet } = useGameWalletContext();
  return (
    <header className="w-full bg-gradient-to-r from-red-900 via-black to-red-900 shadow-2xl border-b-4 border-red-900 relative overflow-hidden">
      {/* Грязные кровавые потеки */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-red-600 to-transparent"></div>
        <div className="absolute top-0 left-1/4 w-1 h-8 bg-red-800 rounded-b-full"></div>
        <div className="absolute top-0 right-1/3 w-1.5 h-10 bg-red-900 rounded-b-full"></div>
        <div className="absolute top-0 left-3/4 w-2 h-12 bg-red-800 rounded-b-full"></div>
        <div className="absolute top-2 right-10 w-3 h-16 bg-red-900 rounded-b-full transform rotate-6"></div>
      </div>

      {/* Эффект старой кинопленки */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-10 pointer-events-none"></div>
      
      <div className="flex items-center justify-between h-20 px-6 relative z-10">
        {/* Кнопка Twitter в стиле кровавой таблички */}
        <div className="flex items-center">
          <a
            href="https://x.com/vangeleth"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 rounded-md bg-black border-2 border-red-800 hover:bg-red-900/80 hover:border-red-500 transition-all duration-300 shadow-lg hover:shadow-red-700/70 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-900 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <FaXTwitter className="text-red-500 group-hover:text-red-300 text-2xl z-10" />

          </a>
        </div>
        <div className="flex items-center">
          <a
            href="https://github.com/DoctorSatan-sol/DoctorSatanGames"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 rounded-md bg-black border-2 border-red-800 hover:bg-red-900/80 hover:border-red-500 transition-all duration-300 shadow-lg hover:shadow-red-700/70 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-900 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <FaGithub className="text-red-500 group-hover:text-red-300 text-2xl z-10" />
            
          </a>
        </div>
        <div className="flex items-center">
          <a
            href="https://doctorsatangames.gitbook.io/doctorsatangames-docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 rounded-md bg-black border-2 border-red-800 hover:bg-red-900/80 hover:border-red-500 transition-all duration-300 shadow-lg hover:shadow-red-700/70 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-900 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <SiGitbook className="text-red-500 group-hover:text-red-300 text-2xl z-10" />
            
          </a>
        </div>

        {/* Центральный логотип - теперь как рваная кровавая вывеска */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <Link href="/" passHref>
            <button 
              className="text-4xl font-bold px-6 py-2 rounded-md cursor-pointer relative group"
              style={{
                fontFamily: "'Creepster', cursive, sans-serif",
                textShadow: '3px 3px 0 #500, 6px 6px 0 #200',
                letterSpacing: '2px'
              }}
            >
              <span className="text-red-500 group-hover:text-red-300 transition-colors duration-300 relative z-10">
                SATAN GAMES
              </span>
              {/* Эффект подсветки крови */}
              <span className="absolute inset-0 bg-red-900 rounded-md opacity-0 group-hover:opacity-20 transition-opacity duration-500"></span>
              {/* Эффект капающей крови при наведении */}
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-red-600 group-hover:w-full group-hover:left-0 transition-all duration-700"></span>
            </button>
          </Link>
        </div>

        {/* Правая часть - кнопки с эффектом ржавых гвоздей */}
        <div className="ml-auto flex items-center gap-2">
          <div style={{ transform: 'scale(0.95)' }}>
            <FancyCheckbox
              checked={useGameWallet}
              onChange={e => setUseGameWallet(e.target.checked)}
              label="Game Wallet"
            />
          </div>
          <Link
            href="/liquidity"
            className="px-5 py-2.5 rounded-md bg-black border-2 border-red-800 text-red-500 hover:bg-red-900/80 hover:border-red-500 hover:text-red-300 transition-all duration-300 shadow-lg hover:shadow-red-700/70 relative group"
            style={{ minWidth: 120 }}
          >
            <span className="relative z-10">LIQUIDITY</span>
            {/* Эффект ржавых пятен */}
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-900 rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute bottom-1 left-2 w-3 h-1 bg-red-900 opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
          </Link>
          <div className="connect-wallet-wrapper" style={{ minWidth: 180 }}>
            <ConnectButton />
          </div>
        </div>
      </div>
      
      {/* Глобальные стили для кнопки кошелька */}
      <style jsx global>{`
        .connect-wallet-wrapper [data-rk] button {
          background: linear-gradient(45deg, #500, #000) !important;
          border: 2px solid #800 !important;
          color: #f55 !important;
          box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3) !important;
          transition: all 0.4s ease !important;
          border-radius: 6px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          padding: 0.75rem 1.5rem !important;
        }
        
        .connect-wallet-wrapper [data-rk] button:hover {
          background: linear-gradient(45deg, #700, #500) !important;
          border-color: #a00 !important;
          color: #f88 !important;
          box-shadow: 0 6px 16px rgba(255, 0, 0, 0.5) !important;
          transform: translateY(-1px) !important;
        }

        /* Анимация мерцания для всего хедера */
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            opacity: 1;
          }
          20%, 22%, 24%, 55% {
            opacity: 0.7;
          }
        }
        header {
          animation: flicker 10s infinite;
        }
      `}</style>
    </header>
  );
}