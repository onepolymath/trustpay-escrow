#!/usr/bin/env bash
# Deploys the program to devnet with a dedicated deployer key, then runs the bootstrap.
#
#   KEYS_DIR=/path/to/keys ./scripts/deploy-devnet.sh
#
# KEYS_DIR must contain program.json (program id keypair), deployer.json (upgrade authority,
# funded with ~4 devnet SOL from https://faucet.solana.com), arbiter.json and funder.json.
# Keys are never read from or written to the repository.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYS_DIR="${KEYS_DIR:?set KEYS_DIR to the folder holding the devnet keypairs}"
RPC="${RPC_URL:-https://api.devnet.solana.com}"

[[ -f target/deploy/trustpay.so ]] || ./scripts/build-program.sh

PROGRAM_ID="$(solana-keygen pubkey "$KEYS_DIR/program.json")"
echo "Deploying $PROGRAM_ID to $RPC"
solana program deploy target/deploy/trustpay.so \
  --url "$RPC" \
  --keypair "$KEYS_DIR/deployer.json" \
  --program-id "$KEYS_DIR/program.json" \
  --upgrade-authority "$KEYS_DIR/deployer.json"

pnpm bootstrap \
  --rpc "$RPC" \
  --admin "$KEYS_DIR/deployer.json" \
  --arbiter-keypair "$KEYS_DIR/arbiter.json" \
  --funder-keypair "$KEYS_DIR/funder.json" \
  ${PAYMENT_MINT:+--mint "$PAYMENT_MINT"}

echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
