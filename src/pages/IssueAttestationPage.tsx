import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
import { useIssueAttestation, useIssuerStatus, useContractStatus } from '../hooks/useTrustGraph';
import { ClaimType } from '../types';
import { computeSha256, shortenAddress } from '../utils/formatters';
import { MONAD_TESTNET_CHAIN_ID, getExplorerTxUrl } from '../lib/contract/config';
import { trustGraphService } from '../services/trustGraphService';

export const IssueAttestationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { isAuthorized, isLoading: isCheckingAuth, error: issuerCheckError } = useIssuerStatus(address);
  const { issue, txStep, errorMessage, txHash, createdAttestation, reset } = useIssueAttestation();
  const { data: contractStatus } = useContractStatus();
  const isTrustGraphDeployed = contractStatus?.trustGraphReady ?? false;

  // Form states
  const [subject, setSubject] = useState('');
  const [claimType, setClaimType] = useState<ClaimType>('CONTRACT_DEPLOYED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [manifestText, setManifestText] = useState('');
  const [evidenceHash, setEvidenceHash] = useState<`0x${string}` | ''>('');
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [expiryOption, setExpiryOption] = useState<'perpetual' | '1year' | '30days'>('perpetual');

  // Pre-fill from query params if coming from Developer Submissions queue
  useEffect(() => {
    const sSubject = searchParams.get('subject');
    const sType = searchParams.get('type') as ClaimType | null;
    const sTitle = searchParams.get('title');
    const sDesc = searchParams.get('description');
    const sUrl = searchParams.get('url');
    const sManifest = searchParams.get('manifest');

    if (sSubject) setSubject(sSubject);
    if (sType) setClaimType(sType);
    if (sTitle) setTitle(sTitle);
    if (sDesc) setDescription(sDesc);
    if (sUrl) setEvidenceUrl(sUrl);
    if (sManifest) setManifestText(sManifest);
  }, [searchParams]);

  // If a submissionId was provided and issuance succeeds, mark submission as approved
  const submissionId = searchParams.get('submissionId');
  useEffect(() => {
    if (txStep === 'confirmed' && createdAttestation && submissionId) {
      trustGraphService.approveSubmission(submissionId, createdAttestation.id);
    }
  }, [txStep, createdAttestation, submissionId]);

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
      <div className="mb-8 p-4 rounded-2xl backdrop-blur-md bg-neutral-900/60 border border-neutral-800 text-xs">
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
                  <span>Connect an issuer wallet to issue an attestation.</span>
                )}
              </div>
              <div className="text-neutral-400 text-[11px] leading-relaxed">
                {isConnected ? (
                  issuerCheckError ? (
                    <span className="text-rose-300">Registry authorization could not be read. Check the RPC and configured contract address.</span>
                  ) : isAuthorized ? (
                    <span className="text-emerald-400">
                      ✓ Recognized as an Authorized Issuer in the TrustGraph registry.
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      This wallet is not an authorized issuer in the registry. Ask the registry owner to call <code>approveIssuer</code>.
                    </span>
                  )
                ) : (
                  <span>
                    Issuance requires an authorized wallet on Monad Testnet.
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Advisory Banner when TrustGraphRegistry is pending deployment */}
      {trustGraphService.getMode() === 'LIVE' && !isTrustGraphDeployed && (
        <div role="status" className="mb-8 p-5 rounded-2xl bg-amber-950/40 border border-amber-800 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Attestation Registry Pending Deployment on Monad Testnet</span>
          </div>
          <p className="text-amber-300/90 leading-relaxed text-[11px]">
            Direct attestation issuance is currently unavailable on Monad Testnet because <code>TrustGraphRegistry</code> is pending contract deployment (blocked by external dependency: missing deployer private key).
            Meanwhile, the active <code>ProofOfWorkRegistry</code> (0xca65ada83f1f7765a712b28a6b79ca323395f8ac) is fully operational for work submissions and verifier triage.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/verify"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <span>Go to ProofOfWork Verifier Queue (/verify)</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="/submit"
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-mono transition-colors"
            >
              <span>Submit Proof of Work (/submit)</span>
            </Link>
          </div>
        </div>
      )}

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
                Attestation #{createdAttestation.id} was confirmed on Monad Testnet.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {txHash && (
                  <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 hover:underline inline-flex items-center gap-1">
                    View confirmed transaction <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <Link
                  to={`/verify/${createdAttestation.id}`}
                  className="btn-primary px-4 py-2 text-xs"
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
        <div className="p-5 rounded-2xl backdrop-blur-md bg-neutral-900/50 border border-neutral-800 space-y-4">
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
        <div className="p-5 rounded-2xl backdrop-blur-md bg-neutral-900/50 border border-neutral-800 space-y-4">
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
        <div className="p-5 rounded-2xl backdrop-blur-md bg-neutral-900/50 border border-neutral-800 space-y-4">
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
              Evidence Manifest
            </label>
            <textarea
              rows={3}
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              placeholder="Specific commit, transaction hash, contract address, or test run..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-mono focus:border-neutral-600 focus:outline-none"
            />
            <p className="mt-2 text-[11px] text-amber-300">
              The contract stores the evidence URL and hash, not the manifest text, title, or description. Publish the exact manifest at the evidence URL so auditors can retrieve and hash the same trimmed text.
            </p>
          </div>

          {/* Computed SHA-256 Anchor */}
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1 font-mono">
              <span className="flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>SHA-256 of trimmed manifest text (URL if blank):</span>
              </span>
              {isComputingHash && <span className="text-emerald-400">Calculating...</span>}
            </div>
            <div className="font-mono text-xs text-emerald-400/90 break-all select-all">
              {evidenceHash || '0x... (Will compute from evidence manifest)'}
            </div>
          </div>
        </div>

        {/* Validity Duration / Expiry */}
        <div className="p-5 rounded-2xl backdrop-blur-md bg-neutral-900/50 border border-neutral-800 space-y-3">
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
                onClick={() => setExpiryOption(opt.id as 'perpetual' | '1year' | '30days')}
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
        <div className="p-5 rounded-2xl backdrop-blur-md bg-neutral-900/80 border border-neutral-800 space-y-3">
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
          <div className="text-xs font-mono text-neutral-400">
            Every submission requires a real Monad Testnet transaction.
            {isWrongNetwork && <span className="block text-amber-300">Switch to Monad Testnet before submitting.</span>}
          </div>

          <button
            type="submit"
            disabled={
              !isConnected ||
              !isAuthorized ||
              isCheckingAuth ||
              isWrongNetwork ||
              isComputingHash ||
              (trustGraphService.getMode() === 'LIVE' && !isTrustGraphDeployed) ||
              txStep === 'preparing' ||
              txStep === 'waiting-wallet' ||
              txStep === 'submitted' ||
              txStep === 'confirming'
            }
            className="btn-primary w-full sm:w-auto px-6 py-3 text-xs sm:text-sm disabled:opacity-50"
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
            {txStep === 'confirming' && <><RefreshCw className="h-4 w-4 animate-spin" /><span>Waiting for Monad confirmation...</span></>}
            {(txStep === 'idle' || txStep === 'confirmed' || txStep === 'error') && (
              trustGraphService.getMode() === 'LIVE' && !isTrustGraphDeployed ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>Registry Pending Deployment</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Issue & Record Attestation</span>
                </>
              )
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export const SubmitPage = IssueAttestationPage;
