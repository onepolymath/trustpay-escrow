#!/usr/bin/env bash
# Full-stack E2E: local validator + real program + bootstrap + production web build + browser.
# Requires: solana CLI (solana-test-validator), a built program, Chrome/Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."

WORK="$(mktemp -d)"
PORT="${PORT:-3100}"
trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "$WORK"' EXIT

[[ -f target/deploy/trustpay.so ]] || ./scripts/build-program.sh
for k in admin arbiter funder; do solana-keygen new --no-bip39-passphrase -s -o "$WORK/$k.json" >/dev/null; done
PROGRAM_ID="$(node -e 'console.log(require("./packages/sdk/src/idl/trustpay.json").address)')"

solana-test-validator --reset --quiet --ledger "$WORK/ledger" \
  --upgradeable-program "$PROGRAM_ID" target/deploy/trustpay.so "$(solana-keygen pubkey "$WORK/admin.json")" &
until solana -u localhost cluster-version >/dev/null 2>&1; do sleep 1; done
solana -u localhost airdrop 100 "$(solana-keygen pubkey "$WORK/admin.json")" >/dev/null

pnpm --silent bootstrap --rpc http://127.0.0.1:8899 --admin "$WORK/admin.json" \
  --arbiter-keypair "$WORK/arbiter.json" --funder-keypair "$WORK/funder.json" | tee "$WORK/bootstrap.log"
MINT="$(grep NEXT_PUBLIC_PAYMENT_MINT "$WORK/bootstrap.log" | cut -d= -f2)"

export NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
export NEXT_PUBLIC_PAYMENT_MINT="$MINT"
export NEXT_PUBLIC_PAYMENT_SYMBOL=tUSDC
export NEXT_PUBLIC_DEMO=1
export NEXT_PUBLIC_SITE_URL="http://localhost:$PORT"
DEMO_FUNDER_SECRET="$(cat "$WORK/funder.json")"
DEMO_ARBITER_SECRET="$(cat "$WORK/arbiter.json")"
export DEMO_FUNDER_SECRET DEMO_ARBITER_SECRET

pnpm --filter web build
pnpm --filter web exec next start -p "$PORT" &
until curl -sf "http://localhost:$PORT/api/health" >/dev/null; do sleep 1; done

BASE="http://localhost:$PORT" node e2e/demo-flow.mjs
