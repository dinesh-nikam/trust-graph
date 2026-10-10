/**
 * ProofOfWorkRegistry — Full Lifecycle Integration Test
 * Uses real compiled artifacts + Hardhat EVM node via viem clients.
 * Tests every mandatory interface function (AGENTS.md §5.2)
 * and all state transitions (AGENTS.md §4.2). Zero mocks.
 */

import assert from 'node:assert';
import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256Hex(content: string): `0x${string}` {
  return `0x${crypto.createHash('sha256').update(content.trim()).digest('hex')}`;
}

function canonicalEvidenceHash(e: {
  title: string; workType: string; primaryUrl: string;
  description: string; worker: string;
}): `0x${string}` {
  return sha256Hex(JSON.stringify({
    description: e.description.trim(),
    primaryUrl:  e.primaryUrl.trim().toLowerCase(),
    title:       e.title.trim(),
    workType:    e.workType.trim().toUpperCase(),
    worker:      e.worker.trim().toLowerCase(),
  }));
}

function deterministicWorkId(worker: string, title: string, ts: number): `0x${string}` {
  return sha256Hex(`trustgraph-work-${worker.toLowerCase()}-${title.toLowerCase()}-${ts}`);
}

// ── Load compiled artifact ────────────────────────────────────────────────────

const artifactPath = path.join(
  __dirname,
  '../artifacts/contracts/ProofOfWorkRegistry.sol/ProofOfWorkRegistry.json'
);
assert.ok(fs.existsSync(artifactPath), `Artifact missing: ${artifactPath}`);
const artifact  = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const abi       = artifact.abi as Abi;
const bytecode: `0x${string}` = artifact.bytecode;
assert.ok(bytecode && bytecode.length > 100, 'Bytecode must be non-empty');

// ── Accounts (Hardhat deterministic) ─────────────────────────────────────────

const KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
] as const;

const ownerAcct    = privateKeyToAccount(KEYS[0]);
const verifierAcct = privateKeyToAccount(KEYS[1]);
const workerAcct   = privateKeyToAccount(KEYS[2]);
const attackerAcct = privateKeyToAccount(KEYS[3]);

// ── Viem clients ──────────────────────────────────────────────────────────────

const RPC = 'http://127.0.0.1:8545';
const pub = createPublicClient({ chain: hardhat, transport: http(RPC) });
const mkWallet = (key: `0x${string}`) =>
  createWalletClient({ account: privateKeyToAccount(key), chain: hardhat, transport: http(RPC) });

const ownerW    = mkWallet(KEYS[0]);
const verifierW = mkWallet(KEYS[1]);
const workerW   = mkWallet(KEYS[2]);
const attackerW = mkWallet(KEYS[3]);

// ── Constants ─────────────────────────────────────────────────────────────────

const TS       = 1700000000;
const WORK_1   = deterministicWorkId(workerAcct.address, 'Monad DEX Router', TS);
const WORK_2   = deterministicWorkId(workerAcct.address, 'Monad NFT Indexer', TS + 1);
const EV_1     = canonicalEvidenceHash({ title: 'Monad DEX Router', workType: 'SMART_CONTRACT',
  primaryUrl: 'https://testnet.monadexplorer.com/address/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1',
  description: 'Parallel swap router.', worker: workerAcct.address });
const EV_2     = canonicalEvidenceHash({ title: 'Monad NFT Indexer', workType: 'GITHUB_CONTRIBUTION',
  primaryUrl: 'https://github.com/monad-devs/nft-indexer/pull/99',
  description: 'Merged NFT indexer PR.', worker: workerAcct.address });
const META_1   = 'https://github.com/monad-devs/parallel-dex';
const META_2   = 'https://github.com/monad-devs/nft-indexer/pull/99';
const ZERO32   = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDR= '0x0000000000000000000000000000000000000000';
const WT       = { SMART_CONTRACT: 0, GITHUB_CONTRIBUTION: 1, HACKATHON_PROJECT: 2 };
const ST       = { PENDING: 0, VERIFIED: 1, REJECTED: 2, REVOKED: 3 };

