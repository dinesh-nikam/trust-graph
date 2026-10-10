import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { 
  Send, 
  CheckCircle2, 
  Cpu, 
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Info,
  Clock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { ClaimType } from '../types';
import { useRegisterWork } from '../hooks/useWorkRegistry';
import { 
  computeCanonicalEvidenceHash, 
  computeDeterministicWorkId,
  shortenAddress 
} from '../utils/formatters';
import { trustGraphService } from '../services/trustGraphService';
import { DEMO_WALLETS, PROOF_OF_WORK_REGISTRY_CONFIGURED, getExplorerTxUrl } from '../lib/contract/config';

export const SubmitWorkPage: React.FC = () => {
  const navigate = useNavigate();
  const { address, chainId } = useAccount();
  const { 
    register, 
    txStep, 
    txHash, 
    errorMessage: txError, 
    isConfirming, 
    isConfirmed, 
    reset: resetTx 
  } = useRegisterWork();

  const [worker, setWorker] = useState<string>(address || DEMO_WALLETS.DEVELOPER.address);
  const [claimType, setClaimType] = useState<ClaimType>('CONTRACT_DEPLOYED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [manifestText, setManifestText] = useState('');
  const [evidenceHash, setEvidenceHash] = useState<`0x${string}` | ''>('');
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [submittedTxHash, setSubmittedTxHash] = useState<`0x${string}` | undefined>();
  const [isDemoSubmission, setIsDemoSubmission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync wallet address if connected or switched
  useEffect(() => {
    if (address) {
      setWorker(address);
      setError(null);
    }
  }, [address]);

  // Compute live deterministic canonical evidence hash
  useEffect(() => {
    let active = true;
    const compute = async () => {
      if (!primaryUrl.trim()) {
        setEvidenceHash('');
        return;
      }
      setIsComputingHash(true);
      try {
        const hash = await computeCanonicalEvidenceHash({
          title: title.trim() || 'Work Submission',
          workType: claimType,
          primaryUrl: primaryUrl.trim(),
          description: description.trim(),
          worker: worker.trim() || address || DEMO_WALLETS.DEVELOPER.address,
        });
        if (active) setEvidenceHash(hash);
      } catch (err: unknown) {
        if (active) {
          setEvidenceHash('');
          setError(err instanceof Error ? `Evidence hash generation failed: ${err.message}` : 'Evidence hash generation failed.');
        }
      } finally {
        if (active) setIsComputingHash(false);
      }
    };
    compute();
    return () => {
      active = false;
    };
  }, [manifestText, primaryUrl, title, claimType, worker, address]);

  const loadDemoData = () => {
    if (!address) {
      setWorker(DEMO_WALLETS.DEVELOPER.address);
    }
    setClaimType('CONTRACT_DEPLOYED');
    setTitle('Monad Parallel State Router v2');
    setDescription('High-performance automated router maximizing parallel transaction execution throughput on Monad EVM.');
    setPrimaryUrl('https://testnet.monadexplorer.com/address/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1');
    setManifestText(
      'Repository: https://github.com/monad-developers/parallel-router\n' +
      'Bytecode Hash: 0x98124b892a01cf...819\n' +
      'Monad Benchmark: 10,000 tx/sec under 400ms finality\n' +
      `Author: ${address ? shortenAddress(address) : 'Developer Sarah'}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!worker.trim() || !title.trim() || !primaryUrl.trim()) {
      setError('Please fill out developer wallet, claim title, and evidence URL.');
      return;
    }

    if (!isAddress(worker.trim(), { strict: false })) {
      setError('Developer address must be a valid EVM address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const canonicalHash = evidenceHash || (await computeCanonicalEvidenceHash({
        title: title.trim(),
        workType: claimType,
        primaryUrl: primaryUrl.trim(),
        description: description.trim(),
        worker: worker.trim(),
      }));

      const deterministicId = await computeDeterministicWorkId(worker.trim(), title.trim());

      if (trustGraphService.getMode() === 'DEMO') {
        // Local fixtures are permitted only when DEMO mode was explicitly selected.
        setIsDemoSubmission(true);
        const res = await trustGraphService.submitWork({
          worker: worker.trim() as `0x${string}`,
          claimType,
          title: title.trim(),
          description: description.trim(),
          evidenceUrl: primaryUrl.trim(),
          evidenceManifest: manifestText.trim() || primaryUrl.trim(),
          evidenceHash: canonicalHash,
        });
        setSubmittedId(res.id);
        setIsSubmitted(true);
      } else {
        if (!address) throw new Error('Connect a wallet on Monad Testnet to register work on-chain.');
        if (!PROOF_OF_WORK_REGISTRY_CONFIGURED) throw new Error('ProofOfWorkRegistry address is not configured. Live submission is disabled.');
        if (getAddress(worker.trim()) !== getAddress(address)) {
          throw new Error(`Worker address (${shortenAddress(worker.trim())}) must match your connected wallet (${shortenAddress(address)}) which signs the transaction on Monad Testnet.`);
        }
        setIsDemoSubmission(false);
        const result = await register({
          workId: deterministicId,
          workType: claimType,
          evidenceHash: canonicalHash,
          metadataUri: primaryUrl.trim(),
        });

        setSubmittedId(deterministicId);
        setSubmittedTxHash(result.txHash);
        setIsSubmitted(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {isDemoSubmission && (
          <div className="mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-400">
            [DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]
          </div>
        )}
        <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto mb-4">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Work Claim Submitted Successfully</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mb-6 leading-relaxed">
            Your evidence manifest has been cryptographically hashed and entered into the Reviewer Triage Queue.
          </p>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-left text-xs font-mono mb-6 space-y-2">
            <div className="flex justify-between items-center text-neutral-400">
              <span>Work ID:</span>
              <span className="text-white font-bold truncate max-w-[240px]">{submittedId}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>Canonical Evidence Hash:</span>
              <span className="text-emerald-400 truncate max-w-[240px]">{evidenceHash}</span>
            </div>
            {submittedTxHash && (
              <div className="flex justify-between items-center text-neutral-400">
                <span>Monad Testnet Tx:</span>
                <a
                  href={getExplorerTxUrl(submittedTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline truncate max-w-[240px]"
                >
                  {submittedTxHash}
                </a>
              </div>
            )}
            <div className="flex justify-between items-center text-neutral-400">
              <span>Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800">
                PENDING REVIEW
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/verify"
              className="px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>View in Reviewer Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to={`/passport/${worker}`}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition-colors"
            >
              Back to Developer Passport
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2">
          <Send className="h-3.5 w-3.5 text-indigo-400" />
          <span>DEVELOPER EVIDENCE SUBMISSION PIPELINE</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Submit Work for Verification
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
              Don't tell people what you can do. Show them what you've done. Submit canonical evidence manifests to be verified by ecosystem reviewers.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDemoData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shrink-0 self-start sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Load Demo Template</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Worker Address */}
        <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-300">
              Developer Subject Wallet Address (0x...) *
            </label>
            {address && isAddress(worker.trim(), { strict: false }) && getAddress(worker.trim()) !== getAddress(address) && (
              <button
                type="button"
                onClick={() => { setWorker(address); setError(null); }}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Use Connected Wallet ({shortenAddress(address)})
              </button>
            )}
          </div>
          <input
            type="text"
            required
            value={worker}
            onChange={(e) => setWorker(e.target.value)}
            placeholder="0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 font-mono focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-neutral-500">
            <span>The developer wallet address that built the software and will hold the verified proof.</span>
            {address && (
              <span className={isAddress(worker.trim(), { strict: false }) && getAddress(worker.trim()) === getAddress(address) ? 'text-emerald-400' : 'text-amber-400'}>
                {isAddress(worker.trim(), { strict: false }) && getAddress(worker.trim()) === getAddress(address)
                  ? '✓ Matches Connected Wallet'
                  : `Connected: ${shortenAddress(address)}`}
              </span>
            )}
          </div>
        </div>

        {/* Claim Type Selection */}
        <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <label className="block text-xs font-medium text-neutral-300">
            Work Category *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'CONTRACT_DEPLOYED' as ClaimType, title: 'Smart Contract', desc: 'Deployed Monad EVM contract' },
              { type: 'CHALLENGE_COMPLETED' as ClaimType, title: 'Hackathon Project', desc: 'Jury benchmarked challenge' },
              { type: 'CONTRIBUTION_VERIFIED' as ClaimType, title: 'Core Contribution', desc: 'Merged PR or open-source commit' },
            ].map((cat) => (
              <button
                key={cat.type}
                type="button"
                onClick={() => setClaimType(cat.type)}
                className={`p-3.5 rounded-lg border text-left transition-all ${
                  claimType === cat.type
                    ? 'bg-neutral-850 border-emerald-500/80 text-white shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-xs text-white mb-0.5">{cat.title}</div>
                <div className="text-[11px] text-neutral-400">{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Work Details */}
        <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Work Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monad Parallel AMM Order Router"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Description / Technical Summary
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a concise description of what was built and tested..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Primary Artifact URL (Contract / Commit / PR) *
            </label>
            <input
              type="url"
              required
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder="https://testnet.monadexplorer.com/address/0x..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 font-mono focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Canonical Evidence Manifest & Hash */}
        <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-300">
              Canonical Evidence Manifest (Off-chain Payload)
            </label>
            <span className="text-[11px] font-mono text-neutral-500">
              {isComputingHash ? 'Computing SHA-256...' : 'Deterministic WebCrypto SHA-256'}
            </span>
          </div>

          <textarea
            rows={4}
            value={manifestText}
            onChange={(e) => setManifestText(e.target.value)}
            placeholder="Repository: https://github.com/...&#10;Commit: a812f04e...&#10;Deployment Tx: 0x...&#10;Benchmark: 10,000 TPS"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 font-mono focus:outline-none focus:border-neutral-600"
          />

          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-neutral-500">Cryptographic Evidence Digest:</span>
              <span className="text-emerald-400 font-semibold text-[11px]">
                {evidenceHash ? '✓ Deterministic Hash Computed' : 'Enter evidence payload above'}
              </span>
            </div>
            <div className="text-xs font-mono text-neutral-300 break-all select-all">
              {evidenceHash || '0x...'}
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-between pt-2">
          <Link
            to="/verify"
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors"
          >
            ← View Reviewer Queue
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || isComputingHash || isConfirming || txStep === 'waiting-wallet' || txStep === 'submitted'}
            className="px-6 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit Work Claim</span>
          </button>
        </div>
      </form>
    </div>
  );
};
