import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAccount, useSwitchChain } from 'wagmi';
import { 
  PlusCircle, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight,
  Info,
  Lock,
  Cpu,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { useIssueAttestation, useIssuerStatus } from '../hooks/useTrustGraph';
import { ClaimType } from '../types';
import { computeSha256, shortenAddress } from '../utils/formatters';
import { DEMO_WALLETS, MONAD_TESTNET_CHAIN_ID, getExplorerTxUrl } from '../lib/contract/config';

export const IssueAttestationPage: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { isAuthorized, isLoading: isCheckingAuth } = useIssuerStatus(address);
  const { issue, txStep, errorMessage, txHash, createdAttestation, reset } = useIssueAttestation();

  // Form states
  const [subject, setSubject] = useState<string>(DEMO_WALLETS.DEVELOPER.address);
  const [claimType, setClaimType] = useState<ClaimType>('CONTRACT_DEPLOYED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [manifestText, setManifestText] = useState('');
  const [evidenceHash, setEvidenceHash] = useState<`0x${string}` | ''>('');
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [expiryOption, setExpiryOption] = useState<'perpetual' | '1year' | '30days'>('perpetual');
  const [isLiveTx, setIsLiveTx] = useState(false);

  // Pre-fill demo templates based on claim type
  const loadDemoTemplate = (type: ClaimType) => {
    setClaimType(type);
    if (type === 'CONTRACT_DEPLOYED') {
      setTitle('Monad High-Throughput AMM Liquidity Router');
      setDescription('Verified deployment of parallelized swap router with zero storage conflict test benchmarks.');
      setEvidenceUrl('https://testnet.monadexplorer.com/address/0x4386926019A8B74431eBDeF7c2718E340621B903');
      setManifestText('Contract: 0x4386926019A8B74431eBDeF7c2718E340621B903\nChain: Monad Testnet (10143)\nBytecode verified against git commit: 8f421ca');
    } else if (type === 'CHALLENGE_COMPLETED') {
      setTitle('Monad Madness DeFi Benchmark: 10k TPS Finalist');
      setDescription('Reviewed technical benchmark submission reproducing 10,000 TPS under async execution simulator.');
      setEvidenceUrl('https://devpost.com/software/monad-parallel-amm');
      setManifestText('Challenge: Monad Madness DeFi Benchmark\nJury Score: 98/100\nExecution reproducibility confirmed.');
    } else {
      setTitle('Core revm Async Storage Pre-warm Patch');
      setDescription('Upstream pull request optimizing disk I/O cold storage reads by 32% under load.');
      setEvidenceUrl('https://github.com/monad-developers/node/pull/482');
      setManifestText('Repo: https://github.com/monad-developers/node/pull/482\nCommit: a812f04e1984\nMerged by core maintainer.');
    }
  };

  // Compute SHA-256 hash whenever manifest or URL changes
  useEffect(() => {
    let active = true;
    const calculate = async () => {
      const text = manifestText.trim() || evidenceUrl.trim();
      if (!text) {
        setEvidenceHash('');
        return;
      }
      setIsComputingHash(true);
      try {
        const hash = await computeSha256(text);
        if (active) setEvidenceHash(hash);
      } finally {
        if (active) setIsComputingHash(false);
      }
    };
    calculate();
    return () => {
      active = false;
    };
  }, [manifestText, evidenceUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !title.trim() || !evidenceUrl.trim()) return;

    let finalHash = evidenceHash;
    if (!finalHash) {
      finalHash = await computeSha256(manifestText.trim() || evidenceUrl.trim());
      setEvidenceHash(finalHash);
    }

    let expirySec = 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiryOption === '1year') {
      expirySec = now + 365 * 86400;
    } else if (expiryOption === '30days') {
      expirySec = now + 30 * 86400;
    }

    await issue({
      subject: subject.trim() as `0x${string}`,
      claimType,
      claimTitle: title.trim(),
      claimDescription: description.trim(),
      evidenceUrl: evidenceUrl.trim(),
      evidenceHash: finalHash,
      evidenceManifest: manifestText.trim() || evidenceUrl.trim(),
      expiry: expirySec,
      isLiveOnChain: isLiveTx && isConnected,
    });
  };

  const isWrongNetwork = isConnected && chainId !== MONAD_TESTNET_CHAIN_ID;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>AUTHORIZED ISSUER PORTAL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Issue Evidence-Backed Attestation
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
          Record a new claim on Monad after independently reviewing the developer&apos;s evidence.
          The blockchain anchors the cryptographic SHA-256 hash and issuer standing.
        </p>
      </div>

      {/* Reviewer Standing Warning / Status */}
      <div className="mb-8 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-neutral-200 mb-0.5">
                {isConnected ? (
                  <span>
                    Connected as: <strong className="font-mono text-white">{shortenAddress(address)}</strong>
                  </span>
                ) : (
                  <span>Wallet Not Connected (Operating in Demo Reviewer Sandbox)</span>
                )}
              </div>
              <div className="text-neutral-400 text-[11px] leading-relaxed">
                {isConnected ? (
                  isAuthorized ? (
                    <span className="text-emerald-400">
                      ✓ Recognized as an Authorized Issuer in the TrustGraph registry.
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      Notice: This wallet is not registered as an authorized issuer on the live contract. You can test in Demo Sandbox mode, or ask the organizer to call <code>approveIssuer</code>.
                    </span>
                  )
                ) : (
                  <span>
                    You can fill this form to test issuance in sandbox mode, or connect an authorized Monad testnet wallet.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDemoTemplate('CONTRACT_DEPLOYED')}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[11px] transition-colors"
            >
              Load Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {txStep === 'confirmed' && createdAttestation && (
        <div className="mb-8 p-6 rounded-xl bg-emerald-950/40 border border-emerald-800/80">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">
                Attestation Successfully Recorded!
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                Attestation #{createdAttestation.id} has been anchored. The public proof is inspectable immediately.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/verify/${createdAttestation.id}`}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>Inspect On-Chain Proof</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  to={`/profile/${createdAttestation.subject}`}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg border border-neutral-700 transition-colors"
                >
                  <span>View Subject Profile</span>
                </Link>

                <button
                  onClick={reset}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Issue Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {txStep === 'error' && (
        <div className="mb-8 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-rose-200">Issuance Failed:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Recipient / Subject */}
        <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            01. Subject Wallet
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Subject Address (Recipient) *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="0x..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-mono focus:border-neutral-600 focus:outline-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-neutral-500">Quick Fill:</span>
              <button
                type="button"
                onClick={() => setSubject(DEMO_WALLETS.DEVELOPER.address)}
                className="text-[11px] text-emerald-400 hover:underline font-mono"
              >
                Developer Sarah (0x3a48...)
              </button>
              {address && (
                <button
                  type="button"
                  onClick={() => setSubject(address)}
                  className="text-[11px] text-neutral-400 hover:underline font-mono ml-2"
                >
                  My Connected Address
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Claim Type & Details */}
        <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            02. Claim Type & Description
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Claim Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: 'CONTRACT_DEPLOYED', label: 'Contract Deployed', desc: 'Monad EVM contract' },
                { type: 'CHALLENGE_COMPLETED', label: 'Challenge Completed', desc: 'Hackathon or milestone' },
                { type: 'CONTRIBUTION_VERIFIED', label: 'Contribution Verified', desc: 'Commit or repository PR' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setClaimType(item.type as ClaimType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    claimType === item.type
                      ? 'bg-neutral-800/90 border-emerald-500/60 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{item.label}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Claim Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Production Streaming Payment Contract"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:border-neutral-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Reviewer Explanation / Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the scope of work reviewed and what the evidence establishes..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:border-neutral-600 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Evidence Manifest & Hashing */}
        <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            03. Evidence Manifest & Cryptographic Hash
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Evidence URL (Publicly Inspectable) *
            </label>
            <input
              type="url"
              required
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/... or https://testnet.monadexplorer.com/..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-mono focus:border-neutral-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Canonical Evidence Manifest
            </label>
            <textarea
              rows={3}
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              placeholder="Specific commit, transaction hash, contract address, or test run..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-mono focus:border-neutral-600 focus:outline-none"
            />
          </div>

          {/* Computed SHA-256 Anchor */}
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1 font-mono">
              <span className="flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Deterministic SHA-256 Hash (Stored On-Chain):</span>
              </span>
              {isComputingHash && <span className="text-emerald-400">Calculating...</span>}
            </div>
            <div className="font-mono text-xs text-emerald-400/90 break-all select-all">
              {evidenceHash || '0x... (Will compute from evidence manifest)'}
            </div>
          </div>
        </div>

        {/* Validity Duration / Expiry */}
        <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            04. Validity Duration
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'perpetual', label: 'Perpetual (No Expiry)', desc: 'Permanent unless revoked' },
              { id: '1year', label: '1 Year Valid', desc: 'Expires in 365 days' },
              { id: '30days', label: '30 Days Valid', desc: 'Short-term milestone' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExpiryOption(opt.id as any)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  expiryOption === opt.id
                    ? 'bg-neutral-800/90 border-emerald-500/60 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Pre-Submission Inspector: What will be recorded */}
        <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Pre-Submission Ledger Preview</span>
          </div>

          <div className="text-xs font-mono space-y-1.5 text-neutral-400 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subject:</span>
              <span className="text-neutral-200">{shortenAddress(subject, 6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Claim Type:</span>
              <span className="text-neutral-200">{claimType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Evidence Hash:</span>
              <span className="text-emerald-400">{evidenceHash ? shortenAddress(evidenceHash, 8) : 'Pending'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Expiry:</span>
              <span className="text-neutral-200">{expiryOption === 'perpetual' ? 'Perpetual (0)' : expiryOption}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Network:</span>
              <span className="text-neutral-200">Monad Testnet (10143)</span>
            </div>
          </div>
        </div>

        {/* Submission Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            {isConnected && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isLiveTx}
                  onChange={(e) => setIsLiveTx(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-500"
                />
                <span>Execute real Monad testnet transaction</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={txStep === 'preparing' || txStep === 'waiting-wallet' || txStep === 'submitted'}
            className="w-full sm:w-auto px-6 py-3 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs sm:text-sm rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {txStep === 'waiting-wallet' && (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Confirming in Wallet...</span>
              </>
            )}
            {txStep === 'submitted' && (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Anchoring on Monad...</span>
              </>
            )}
            {(txStep === 'idle' || txStep === 'confirmed' || txStep === 'error') && (
              <>
                <PlusCircle className="h-4 w-4" />
                <span>Issue & Record Attestation</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export const SubmitPage = IssueAttestationPage;
