import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-neutral-700 selection:text-white">
      {/* Top Testnet Notice Banner */}
      <div className="bg-neutral-900 border-b border-neutral-800 text-[11px] py-1.5 px-4 text-center text-neutral-400 font-mono flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        <span>
          Monad Testnet Hackathon MVP Foundation: Interactive verified proofs &amp; simulated off-chain manifest pipeline.
        </span>
      </div>

      <Navbar />

      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
