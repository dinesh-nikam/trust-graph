import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import {
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
  Menu,
  X,
  LayoutGrid,
  LogOut,
  FileCheck,
} from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { MONAD_TESTNET_CHAIN_ID, getExplorerAddressUrl } from '../../lib/blockchain/chain';
import { BrandMark } from '../ui/BrandMark';
import { trustGraphService } from '../../services/trustGraphService';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({
    address,
    chainId: MONAD_TESTNET_CHAIN_ID,
  });
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [searchQuery, setSearchQuery] = useState('');
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [appMode, setAppMode] = useState<'LIVE' | 'DEMO'>(() => trustGraphService.getMode());
  const walletMenuRef = useRef<HTMLDivElement>(null);

  const isWrongNetwork = isConnected && chainId !== MONAD_TESTNET_CHAIN_ID;

  useEffect(() => {
    const onStorage = () => setAppMode(trustGraphService.getMode());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsWalletMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
        setIsWalletMenuOpen(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.trim();

    if (/^\d+$/.test(clean)) {
      navigate(`/verify/${clean}`);
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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Overview', to: '/', match: '/', icon: LayoutGrid },
    { label: 'Submit Work', to: '/submit', match: '/submit', icon: FileCheck },
    { label: 'Trust Profile', to: address ? `/profile/${address}` : '/', match: '/profile', icon: UserCheck },
    { label: 'Trust Graph', to: address ? `/graph/${address}` : '/', match: '/graph', icon: Share2 },
    { label: 'Issue Attestation', to: '/issue', match: '/issue', icon: PlusCircle },
    { label: 'Inspect Claim', to: '/verify', match: '/verify', icon: ShieldCheck },
  ];

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || isMobileOpen
          ? 'bg-background/80 backdrop-blur-xl border-b border-white/[0.07]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          <div className="flex items-center gap-4 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0" aria-label="TrustGraph home">
              <BrandMark className="h-8 w-8 transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-[15px] tracking-tight text-neutral-50">TrustGraph</span>
                <span className="text-[10px] text-neutral-500 font-mono tracking-wider mt-1 hidden sm:block">
                  Monad Verification Registry
                </span>
              </div>
            </Link>

            {isWrongNetwork ? (
              <button
                onClick={() => switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })}
                disabled={isSwitching}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/70 border border-amber-600/60 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                title="Click to switch to Monad Testnet"
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>Wrong Network — Switch to Monad</span>
              </button>
            ) : (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.07] text-[11px] font-mono">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-neutral-500">Monad</span>
                <span className="text-neutral-200">10143</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const next = appMode === 'LIVE' ? 'DEMO' : 'LIVE';
                trustGraphService.setMode(next);
                setAppMode(next);
              }}
              title="Toggle between Live Monad Testnet and Local Sandbox fixtures"
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                appMode === 'LIVE'
                  ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/70 border-amber-600/60 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${appMode === 'LIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{appMode === 'LIVE' ? 'Mode: Live' : 'Mode: Demo'}</span>
            </button>
          </div>

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5 text-[13px] font-medium">
            {navItems.map((item) => {
              const active = isActive(item.match);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative px-3 py-2 rounded-lg transition-colors ${
                    active ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-50 hover:bg-white/[0.04]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1/2 -bottom-[13px] h-[2px] w-6 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(41,233,191,0.8)]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative hidden xl:block w-56" role="search">
              <label htmlFor="nav-search" className="sr-only">Search wallet address or claim ID</label>
              <input
                id="nav-search"
                type="text"
                placeholder="Search 0x... or Claim #1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg py-2 pl-8 pr-3 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 focus:bg-white/[0.05] transition-all font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
            </form>

            <div className="relative" ref={walletMenuRef}>
              {isConnected && address ? (
                <>
                  <button
                    onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                    aria-expanded={isWalletMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs font-mono text-neutral-200 hover:border-white/[0.16] hover:bg-white/[0.05] transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full ${isWrongNetwork ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden="true" />
                    <span>{shortenAddress(address)}</span>
                    <ChevronDown className={`h-3 w-3 text-neutral-400 transition-transform ${isWalletMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {isWalletMenuOpen && (
                    <div role="menu" className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-white/[0.08] shadow-float py-1.5 z-50 animate-drawer-in">
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                          <span>Connected Wallet</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                            isWrongNetwork ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {isWrongNetwork ? 'Wrong Network' : 'Monad 10143'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-neutral-200 truncate">{address}</span>
                          <button
                            onClick={() => copyAddress(address)}
                            className="p-1 hover:bg-white/[0.06] rounded-md text-neutral-400 hover:text-white transition-colors"
                            aria-label="Copy address"
                          >
                            {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 pt-2 border-t border-white/[0.04]">
                          <span>Balance:</span>
                          <span className="font-mono text-emerald-400 font-medium">
                            {balanceData ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : '0.0000 MON'}
                          </span>
                        </div>
                      </div>

                      {isWrongNetwork && (
                        <div className="p-2 border-b border-white/[0.06]">
                          <button
                            onClick={() => {
                              switchChain({ chainId: MONAD_TESTNET_CHAIN_ID });
                              setIsWalletMenuOpen(false);
                            }}
                            disabled={isSwitching}
                            className="w-full text-center px-2 py-2 bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 border border-amber-700 text-xs font-medium rounded-lg transition-colors"
                          >
                            Switch to Monad Testnet (10143)
                          </button>
                        </div>
                      )}

                      {[
                        { to: `/profile/${address}`, label: 'My Trust Profile', icon: UserCheck },
                        { to: `/graph/${address}`, label: 'My Trust Graph', icon: Share2 },
                        { to: '/issue', label: 'Issue Attestation', icon: PlusCircle },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          role="menuitem"
                          to={item.to}
                          onClick={() => setIsWalletMenuOpen(false)}
                          className="flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg text-xs text-neutral-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                        >
                          <item.icon className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      ))}

                      <div className="my-1.5 hairline" />

                      <a
                        role="menuitem"
                        href={getExplorerAddressUrl(address)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg text-xs text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                        <span>View on Monad Explorer</span>
                      </a>

                      <button
                        role="menuitem"
                        onClick={() => {
                          disconnect();
                          setIsWalletMenuOpen(false);
                        }}
                        className="w-[calc(100%-12px)] mx-1.5 text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="btn-primary !px-3.5 !py-2 !text-xs !rounded-lg"
                >
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen((v) => !v)}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-nav"
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-200 hover:bg-white/[0.06] transition-colors"
            >
              {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileOpen && (
        <div
          id="mobile-nav"
          className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-background/95 backdrop-blur-xl border-t border-white/[0.06] overflow-y-auto animate-drawer-in"
        >
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <form onSubmit={handleSearchSubmit} className="relative" role="search">
              <label htmlFor="mobile-search" className="sr-only">Search wallet address or claim ID</label>
              <input
                id="mobile-search"
                type="text"
                placeholder="Search 0x... or Claim #1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 font-mono"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" aria-hidden="true" />
            </form>

            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {navItems.map((item, i) => {
                const active = isActive(item.match);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`animate-fade-up flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors ${
                      active
                        ? 'bg-emerald-400/[0.08] text-neutral-50 border border-emerald-400/20'
                        : 'text-neutral-300 border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-neutral-500'}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-500">Network</span>
              {isWrongNetwork ? (
                <button
                  onClick={() => switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })}
                  disabled={isSwitching}
                  className="flex items-center gap-1.5 text-amber-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Switch to Monad Testnet
                </button>
              ) : (
                <span className="flex items-center gap-2 text-neutral-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Monad Testnet · 10143
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