let ADDR: `0x${string}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function c(fn: string, args: unknown[] = []) {
  return { address: ADDR, abi, functionName: fn, args } as const;
}

async function getWork(id: `0x${string}`) {
  return pub.readContract(c('getWork', [id])) as Promise<{
    workId: `0x${string}`; worker: `0x${string}`; workType: number;
    evidenceHash: `0x${string}`; metadataUri: string; verifier: `0x${string}`;
    createdAt: bigint; verifiedAt: bigint; status: number; statusReason: string;
  }>;
}

async function expectRevert(p: Promise<unknown>, label: string) {
  try {
    await p;
    assert.fail(`Expected revert: ${label}`);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith('Expected revert')) throw e;
  }
}

let nodeProcess: ChildProcess | null = null;

async function ensureNode(): Promise<void> {
  try {
    const res = await fetch('http://127.0.0.1:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
    });
    if (res.ok) {
      console.log('⚡ Connected to running Hardhat node (http://127.0.0.1:8545)');
      return;
    }
  } catch {
    // node not currently responding, attempt spawn
  }

  console.log('⚡ Starting local Hardhat node on port 8545...');
  nodeProcess = spawn('npx', ['hardhat', 'node'], {
    shell: true,
    stdio: 'ignore',
  });

  const start = Date.now();
  while (Date.now() - start < 20000) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      const res = await fetch('http://127.0.0.1:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      });
      if (res.ok) {
        console.log('⚡ Local Hardhat node started successfully');
        return;
      }
    } catch {}
  }
  throw new Error('Timed out waiting for Hardhat node to start on port 8545');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  await ensureNode();

  try {
    console.log('🧪 ProofOfWorkRegistry — Full Lifecycle Integration Test\n');
    console.log(`   Owner:    ${ownerAcct.address}`);
    console.log(`   Verifier: ${verifierAcct.address}`);
    console.log(`   Worker:   ${workerAcct.address}`);
    console.log(`   Attacker: ${attackerAcct.address}\n`);

    // 0. Node connectivity
    const chainId = await pub.getChainId();
    assert.strictEqual(chainId, 31337, `Chain ID mismatch: ${chainId}`);
    console.log('0. Hardhat EVM connected (chain 31337)\n');

  // 1. Deploy
  console.log('1. Deploying ProofOfWorkRegistry...');
  const deployHash = await ownerW.deployContract({ abi, bytecode, args: [] });
  const deployRx   = await pub.waitForTransactionReceipt({ hash: deployHash });
  assert.strictEqual(deployRx.status, 'success');
  ADDR = deployRx.contractAddress!;
  assert.ok(ADDR, 'No contract address in receipt');
  const code = await pub.getCode({ address: ADDR });
  assert.ok(code && code !== '0x');
  console.log(`   ✓ Deployed at ${ADDR}`);
  console.log(`   ✓ Bytecode confirmed\n`);

  // 2. Ownership
  console.log('2. Ownership checks...');
  const owner = await pub.readContract(c('owner')) as `0x${string}`;
  assert.strictEqual(owner.toLowerCase(), ownerAcct.address.toLowerCase());
  assert.ok(await pub.readContract(c('isVerifier', [ownerAcct.address])) as boolean);
  console.log('   ✓ Owner correct');
  console.log('   ✓ Owner is auto-verifier\n');

  // 3. Verifier management
  console.log('3. Verifier authorization...');
  await expectRevert(attackerW.writeContract({ ...c('approveVerifier', [verifierAcct.address]), account: attackerAcct }), 'attacker approve');
  console.log('   ✓ Attacker blocked from approveVerifier');

  let h = await ownerW.writeContract({ ...c('approveVerifier', [verifierAcct.address]), account: ownerAcct });
  await pub.waitForTransactionReceipt({ hash: h });
  assert.ok(await pub.readContract(c('isVerifier', [verifierAcct.address])) as boolean);
  console.log('   ✓ Owner approved verifier');

  await expectRevert(ownerW.writeContract({ ...c('approveVerifier', [verifierAcct.address]), account: ownerAcct }), 'duplicate approve');
  console.log('   ✓ Duplicate approval reverts');

  await expectRevert(ownerW.writeContract({ ...c('approveVerifier', [ZERO_ADDR]), account: ownerAcct }), 'zero approve');
  console.log('   ✓ Zero-address approval reverts');

  await expectRevert(attackerW.writeContract({ ...c('removeVerifier', [verifierAcct.address]), account: attackerAcct }), 'attacker remove');
  console.log('   ✓ Attacker blocked from removeVerifier');

  h = await ownerW.writeContract({ ...c('removeVerifier', [verifierAcct.address]), account: ownerAcct });
  await pub.waitForTransactionReceipt({ hash: h });
  assert.ok(!(await pub.readContract(c('isVerifier', [verifierAcct.address])) as boolean));
  console.log('   ✓ Owner removed verifier');

  h = await ownerW.writeContract({ ...c('approveVerifier', [verifierAcct.address]), account: ownerAcct });
  await pub.waitForTransactionReceipt({ hash: h });
  assert.ok(await pub.readContract(c('isVerifier', [verifierAcct.address])) as boolean);
  console.log('   ✓ Verifier re-approved\n');

  // 4. registerWork → PENDING
  console.log('4. registerWork (PENDING)...');
  await expectRevert(workerW.writeContract({ ...c('registerWork', [ZERO32, WT.SMART_CONTRACT, EV_1, META_1]), account: workerAcct }), 'zero workId');
  await expectRevert(workerW.writeContract({ ...c('registerWork', [WORK_1, WT.SMART_CONTRACT, ZERO32, META_1]), account: workerAcct }), 'zero evidenceHash');
  console.log('   ✓ Invalid inputs revert');

  h = await workerW.writeContract({ ...c('registerWork', [WORK_1, WT.SMART_CONTRACT, EV_1, META_1]), account: workerAcct });
  const regRx = await pub.waitForTransactionReceipt({ hash: h });
  assert.strictEqual(regRx.status, 'success');
  console.log(`   ✓ Work registered (tx: ${h.slice(0,12)}...)`);
  assert.ok(regRx.logs.some(l => l.address.toLowerCase() === ADDR.toLowerCase()));
  console.log('   ✓ WorkSubmitted event emitted');

  const w1 = await getWork(WORK_1);
  assert.strictEqual(w1.workId.toLowerCase(), WORK_1.toLowerCase());
  assert.strictEqual(w1.worker.toLowerCase(), workerAcct.address.toLowerCase());
  assert.strictEqual(Number(w1.workType), WT.SMART_CONTRACT);
  assert.strictEqual(w1.evidenceHash.toLowerCase(), EV_1.toLowerCase());
  assert.strictEqual(w1.metadataUri, META_1);
  assert.strictEqual(Number(w1.status), ST.PENDING);
  assert.strictEqual(w1.verifier.toLowerCase(), ZERO_ADDR.toLowerCase());
  assert.strictEqual(Number(w1.verifiedAt), 0);
  assert.ok(Number(w1.createdAt) > 0);
  console.log('   ✓ All Work struct fields match contract readback');

  assert.ok(!(await pub.readContract(c('isVerified', [WORK_1])) as boolean));
  console.log('   ✓ isVerified = false for PENDING');

  await expectRevert(workerW.writeContract({ ...c('registerWork', [WORK_1, WT.SMART_CONTRACT, EV_1, META_1]), account: workerAcct }), 'dup register');
  console.log('   ✓ Duplicate registerWork reverts\n');

  // 5. verifyWork → VERIFIED
  console.log('5. verifyWork (VERIFIED)...');
  await expectRevert(attackerW.writeContract({ ...c('verifyWork', [WORK_1]), account: attackerAcct }), 'unauth verify');
  console.log('   ✓ Unauthorized verify reverts');

  h = await verifierW.writeContract({ ...c('verifyWork', [WORK_1]), account: verifierAcct });
  const verRx = await pub.waitForTransactionReceipt({ hash: h });
  assert.strictEqual(verRx.status, 'success');
  console.log(`   ✓ verifyWork confirmed (tx: ${h.slice(0,12)}...)`);

  const w1v = await getWork(WORK_1);
  assert.strictEqual(Number(w1v.status), ST.VERIFIED);
  assert.strictEqual(w1v.verifier.toLowerCase(), verifierAcct.address.toLowerCase());
  assert.ok(Number(w1v.verifiedAt) > 0);
  console.log('   ✓ Status = VERIFIED, verifier + timestamp recorded');

  assert.ok(await pub.readContract(c('isVerified', [WORK_1])) as boolean);
  console.log('   ✓ isVerified = true');

  await expectRevert(verifierW.writeContract({ ...c('verifyWork', [WORK_1]), account: verifierAcct }), 'dup verify');
  console.log('   ✓ Re-verifying VERIFIED work reverts\n');

  // 6. revokeWork → REVOKED
  console.log('6. revokeWork (REVOKED)...');
  await expectRevert(verifierW.writeContract({ ...c('revokeWork', [WORK_1, '']), account: verifierAcct }), 'empty reason');
  console.log('   ✓ Empty revoke reason reverts');

  const revokeReason = 'Security vulnerability found in deployed contract';
  h = await verifierW.writeContract({ ...c('revokeWork', [WORK_1, revokeReason]), account: verifierAcct });
  const revRx = await pub.waitForTransactionReceipt({ hash: h });
  assert.strictEqual(revRx.status, 'success');
  console.log(`   ✓ revokeWork confirmed (tx: ${h.slice(0,12)}...)`);

  const w1r = await getWork(WORK_1);
  assert.strictEqual(Number(w1r.status), ST.REVOKED);
  assert.strictEqual(w1r.statusReason, revokeReason);
  assert.strictEqual(w1r.evidenceHash.toLowerCase(), EV_1.toLowerCase(), 'Historical data preserved');
  assert.strictEqual(w1r.worker.toLowerCase(), workerAcct.address.toLowerCase());
  console.log('   ✓ Status = REVOKED, reason on-chain');
  console.log('   ✓ Historical evidence + worker preserved');

  assert.ok(!(await pub.readContract(c('isVerified', [WORK_1])) as boolean));
  console.log('   ✓ isVerified = false for REVOKED');

  await expectRevert(verifierW.writeContract({ ...c('revokeWork', [WORK_1, 'again']), account: verifierAcct }), 'dup revoke');
  console.log('   ✓ Cannot revoke REVOKED work\n');

  // 7. rejectWork → REJECTED (terminal)
  console.log('7. rejectWork (REJECTED, terminal)...');
  h = await workerW.writeContract({ ...c('registerWork', [WORK_2, WT.GITHUB_CONTRIBUTION, EV_2, META_2]), account: workerAcct });
  await pub.waitForTransactionReceipt({ hash: h });
  console.log('   ✓ Second work registered');

  await expectRevert(verifierW.writeContract({ ...c('rejectWork', [WORK_2, '']), account: verifierAcct }), 'empty reject reason');
  console.log('   ✓ Empty reject reason reverts');

  const rejectReason = 'PR did not meet contribution criteria — tests missing';
  h = await verifierW.writeContract({ ...c('rejectWork', [WORK_2, rejectReason]), account: verifierAcct });
  const rejRx = await pub.waitForTransactionReceipt({ hash: h });
  assert.strictEqual(rejRx.status, 'success');
  console.log(`   ✓ rejectWork confirmed (tx: ${h.slice(0,12)}...)`);

  const w2 = await getWork(WORK_2);
  assert.strictEqual(Number(w2.status), ST.REJECTED);
  assert.strictEqual(w2.statusReason, rejectReason);
  console.log('   ✓ Status = REJECTED, reason on-chain');

  await expectRevert(verifierW.writeContract({ ...c('verifyWork', [WORK_2]), account: verifierAcct }), 'verify REJECTED');
  console.log('   ✓ Cannot verify REJECTED (terminal)');

  await expectRevert(verifierW.writeContract({ ...c('revokeWork', [WORK_2, 'x']), account: verifierAcct }), 'revoke REJECTED');
  console.log('   ✓ Cannot revoke REJECTED (illegal)\n');

  // 8. Illegal: PENDING → REVOKED
  console.log('8. Illegal transitions...');
  const WORK_3 = deterministicWorkId(workerAcct.address, 'Fresh Work', TS + 99);
  const EV_3   = sha256Hex('fresh evidence payload');
  h = await workerW.writeContract({ ...c('registerWork', [WORK_3, WT.HACKATHON_PROJECT, EV_3, 'https://devfolio.co/monad']), account: workerAcct });
  await pub.waitForTransactionReceipt({ hash: h });
  await expectRevert(verifierW.writeContract({ ...c('revokeWork', [WORK_3, 'x']), account: verifierAcct }), 'PENDING→REVOKED');
  console.log('   ✓ PENDING → REVOKED reverts (illegal)');

  const NONEXISTENT = sha256Hex('work-does-not-exist') as `0x${string}`;
  await expectRevert(pub.readContract(c('getWork', [NONEXISTENT])), 'getWork nonexistent');
  console.log('   ✓ getWork on nonexistent ID reverts\n');

  // 9. Query functions
  console.log('9. Query functions...');
  const workerIds = await pub.readContract(c('getWorksByWorker', [workerAcct.address])) as `0x${string}`[];
  assert.strictEqual(workerIds.length, 3);
  console.log('   ✓ getWorksByWorker → 3 IDs (WORK_1, WORK_2, WORK_3)');

  const stats = await pub.readContract(c('getWorkerStats', [workerAcct.address])) as [bigint, bigint, bigint, bigint];
  assert.strictEqual(Number(stats[0]), 0, 'No verified work (WORK_1 revoked, WORK_2 rejected, WORK_3 pending)');
  console.log('   ✓ getWorkerStats: 0 verified (all are revoked/rejected/pending — correct)');

  const allIds = await pub.readContract(c('getAllWorkIds')) as `0x${string}`[];
  assert.strictEqual(allIds.length, 3);
  console.log('   ✓ getAllWorkIds → 3');

  assert.strictEqual(Number(await pub.readContract(c('getTotalWorkCount')) as bigint), 3);
  console.log('   ✓ getTotalWorkCount = 3');
  assert.strictEqual(Number(await pub.readContract(c('getWorkCount')) as bigint), 3);
  console.log('   ✓ getWorkCount = 3 (alias consistent)\n');

  // 10. Ownership transfer
  console.log('10. transferOwnership...');
  await expectRevert(attackerW.writeContract({ ...c('transferOwnership', [attackerAcct.address]), account: attackerAcct }), 'attacker transfer');
  console.log('    ✓ Attacker blocked');

  h = await ownerW.writeContract({ ...c('transferOwnership', [verifierAcct.address]), account: ownerAcct });
  await pub.waitForTransactionReceipt({ hash: h });
  const newOwner = await pub.readContract(c('owner')) as `0x${string}`;
  assert.strictEqual(newOwner.toLowerCase(), verifierAcct.address.toLowerCase());
  console.log('    ✓ Ownership transferred\n');

  console.log('══════════════════════════════════════════════════════════════');
  console.log('🎉  ALL INTEGRATION TESTS PASSED — Zero Mocks, Real EVM State');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`   Contract:  ProofOfWorkRegistry @ ${ADDR}`);
  console.log('   EVM:       Hardhat (chain ID 31337)');
  console.log('   Functions: registerWork ✓  verifyWork ✓  rejectWork ✓');
  console.log('              revokeWork ✓  approveVerifier ✓  removeVerifier ✓');
  console.log('              isVerifier ✓  getWork ✓  isVerified ✓');
  console.log('              getWorksByWorker ✓  getWorkerStats ✓');
  console.log('              getAllWorkIds ✓  getTotalWorkCount ✓  getWorkCount ✓');
  } finally {
    if (nodeProcess) {
      nodeProcess.kill();
    }
  }
}

run().catch((err) => {
  console.error('\n❌ Integration test failed:', err);
  process.exit(1);
});
