import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccount, useBalance, useSwitchChain, useConnect, useDisconnect } from 'wagmi';
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
  Menu,
  X,
  LayoutGrid,
  LogOut,
  FileCheck,
  Cpu,
} from 'lucide-react';
import { formatUnits } from 'viem';
import { shortenAddress } from '../../utils/formatters';
import { MONAD_TESTNET_CHAIN_ID, getExplorerAddressUrl } from '../../lib/blockchain/chain';
import { DEMO_WALLETS } from '../../lib/contract/config';
import { translateTxError } from '../../lib/blockchain/errors';
import { cn } from '../../utils/cn';
import { trustGraphService } from '../../services/trustGraphService';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({
    address,
    chainId: MONAD_TESTNET_CHAIN_ID,
  });
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { connect, connectors, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [searchQuery, setSearchQuery] = useState('');
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showConnectHint, setShowConnectHint] = useState(false);
  const [appMode, setAppMode] = useState<'LIVE' | 'DEMO'>(() => trustGraphService.getMode());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleStorage = () => setAppMode(trustGraphService.getMode());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleMode = () => {
    const next = appMode === 'LIVE' ? 'DEMO' : 'LIVE';
    trustGraphService.setMode(next);
    setAppMode(next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => modalSearchInputRef.current?.focus(), 50);
    }
  }, [isSearchModalOpen]);

  const isWrongNetwork = isConnected && chainId !== MONAD_TESTNET_CHAIN_ID;
  const hasInjectedWallet = connectors.length > 0;
  const connectMessage = !hasInjectedWallet
    ? 'No EVM wallet detected. Install an EIP-6963 browser wallet (e.g. MetaMask, Rabby) to connect.'
    : connectError
      ? translateTxError(connectError)
      : null;

  const handleConnect = () => {
    if (!hasInjectedWallet) {
      setShowConnectHint(true);
      return;
    }
    setShowConnectHint(false);
    connect({ connector: connectors[0] });
  };

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

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string, exact = false) =>
    cn(
      'relative px-2 py-1.5 text-[13px] transition-colors',
      (exact ? location.pathname === path : isActive(path))
        ? 'text-ink'
        : 'text-ink-muted hover:text-ink'
    );

  const ActiveDot = ({ active }: { active: boolean }) => (
    <span
      className={cn(
        'absolute left-2 right-2 -bottom-px h-px transition-opacity',
        active ? 'bg-primary opacity-100' : 'opacity-0'
      )}
      aria-hidden="true"
    />
  );

  const navItems = [
    // { label: 'Overview', to: '/', match: '/', icon: LayoutGrid },
    { label: 'Submit Work', to: '/submit', match: '/submit', icon: FileCheck },
    { label: 'Trust Profile', to: address ? `/profile/${address}` : `/profile/${DEMO_WALLETS.DEVELOPER.address}`, match: '/profile', icon: UserCheck },
    { label: 'Trust Graph', to: address ? `/graph/${address}` : `/graph/${DEMO_WALLETS.DEVELOPER.address}`, match: '/graph', icon: Share2 },
    { label: 'Issue Attestation', to: '/issue', match: '/issue', icon: PlusCircle },
    { label: 'Inspect Claim', to: '/verify/1', match: '/verify', icon: ShieldCheck },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-surface-border bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">

          {/* Logo & Network */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="h-8 w-8 corner-ticks flex items-center justify-center text-primary group-hover:text-primary-bright transition-colors" aria-hidden="true">
                <GitGraph className="h-4 w-4" />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-ink group-hover:text-primary-bright transition-colors">
                  TrustGraph
                </span>
                <span className="text-[9px] text-ink-dim font-mono uppercase tracking-widest-xl">
                  Evidence Verification Registry
                </span>
              </span>
            </Link>

            {isWrongNetwork ? (
              <button
                onClick={() => switchChain({ chainId: MONAD_TESTNET_CHAIN_ID })}
                disabled={isSwitching}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 hover:bg-amber-500/20 transition-colors"
                title="Click to switch to Monad Testnet"
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" aria-hidden="true" />
                <span>Wrong Network — Switch to Monad</span>
              </button>
            ) : (
              <span className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-surface-subtle border border-surface-border text-[10px] uppercase tracking-widest font-mono text-ink-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span>Monad</span>
                <span className="text-emerald-400 font-medium">10143</span>
              </span>
            )}

            {/* Data-source indicator (non-interactive).
                Records always come from local fixtures — no on-chain read path
                exists yet, so a "LIVE" toggle would misrepresent the data. */}
            <span
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-widest font-mono border bg-surface-subtle text-ink-dim border-surface-border"
              title="Records are sourced from local fixture data, not from Monad chain state."
            >
              <Cpu className="h-2.5 w-2.5 text-ink-dim" aria-hidden="true" />
              <strong className="text-ink-muted">LOCAL FIXTURES</strong>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            <Link to="/" className={navLinkClass('/', true)}>
              Overview
              <ActiveDot active={location.pathname === '/'} />
            </Link>
            <Link to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`} className={cn(navLinkClass('/profile'), 'flex items-center gap-1.5')}>
              <UserCheck className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
              <span>Trust Profile</span>
              <ActiveDot active={isActive('/profile')} />
            </Link>
            <Link to={`/graph/${DEMO_WALLETS.DEVELOPER.address}`} className={cn(navLinkClass('/graph'), 'flex items-center gap-1.5')}>
              <Share2 className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
              <span>Trust Graph</span>
              <ActiveDot active={isActive('/graph')} />
            </Link>
            <Link to="/issue" className={cn(navLinkClass('/issue'), 'flex items-center gap-1.5')}>
              <PlusCircle className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
              <span>Issue Attestation</span>
              <ActiveDot active={isActive('/issue')} />
            </Link>
            <Link to="/verify/1" className={cn(navLinkClass('/verify'), 'flex items-center gap-1.5')}>
              <ShieldCheck className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
              <span>Inspect Claim</span>
              <ActiveDot active={isActive('/verify')} />
            </Link>
          </nav>

          {/* Right Controls: Search, Demo Wallets, and Connect */}
          <div className="flex items-center gap-2">
            {/* Quick Search */}
            <form onSubmit={handleSearchSubmit} className="relative hidden xl:block w-44" role="search">
              <input
                ref={searchInputRef}
                id="nav-search"
                type="text"
                placeholder="0x… or Claim #1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search by address or claim number"
                className="w-full bg-surface-subtle border border-surface-border py-1.5 pl-8 pr-3 text-xs text-ink placeholder-ink-dim focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
            </form>

            {/* Demo Wallets Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                aria-expanded={isDemoMenuOpen}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-subtle border border-surface-border hover:border-surface-border-strong text-xs text-ink-muted transition-colors"
                title="Quick demo personas"
              >
                <span className="hidden 2xl:inline text-ink-dim text-[11px]">Personas:</span>
                <span className="font-mono text-ink">Demo</span>
                <ChevronDown className="h-3 w-3 text-ink-dim" aria-hidden="true" />
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-surface-raised border border-surface-border-strong shadow-card py-1.5 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-mono text-ink-dim uppercase tracking-widest border-b border-surface-border">
                    Demo Identities
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/profile/${DEMO_WALLETS.DEVELOPER.address}`);
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-hover text-xs transition-colors"
                  >
                    <div className="font-medium text-ink">1. Developer (Subject)</div>
                    <div className="text-[11px] text-ink-dim">Sarah • Inspect claims, graph & evidence</div>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/issue');
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-hover text-xs transition-colors border-t border-surface-border"
                  >
                    <div className="font-medium text-ink">2. Reviewer (Authorized Issuer)</div>
                    <div className="text-[11px] text-ink-dim">Issue CONTRACT_DEPLOYED on Monad</div>
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/profile/${DEMO_WALLETS.ORGANIZER.address}`);
                      setIsDemoMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-hover text-xs transition-colors border-t border-surface-border"
                  >
                    <div className="font-medium text-ink">3. Organizer (Admin / Owner)</div>
                    <div className="text-[11px] text-ink-dim">Alex • Registry administration</div>
                  </button>
                </div>
              )}
            </div>

            {/* Wallet Connect & State Detection */}
            <div className="relative">
              {isConnected && address ? (
                <>
                  <button
                    onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                    aria-expanded={isWalletMenuOpen}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle border border-surface-border font-mono text-xs text-ink hover:border-surface-border-strong transition-colors"
                  >
                    <span className={cn('h-2 w-2 rounded-full', isWrongNetwork ? 'bg-amber-400' : 'bg-emerald-400')} aria-hidden="true" />
                    <span>{shortenAddress(address)}</span>
                    <ChevronDown className="h-3 w-3 text-ink-dim" aria-hidden="true" />
                  </button>

                  {isWalletMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface-raised border border-surface-border-strong shadow-card py-1 z-50">
                      <div className="px-3 py-2.5 border-b border-surface-border">
                        <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1">
                          <span>Connected Wallet</span>
                          <span className={cn(
                            'px-1.5 py-0.5 text-[10px] font-mono border',
                            isWrongNetwork
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          )}>
                            {isWrongNetwork ? 'Wrong Network' : 'Monad 10143'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-xs font-mono text-ink truncate">{address}</span>
                          <button
                            onClick={() => copyAddress(address)}
                            className="p-1 hover:bg-surface-hover text-ink-dim hover:text-ink transition-colors"
                            title="Copy Address"
                            aria-label="Copy wallet address"
                          >
                            {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 pt-2 border-t border-white/[0.04]">
                          <span>Balance:</span>
                          <span className="font-mono text-emerald-400 font-medium">
                            {balanceData ? `${parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ${balanceData.symbol}` : '0.0000 MON'}
                          </span>
                        </div>
                      </div>

                      {isWrongNetwork && (
                        <div className="p-2 border-b border-surface-border bg-amber-500/[0.06]">
                          <button
                            onClick={() => {
                              switchChain({ chainId: MONAD_TESTNET_CHAIN_ID });
                              setIsWalletMenuOpen(false);
                            }}
                            disabled={isSwitching}
                            className="w-full text-center px-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 text-xs font-medium transition-colors"
                          >
                            Switch to Monad Testnet (10143)
                          </button>
                        </div>
                      )}

                      <Link
                        to={`/profile/${address}`}
                        onClick={() => setIsWalletMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
                        <span>My Trust Profile</span>
                      </Link>

                      <Link
                        to={`/graph/${address}`}
                        onClick={() => setIsWalletMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
                        <span>My Trust Graph</span>
                      </Link>

                      <Link
                        to="/issue"
                        onClick={() => setIsWalletMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
                        <span>Issue Attestation</span>
                      </Link>

                      <a
                        href={getExplorerAddressUrl(address)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-ink-dim hover:bg-surface-hover hover:text-ink-muted transition-colors border-t border-surface-border"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
                        <span>View on Monad Explorer</span>
                      </a>

                      <button
                        role="menuitem"
                        onClick={() => {
                          disconnect();
                          setIsWalletMenuOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-surface-hover transition-colors border-t border-surface-border"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="relative">
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-ink hover:bg-white text-background font-medium text-xs transition-colors active:scale-95 disabled:opacity-60"
                  >
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isConnecting ? 'Connecting…' : 'Connect Wallet'}</span>
                  </button>

                  {showConnectHint && connectMessage && (
                    <div
                      role="alert"
                      className="absolute right-0 top-full mt-2 w-72 bg-surface-raised border border-status-pending/40 shadow-card p-3 text-[11px] text-ink-muted leading-relaxed z-50"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-status-pending shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{connectMessage}</span>
                      </div>
                    </div>
                  )}
                </div>
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
                      {balanceData ? `${parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ${balanceData.symbol}` : '0.0000 MON'}
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
