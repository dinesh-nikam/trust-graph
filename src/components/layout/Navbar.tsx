import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { 
  GitGraph, 
  Search, 
  ChevronDown, 
  Wallet, 
  PlusCircle, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Cpu
} from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { MONAD_TESTNET_CHAIN_ID, getExplorerAddressUrl } from '../../lib/blockchain/chain';
import { DEMO_WALLETS } from '../../lib/contract/config';
import { trustGraphService } from '../../services/trustGraphService';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [searchQuery, setSearchQuery] = useState('');
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [mode, setMode] = useState<'LIVE' | 'DEMO'>(trustGraphService.getMode());

  const isWrongNetwork = isConnected && chainId !== MONAD_TESTNET_CHAIN_ID;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.trim();

    // If numeric, navigate to verification detail
    if (/^\d+$/.test(clean)) {
      navigate(`/verify/${clean}`);
    } else if (clean.startsWith('0x') && clean.length > 20) {
      navigate(`/profile/${clean}`);
    } else if (clean.toLowerCase() === 'sarah' || clean.toLowerCase() === 'developer') {
      navigate(`/profile/${DEMO_WALLETS.DEVELOPER.address}`);
    } else if (clean.toLowerCase() === 'reviewer') {
      navigate(`/profile/${DEMO_WALLETS.REVIEWER.address}`);
    } else if (clean.toLowerCase() === 'alex' || clean.toLowerCase() === 'organizer') {
      navigate(`/profile/${DEMO_WALLETS.ORGANIZER.address}`);
    } else {
      navigate(`/profile/${clean}`);
    }
    setSearchQuery('');
  };

  const copyAddress = (addrToCopy: string) => {
    navigator.clipboard.writeText(addrToCopy);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const toggleMode = () => {
    const nextMode = mode === 'LIVE' ? 'DEMO' : 'LIVE';
    setMode(nextMode);
    trustGraphService.setMode(nextMode);
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Network */}
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors shadow-sm">
                <GitGraph className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-white group-hover:text-neutral-200 transition-colors">
                  TrustGraph
                </span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider">
                  Monad Verification Registry
                </span>
              </div>
            </Link>

            {/* Network Pill / Wrong Network Warning */}
            {isWrongNetwork ? (
              <button
                onClick={() => switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })}
                disabled={isSwitching}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-600/60 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                title="Click to switch to Monad Testnet"
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>Wrong Network — Switch to Monad</span>
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-neutral-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-neutral-400">Monad:</span>
                <span className="text-neutral-200 font-medium">10143</span>
              </div>
            )}

            {/* Demo / Live Sandbox Toggle Pill */}
            <button
              onClick={toggleMode}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
                mode === 'LIVE'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
              title="Toggle between Live Monad Testnet and Sandbox Demo mode"
            >
              <Cpu className="h-2.5 w-2.5 text-neutral-400" />
              <span>Mode:</span>
              <strong className={mode === 'LIVE' ? 'text-emerald-300' : 'text-neutral-300'}>
                {mode === 'LIVE' ? 'LIVE MONAD' : 'DEMO SANDBOX'}
              </strong>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isActive('/') && location.pathname === '/'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Overview
            </Link>
            <Link
              to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                isActive('/profile')
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-neutral-400" />
              <span>Trust Profile</span>
            </Link>
            <Link
              to={`/graph/${DEMO_WALLETS.DEVELOPER.address}`}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                isActive('/graph')
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Share2 className="h-3.5 w-3.5 text-neutral-400" />
              <span>Trust Graph</span>
            </Link>
            <Link
              to="/issue"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                isActive('/issue')
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Issue Attestation</span>
            </Link>
            <Link
              to="/verify/1"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                isActive('/verify')
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
              <span>Inspect Claim</span>
            </Link>
          </nav>

          {/* Right Controls: Search, Demo Wallets, and Connect */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search */}
            <form onSubmit={handleSearchSubmit} className="relative hidden xl:block w-52">
              <input
                type="text"
                placeholder="Search 0x... or Claim #1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/90 border border-neutral-800 rounded-md py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
            </form>

            {/* Demo Wallets Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 rounded-md transition-colors"
                title="Quick demo personas"
              >
                <span className="hidden sm:inline text-neutral-400 text-[11px]">Personas:</span>
                <span className="font-mono text-neutral-200">Demo</span>
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    Demo Identities (AGENTS.md)
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/profile/${DEMO_WALLETS.DEVELOPER.address}`);
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-xs transition-colors"
                  >
                    <div className="font-medium text-neutral-200">1. Developer (Subject)</div>
                    <div className="text-[11px] text-neutral-400">Sarah • Inspect claims, graph & evidence</div>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/issue');
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-xs transition-colors border-t border-neutral-800/60"
                  >
                    <div className="font-medium text-neutral-200">2. Reviewer (Authorized Issuer)</div>
                    <div className="text-[11px] text-neutral-400">Issue CONTRACT_DEPLOYED on Monad</div>
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/profile/${DEMO_WALLETS.ORGANIZER.address}`);
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-xs transition-colors border-t border-neutral-800/60"
                  >
                    <div className="font-medium text-neutral-200">3. Organizer (Admin / Owner)</div>
                    <div className="text-[11px] text-neutral-400">Alex • Registry administration</div>
                  </button>
                </div>
              )}
            </div>

            {/* Wallet Connect & State Detection */}
            <div className="relative">
              {isConnected && address ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-xs font-mono text-neutral-200 hover:border-neutral-700 transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full ${isWrongNetwork ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                    <span>{shortenAddress(address)}</span>
                    <ChevronDown className="h-3 w-3 text-neutral-400" />
                  </button>

                  {isWalletMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl py-1 z-50">
                      <div className="px-3 py-2.5 border-b border-neutral-800">
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-sans mb-1">
                          <span>Connected Wallet</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            isWrongNetwork ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {isWrongNetwork ? 'Wrong Network' : 'Monad 10143'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-xs font-mono text-neutral-200 truncate">{address}</span>
                          <button
                            onClick={() => copyAddress(address)}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
                            title="Copy Address"
                          >
                            {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isWrongNetwork && (
                        <div className="p-2 border-b border-neutral-800 bg-amber-950/30">
                          <button
                            onClick={() => {
                              switchChain({ chainId: MONAD_TESTNET_CHAIN_ID });
                              setIsWalletMenuOpen(false);
                            }}
                            disabled={isSwitching}
                            className="w-full text-center px-2 py-1.5 bg-amber-900/60 hover:bg-amber-800/60 text-amber-200 border border-amber-700 text-xs font-medium rounded transition-colors"
                          >
                            Switch to Monad Testnet (10143)
                          </button>
                        </div>
                      )}

                      <Link
                        to={`/profile/${address}`}
                        onClick={() => setIsWalletMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-neutral-400" />
                        <span>My Trust Profile</span>
                      </Link>

                      <Link
                        to={`/graph/${address}`}
                        onClick={() => setIsWalletMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5 text-neutral-400" />
                        <span>My Trust Graph</span>
                      </Link>

                      <Link
                        to="/issue"
                        onClick={() => setIsWalletMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Issue Attestation</span>
                      </Link>

                      <a
                        href={getExplorerAddressUrl(address)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors border-t border-neutral-800"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                          <span>View on Monad Explorer</span>
                        </span>
                      </a>

                      <button
                        onClick={() => {
                          disconnect();
                          setIsWalletMenuOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-neutral-800/80 transition-colors border-t border-neutral-800"
                      >
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    const connector = connectors[0];
                    if (connector) {
                      connect({ connector });
                    }
                  }}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-md transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
