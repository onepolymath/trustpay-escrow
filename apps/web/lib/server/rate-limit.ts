import "server-only";

const hits = new Map<string, number>();

/** Tiny per-instance limiter: good enough to stop a devnet faucet being drained by a loop. */
export function rateLimited(key: string, windowMs: number, now = Date.now()): boolean {
  const last = hits.get(key);
  if (last !== undefined && now - last < windowMs) return true;
  hits.set(key, now);
  if (hits.size > 5_000) hits.clear();
  return false;
}
