/**
 * Focused hackathon-readiness tests.
 *
 * Scope & honesty notes:
 *  - Section A exercises the REAL `translateTxError` from src/lib/blockchain/errors.ts.
 *  - Section B recomputes every fixture's SHA-256 from its manifest, read from
 *    src/data/mockData.ts, using the app's canonical hashing rule
 *    (content.trim() -> UTF-8 -> SHA-256 -> lowercase hex, 0x-prefixed).
 *  - Section C is a MOCKED-PROVIDER simulation of the receipt lifecycle contract
 *    implemented in src/hooks/useTrustGraph.ts. It does NOT execute the real hook
 *    (that requires a React renderer, which this dependency-free harness lacks);
 *    it pins the required state ordering and error branches so regressions in the
 *    intended contract are caught. Real-browser/real-wallet behavior is covered
 *    separately by the Playwright e2e suite.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { translateTxError } from '../src/lib/blockchain/errors.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sha256(content: string): `0x${string}` {
  return `0x${crypto.createHash('sha256').update(content.trim(), 'utf8').digest('hex')}`;
}

// ---------------------------------------------------------------------------
// Section C: mocked receipt lifecycle (mirrors useTrustGraph live path)
// ---------------------------------------------------------------------------
type Phase = 'preparing' | 'waiting-wallet' | 'submitted' | 'confirming' | 'confirmed' | 'error';

interface ReceiptProvider {
  writeContract(): Promise<`0x${string}`>;
  waitForReceipt(hash: `0x${string}`): Promise<{ status: 'success' | 'reverted'; blockNumber: bigint }>;
}

async function runIssueLifecycle(provider: ReceiptProvider) {
  const phases: Phase[] = [];
  try {
    phases.push('preparing');
    phases.push('waiting-wallet');
    const hash = await provider.writeContract();
    phases.push('submitted');
    phases.push('confirming');
    const receipt = await provider.waitForReceipt(hash);
    if (receipt.status !== 'success') {
      throw new Error('Transaction reverted on Monad Testnet.');
    }
    phases.push('confirmed');
    return { phases, record: { txHash: hash, blockNumber: Number(receipt.blockNumber) }, error: null as string | null };
  } catch (err) {
    phases.push('error');
    return { phases, record: null, error: translateTxError(err) };
  }
}

async function runTests() {
  console.log('🧪 Starting TrustGraph Hackathon-Readiness Test Suite...\n');

  // ---- A. Error translation (real module) ----
  console.log('A. Testing transaction error translation...');
  assert.match(
    translateTxError(new Error('User rejected the request.')),
    /cancelled in your wallet/i,
    'Rejected signature must map to a cancellation message'
  );
  assert.match(
    translateTxError(new Error('Transaction execution reverted')),
    /contract rejected/i,
    'Reverted tx must map to a contract-rejection message'
  );
  assert.match(
    translateTxError(Object.assign(new Error('Timed out while waiting for receipt'), { name: 'TimeoutError' })),
    /did not respond in time/i,
    'Receipt timeout must map to an RPC timeout message'
  );
  console.log('   ✓ Error translation verified.');

  // ---- B. Fixture manifest integrity ----
  console.log('B. Verifying every fixture hash recomputes from its manifest...');
  const src = readFileSync(join(__dirname, '..', 'src', 'data', 'mockData.ts'), 'utf8');
  const pairRe = /evidenceHash:\s*'(0x[0-9a-fA-F]{64})',\s*evidenceManifest:\s*'((?:[^'\\]|\\.)*)'/g;
  const pairs: Array<{ hash: string; manifest: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(src)) !== null) {
    // Source stores newlines as the two-character escape sequence \n; the app
    // hashes the real newline character, so unescape the single-quote form.
    const manifest = m[2].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    pairs.push({ hash: m[1].toLowerCase(), manifest });
  }
  assert.strictEqual(pairs.length, 6, `Expected 6 fixture (hash, manifest) pairs, found ${pairs.length}`);
  for (const [i, pair] of pairs.entries()) {
    const recomputed = sha256(pair.manifest);
    assert.strictEqual(
      recomputed,
      pair.hash,
      `Fixture #${i + 1} stored hash must equal SHA-256(manifest). stored=${pair.hash} recomputed=${recomputed}`
    );
  }
  assert.ok(
    !src.includes('0x4486926019A8B74431eBDeF7c2718E340621B903112233445566778899aabbcc'),
    'Fabricated transaction-like string must be absent from fixture manifests'
  );
  console.log(`   ✓ ${pairs.length}/6 fixture hashes match; no fabricated tx strings present.`);

  // ---- C. Receipt lifecycle (mocked provider) ----
  console.log('C. Simulating receipt lifecycle branches (mocked provider)...');
  const success = await runIssueLifecycle({
    async writeContract() { return `0x${'a'.repeat(64)}`; },
    async waitForReceipt() { return { status: 'success', blockNumber: 4567n }; },
  });
  assert.deepStrictEqual(
    success.phases,
    ['preparing', 'waiting-wallet', 'submitted', 'confirming', 'confirmed'],
    'Success path must promote to confirmed only after a successful receipt'
  );
  assert.strictEqual(success.record?.blockNumber, 4567, 'Confirmed record must carry the receipt block number');
  assert.strictEqual(success.error, null);

  const reverted = await runIssueLifecycle({
    async writeContract() { return `0x${'b'.repeat(64)}`; },
    async waitForReceipt() { return { status: 'reverted', blockNumber: 10n }; },
  });
  assert.ok(reverted.phases.includes('confirming'), 'Reverted tx must reach confirming before failing');
  assert.ok(!reverted.phases.includes('confirmed'), 'Reverted tx must NEVER reach confirmed');
  assert.strictEqual(reverted.record, null, 'Reverted tx must not create a record');
  assert.match(reverted.error ?? '', /contract rejected/i);

  const rejected = await runIssueLifecycle({
    async writeContract() { throw new Error('User rejected the request.'); },
    async waitForReceipt() { throw new Error('should not be called'); },
  });
  assert.deepStrictEqual(rejected.phases, ['preparing', 'waiting-wallet', 'error'], 'Rejected signature must stop before broadcast');
  assert.strictEqual(rejected.record, null);

  const timeout = await runIssueLifecycle({
    async writeContract() { return `0x${'c'.repeat(64)}`; },
    async waitForReceipt() { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); },
  });
  assert.ok(!timeout.phases.includes('confirmed'), 'Receipt timeout must never promote to confirmed');
  assert.strictEqual(timeout.record, null, 'Receipt timeout must not create a record');
  assert.match(timeout.error ?? '', /did not respond in time/i);
  console.log('   ✓ Lifecycle branches verified (success / reverted / rejected / timeout).');

  console.log('\n🎉 ALL READINESS TESTS PASSED (A: 3, B: 7, C: 4).');
}

runTests().catch((err) => {
  console.error('❌ Readiness test failed:', err);
  process.exit(1);
});
