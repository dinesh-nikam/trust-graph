/**
 * Translates raw viem/wagmi/solidity errors into actionable user-facing copy.
 * AGENTS.md §9.2: raw EVM/provider errors MUST NOT reach the UI untranslated.
 */
export function translateTxError(err: unknown): string {
  if (!err) return 'Transaction failed. Please try again.';

  const e = err as { name?: string; shortMessage?: string; message?: string; details?: string };
  const raw = `${e.name ?? ''} ${e.shortMessage ?? ''} ${e.message ?? ''} ${e.details ?? ''}`.toLowerCase();

  if (raw.includes('user rejected') || raw.includes('user denied') || raw.includes('usercancelled')) {
    return 'Transaction was cancelled in your wallet. No state was changed.';
  }
  if (raw.includes('insufficient funds')) {
    return 'Insufficient MON balance for gas. Get testnet MON from the faucet at testnet.monad.xyz.';
  }
  if (raw.includes('not an authorized') || raw.includes('not authorized') || raw.includes('unauthorized')) {
    return 'Your wallet does not hold the required issuer privileges for this action.';
  }
  if (raw.includes('only registry owner') || raw.includes('only the owner') || raw.includes('ownable')) {
    return 'Only the registry owner may perform this action. Switch to the admin wallet.';
  }
  if (raw.includes('invalid') && raw.includes('transition')) {
    return 'This record is not in a state that allows the requested change. Refresh the page to sync on-chain state.';
  }
  if (raw.includes('chain') && (raw.includes('mismatch') || raw.includes('not configured') || raw.includes('switch'))) {
    return 'Wrong network detected. Switch to Monad Testnet (Chain 10143) and try again.';
  }
  if (raw.includes('timeout') || raw.includes('network error') || raw.includes('failed to fetch')) {
    return 'The Monad RPC did not respond in time. Check your connection and retry.';
  }
  if (raw.includes('reverted') || raw.includes('revert')) {
    return 'The contract rejected this transaction. Refresh the page to sync on-chain state and retry.';
  }
  return e.shortMessage || e.message || 'Transaction failed. Check the Monad explorer for details or try again.';
}
