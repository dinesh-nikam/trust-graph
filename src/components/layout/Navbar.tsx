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
  Command,
  Flame,
} from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { MONAD_TESTNET_CHAIN_ID, getExplorerAddressUrl } from '../../lib/blockchain/chain';
import { DEMO_WALLETS } from '../../lib/contract/config';
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [appMode, setAppMode] = useState<'LIVE' | 'DEMO'>(() => trustGraphService.getMode());

  const walletMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalSearchInputRef = useRef<HTMLInputElement>(null);

  const isWrongNetwork = isConnected && chainId !== MONAD_TESTNET_CHAIN_ID;
  const defaultAddress = address || DEMO_WALLETS.DEVELOPER.address;

  useEffect(() => {
    const onStorage = () => setAppMode(trustGraphService.getMode());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsWalletMenuOpen(false);
    setIsSearchModalOpen(false);
  }, [location.pathname]);

  // Keyboard shortcut: Cmd+K / Ctrl+K or '/' to focus search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        if (window.innerWidth >= 1280) {
          searchInputRef.current?.focus();
        } else {
          setIsSearchModalOpen(true);
        }
      } else if (e.key === 'Escape') {
        setIsMobileOpen(false);
        setIsWalletMenuOpen(false);
        setIsSearchModalOpen(false);
        searchInputRef.current?.blur();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => modalSearchInputRef.current?.focus(), 50);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    document.body.style.overflow = (isMobileOpen || isSearchModalOpen) ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, isSearchModalOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;

    // Normalizing prefixes such as "Claim #1", "#1", "sub-1"
    const cleanNum = clean.replace(/^claim\s*#?/i, '').replace(/^#/, '').trim();

    if (/^\d+$/.test(cleanNum)) {
      navigate(`/verify/${cleanNum}`);
    } else if (cleanNum.toLowerCase().startsWith('sub-') || cleanNum.toLowerCase().startsWith('att-')) {
      navigate(`/verify/${cleanNum}`);
    } else {
      navigate(`/profile/${clean}`);
    }
    setSearchQuery('');
    setIsSearchModalOpen(false);
    searchInputRef.current?.blur();
  };

  const copyAddress = (addrToCopy: string) => {
    navigator.clipboard.writeText(addrToCopy);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const isActive = (match: string | string[]) => {
    if (Array.isArray(match)) {
      return match.some((m) => (m === '/' ? location.pathname === '/' : location.pathname.startsWith(m)));
    }
    if (match === '/') return location.pathname === '/';
    return location.pathname.startsWith(match);
  };

  const toggleMode = () => {
    const next = appMode === 'LIVE' ? 'DEMO' : 'LIVE';
    trustGraphService.setMode(next);
    setAppMode(next);
  };

  const navItems = [
    // { label: 'Overview', to: '/', match: '/', icon: LayoutGrid },
    { label: 'Submit Work', to: '/submit', match: '/submit', icon: FileCheck },
    { label: 'Trust Profile', to: `/profile/${defaultAddress}`, match: ['/profile', '/passport'], icon: UserCheck },
    { label: 'Trust Graph', to: `/graph/${defaultAddress}`, match: '/graph', icon: Share2 },
    { label: 'Issue Attestation', to: '/issue', match: '/issue', icon: PlusCircle },
    { label: 'Inspect Claim', to: '/verify', match: ['/verify', '/proof'], icon: ShieldCheck },
  ];

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled || isMobileOpen
          ? 'bg-neutral-950/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.8)]'
          : 'bg-background/60 backdrop-blur-md border-b border-white/[0.05]'
          }`}
      >
        {/* Subtle cyber-glow top hairline */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 lg:gap-5">

            {/* Zone 1: Left Brand & Ecosystem Badge */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Link
                to="/"
                className="flex items-center gap-2.5 group focus:outline-none"
                aria-label="TrustGraph homepage"
              >
                <div className="relative">
                  <div className="absolute -inset-1 rounded-xl bg-emerald-400/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <BrandMark className="relative h-8 w-8 transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-[15px] tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    TrustGraph
                  </span>
                  <span className="text-[5px] text-neutral-400 font-mono tracking-wider mt-1 hidden sm:block">
                    Monad Verification Registry
                  </span>
                </div>
              </Link>

              {/* Monad Network Live Badge */}
              {/* <div className="hidden sm:flex items-center">
                <span className="h-4 w-[1px] bg-white/[0.1] mr-3" aria-hidden="true" />
                {isWrongNetwork ? (
                  <button
                    onClick={() => switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })}
                    disabled={isSwitching}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-[11px] font-mono text-amber-300 hover:bg-amber-500/25 hover:border-amber-500/60 transition-all duration-200"
                    title="Click to switch wallet network to Monad Testnet"
                  >
                    <AlertTriangle className="h-3 w-3 text-amber-400 animate-pulse" />
                    <span>Wrong Net · Switch</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-neutral-400">Monad</span>
                    <span className="text-emerald-300 font-semibold">10143</span>
                 
                  </div>
                )}
              </div> */}
            </div>

            {/* Zone 2: Center Primary Navigation (Capsule Nav Floating Island) */}
            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex items-center p-1 bg-white/[0.03] border border-white/[0.08] rounded-full backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] shrink-0"
            >
              {navItems.map((item) => {
                const active = isActive(item.match);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`relative whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${active
                      ? 'bg-white/[0.1] text-white font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/[0.1]'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(41,233,191,0.9)]"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Zone 3: Right Utility Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

              {/* Desktop Command Search Box */}
              <form
                onSubmit={handleSearchSubmit}
                className="relative hidden xl:block w-48 2xl:w-56 transition-all duration-300 focus-within:w-64"
                role="search"
              >
                <label htmlFor="nav-search-input" className="sr-only">
                  Search wallet address or claim ID
                </label>
                <input
                  id="nav-search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search 0x... or #1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-full py-1.5 pl-8 pr-12 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-400/20 transition-all font-mono shadow-inner"
                />
                <Search
                  className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500 pointer-events-none"
                  aria-hidden="true"
                />
                <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[9px] font-mono text-neutral-400 bg-white/[0.06] border border-white/[0.1] rounded select-none pointer-events-none">
                  ⌘K
                </kbd>
              </form>

              {/* Tablet Search Trigger Button */}
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="xl:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] transition-all"
                title="Search claims or wallets (⌘K)"
                aria-label="Open search dialog"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Mode Toggle Switch Pill (Live Testnet vs Demo Sandbox) */}
              <button
                type="button"
                onClick={toggleMode}
                title={`Current Environment: ${appMode === 'LIVE' ? 'Live Monad Testnet' : 'Local Sandbox Fixtures'}. Click to toggle.`}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-mono border transition-all duration-200 ${appMode === 'LIVE'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400/70 shadow-[0_0_12px_rgba(41,233,191,0.15)]'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60 hover:border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${appMode === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                />
                <span className="font-semibold tracking-tight">{appMode === 'LIVE' ? 'LIVE' : 'DEMO'}</span>
                <span className="hidden sm:inline text-[9px] opacity-75 uppercase tracking-wider">
                  {appMode === 'LIVE' ? 'TESTNET' : 'SANDBOX'}
                </span>
              </button>

              {/* Wallet Connection / Account Details Button */}
              <div className="relative" ref={walletMenuRef}>
                {isConnected && address ? (
                  <>
                    <button
                      onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                      aria-expanded={isWalletMenuOpen}
                      aria-haspopup="menu"
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.07] rounded-full text-xs font-mono text-neutral-200 transition-all shadow-sm"
                    >
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${isWrongNetwork ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                          }`}
                        aria-hidden="true"
                      />
                      <span className="font-medium tracking-tight">{shortenAddress(address)}</span>
                      <ChevronDown
                        className={`h-3 w-3 text-neutral-400 transition-transform duration-200 ${isWalletMenuOpen ? 'rotate-180' : ''
                          }`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Premium Floating Wallet Menu */}
                    {isWalletMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-2.5 w-76 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-white/[0.1] shadow-float p-2.5 z-50 animate-drawer-in divide-y divide-white/[0.06]"
                      >
                        <div className="px-3 py-2.5 pb-3">
                          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                            <span className="font-medium">Connected Account</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${isWrongNetwork
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                }`}
                            >
                              {isWrongNetwork ? 'Wrong Network' : 'Monad 10143'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-2.5 py-1.5">
                            <span className="text-xs font-mono text-neutral-200 truncate">{address}</span>
                            <button
                              onClick={() => copyAddress(address)}
                              className="p-1 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors shrink-0"
                              aria-label="Copy address"
                              title="Copy full address"
                            >
                              {copiedAddress ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2.5 pt-2 border-t border-white/[0.04]">
                            <span>Monad Balance:</span>
                            <span className="font-mono text-emerald-400 font-semibold">
                              {balanceData ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : '0.0000 MON'}
                            </span>
                          </div>
                        </div>

                        {isWrongNetwork && (
                          <div className="p-2">
                            <button
                              onClick={() => {
                                switchChain({ chainId: MONAD_TESTNET_CHAIN_ID });
                                setIsWalletMenuOpen(false);
                              }}
                              disabled={isSwitching}
                              className="w-full text-center px-3 py-2 bg-amber-900/60 hover:bg-amber-800/70 text-amber-200 border border-amber-700/80 text-xs font-semibold rounded-xl transition-all shadow-sm"
                            >
                              Switch to Monad Testnet (10143)
                            </button>
                          </div>
                        )}

                        <div className="py-1">
                          {[
                            { to: `/profile/${address}`, label: 'My Trust Profile', icon: UserCheck },
                            { to: `/graph/${address}`, label: 'My Trust Graph', icon: Share2 },
                            { to: '/submit', label: 'Submit New Work', icon: FileCheck },
                            { to: '/issue', label: 'Issue Attestation', icon: PlusCircle },
                          ].map((item) => (
                            <Link
                              key={item.label}
                              role="menuitem"
                              to={item.to}
                              onClick={() => setIsWalletMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                            >
                              <item.icon className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>

                        <div className="pt-1">
                          <a
                            role="menuitem"
                            href={getExplorerAddressUrl(address)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200 transition-colors"
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
                            className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Disconnect</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="btn-primary !px-3.5 sm:!px-4 !py-1.5 !text-xs !rounded-full shadow-[0_0_20px_rgba(41,233,191,0.25)] hover:shadow-[0_0_25px_rgba(41,233,191,0.4)] transition-all shrink-0"
                  >
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                  </button>
                )}
              </div>

              {/* Mobile Drawer Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileOpen((v) => !v)}
                aria-expanded={isMobileOpen}
                aria-controls="mobile-nav-panel"
                aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.08] text-neutral-200 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Fullscreen Glass Navigation Drawer */}
        {isMobileOpen && (
          <div
            id="mobile-nav-panel"
            className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-neutral-950/95 backdrop-blur-2xl border-t border-white/[0.08] overflow-y-auto animate-drawer-in"
          >
            <div className="px-4 sm:px-6 py-6 space-y-6 max-w-lg mx-auto">

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="relative" role="search">
                <label htmlFor="mobile-nav-search" className="sr-only">
                  Search wallet address or claim ID
                </label>
                <input
                  id="mobile-nav-search"
                  type="text"
                  placeholder="Search 0x... or Claim #1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 font-mono shadow-inner"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" aria-hidden="true" />
              </form>

              {/* Mobile Nav Links */}
              <nav aria-label="Mobile Navigation" className="flex flex-col gap-1.5">
                {navItems.map((item, i) => {
                  const active = isActive(item.match);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      style={{ animationDelay: `${i * 35}ms` }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                        ? 'bg-emerald-400/10 text-white border border-emerald-400/30 shadow-sm'
                        : 'text-neutral-300 border border-transparent hover:bg-white/[0.04] hover:text-white'
                        }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-neutral-400'}`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Environment & Network Status Card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-sans">Network</span>
                  {isWrongNetwork ? (
                    <button
                      onClick={() => switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })}
                      disabled={isSwitching}
                      className="flex items-center gap-1.5 text-amber-300 font-semibold"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Switch to Monad 10143
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-neutral-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                      Monad Testnet (10143)
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-neutral-400 font-sans">Execution Mode</span>
                  <button
                    type="button"
                    onClick={toggleMode}
                    className={`px-2.5 py-1 rounded-full text-[11px] border font-mono ${appMode === 'LIVE'
                      ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                      : 'bg-amber-950/70 border-amber-600/60 text-amber-300'
                      }`}
                  >
                    {appMode === 'LIVE' ? 'LIVE TESTNET' : 'DEMO FIXTURES'}
                  </button>
                </div>
              </div>

              {/* Wallet Info for Mobile if Connected */}
              {isConnected && address && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Connected Wallet</span>
                    <button
                      onClick={() => copyAddress(address)}
                      className="flex items-center gap-1 font-mono text-neutral-300 hover:text-white"
                    >
                      {copiedAddress ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedAddress ? 'Copied' : shortenAddress(address)}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-neutral-400">Balance</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {balanceData ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : '0.0000 MON'}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="w-full mt-2 py-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs font-semibold hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Quick Search Modal (Triggered via ⌘K or Tablet Search Icon) */}
      {isSearchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick search modal"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-neutral-950 border border-white/[0.12] shadow-2xl p-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400" />
              <input
                ref={modalSearchInputRef}
                type="text"
                placeholder="Search by wallet address (0x...) or Claim #1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3 pl-10 pr-10 text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
              />
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="absolute right-3 top-3 text-neutral-500 hover:text-white"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-500">
              <div className="flex items-center gap-2">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/verify/1');
                    setIsSearchModalOpen(false);
                  }}
                  className="font-mono text-emerald-400 hover:underline"
                >
                  Claim #1
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/profile/${DEMO_WALLETS.DEVELOPER.address}`);
                    setIsSearchModalOpen(false);
                  }}
                  className="font-mono text-emerald-400 hover:underline"
                >
                  Sarah (Demo Dev)
                </button>
              </div>
              <span className="font-mono">ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
