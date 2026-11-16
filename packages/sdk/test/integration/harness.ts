/**
 * In-process Solana runtime (LiteSVM) loaded with the real compiled program.
 *
 * The program is installed as an *upgradeable* program with a ProgramData account whose upgrade
 * authority is `admin`, exactly like a real `solana program deploy`, so the
 * upgrade-authority gate on `initialize_config` is exercised for real.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { utils } from "@coral-xyz/anchor";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  AccountState,
  MINT_SIZE,
  MintLayout,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type {
  AccountInfo,
  Connection,
  GetProgramAccountsConfig,
  TransactionInstruction,
} from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { FailedTransactionMetadata, LiteSVM } from "litesvm";

import {
  BPF_LOADER_UPGRADEABLE_ID,
  TRUSTPAY_PROGRAM_ID,
  TrustPayClient,
  findProgramDataAddress,
  parseProgramError,
} from "../../src/index.js";

export const PROGRAM_SO = fileURLToPath(
  new URL("../../../../target/deploy/trustpay.so", import.meta.url),
);

export const DECIMALS = 6;
export const usd = (n: number) => BigInt(Math.round(n * 10 ** DECIMALS));

export class TxError extends Error {
  constructor(
    message: string,
    readonly logs: string[],
  ) {
    super(message);
  }
  /** Program error name (e.g. "InvalidStatus") or Anchor constraint code, for assertions. */
  get code(): string {
    const parsed = parseProgramError(this);
    if (parsed && parsed.name !== "AnchorConstraint") return parsed.name;
    const m = /Error Code: (\w+)/.exec(this.logs.join("\n"));
    return m?.[1] ?? this.message;
  }
}

export class Harness {
  readonly svm: LiteSVM;
  readonly admin = Keypair.generate();
  readonly arbiter = Keypair.generate();
  readonly vendor = Keypair.generate();
  readonly buyer = Keypair.generate();
  readonly stranger = Keypair.generate();
  readonly mint = Keypair.generate().publicKey;
  readonly client: TrustPayClient;
  /** Every account address we've touched, so the fake RPC can answer getProgramAccounts. */
  private readonly known = new Set<string>();

  constructor() {
    if (!existsSync(PROGRAM_SO)) {
      throw new Error(`Missing ${PROGRAM_SO}. Run \`pnpm build:program\` first.`);
    }
    this.svm = new LiteSVM();
    this.installUpgradeableProgram(readFileSync(PROGRAM_SO), this.admin.publicKey);
    for (const kp of [this.admin, this.arbiter, this.vendor, this.buyer, this.stranger]) {
      this.svm.airdrop(kp.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
    }
    this.createMint(this.mint);
    this.client = new TrustPayClient(this.connection());
  }

  // ------------------------------------------------------------------ runtime helpers

  private installUpgradeableProgram(elf: Buffer, authority: PublicKey): void {
    const programData = findProgramDataAddress(TRUSTPAY_PROGRAM_ID);
    // UpgradeableLoaderState::ProgramData { slot, upgrade_authority_address } followed by ELF.
    const header = Buffer.alloc(45);
    header.writeUInt32LE(3, 0);
    header.writeBigUInt64LE(0n, 4);
    header.writeUInt8(1, 12);
    authority.toBuffer().copy(header, 13);
    const pdData = Buffer.concat([header, elf]);
    this.svm.setAccount(programData, {
      lamports: Number(this.svm.minimumBalanceForRentExemption(BigInt(pdData.length))),
      data: pdData,
      owner: BPF_LOADER_UPGRADEABLE_ID,
      executable: false,
    });
    // UpgradeableLoaderState::Program { programdata_address }
    const progData = Buffer.alloc(36);
    progData.writeUInt32LE(2, 0);
    programData.toBuffer().copy(progData, 4);
    this.svm.setAccount(TRUSTPAY_PROGRAM_ID, {
      lamports: Number(this.svm.minimumBalanceForRentExemption(36n)),
      data: progData,
      owner: BPF_LOADER_UPGRADEABLE_ID,
      executable: true,
    });
  }

  createMint(address: PublicKey, decimals = DECIMALS): void {
    const data = Buffer.alloc(MINT_SIZE);
    MintLayout.encode(
      {
        mintAuthorityOption: 1,
        mintAuthority: this.admin.publicKey,
        supply: 0n,
        decimals,
        isInitialized: true,
        freezeAuthorityOption: 0,
        freezeAuthority: PublicKey.default,
      },
      data,
    );
    this.svm.setAccount(address, {
      lamports: Number(this.svm.minimumBalanceForRentExemption(BigInt(MINT_SIZE))),
      data,
      owner: TOKEN_PROGRAM_ID,
      executable: false,
    });
  }

  /** Writes a token account with `amount` directly (a test-only "mint to"). */
  setTokenBalance(owner: PublicKey, amount: bigint, mint = this.mint): PublicKey {
    const address = getAssociatedTokenAddressSync(mint, owner, true);
    const data = Buffer.alloc(ACCOUNT_SIZE);
    AccountLayout.encode(
      {
        mint,
        owner,
        amount,
        delegateOption: 0,
        delegate: PublicKey.default,
        state: AccountState.Initialized,
        isNativeOption: 0,
        isNative: 0n,
        delegatedAmount: 0n,
        closeAuthorityOption: 0,
        closeAuthority: PublicKey.default,
      },
      data,
    );
    this.svm.setAccount(address, {
      lamports: Number(this.svm.minimumBalanceForRentExemption(BigInt(ACCOUNT_SIZE))),
      data,
      owner: TOKEN_PROGRAM_ID,
      executable: false,
    });
    return address;
  }

  tokenBalance(owner: PublicKey, mint = this.mint): bigint | null {
    const acc = this.svm.getAccount(getAssociatedTokenAddressSync(mint, owner, true));
    if (!acc || acc.data.length === 0) return null;
    return AccountLayout.decode(acc.data).amount;
  }

  accountExists(address: PublicKey): boolean {
    const acc = this.svm.getAccount(address);
    return acc !== null && acc.lamports > 0;
  }

  lamports(address: PublicKey): bigint {
    return BigInt(this.svm.getAccount(address)?.lamports ?? 0);
  }

  now(): number {
    return Number(this.svm.getClock().unixTimestamp);
  }

  setTime(unixSecs: number): void {
    const clock = this.svm.getClock();
    clock.unixTimestamp = BigInt(unixSecs);
    clock.slot = clock.slot + 1n;
    this.svm.setClock(clock);
  }

  warp(secs: number): void {
    this.setTime(this.now() + secs);
  }

  async send(
    ix: TransactionInstruction | Promise<TransactionInstruction>,
    ...signers: Keypair[]
  ): Promise<void> {
    const instruction = await ix;
    for (const k of instruction.keys) this.known.add(k.pubkey.toBase58());
    const [payer] = signers;
    if (!payer) throw new Error("send() needs at least one signer");
    const tx = new Transaction().add(instruction);
    tx.recentBlockhash = this.svm.latestBlockhash();
    tx.feePayer = payer.publicKey;
    tx.sign(...signers);
    const res = this.svm.sendTransaction(tx);
    this.svm.expireBlockhash();
    if (res instanceof FailedTransactionMetadata) {
      const logs = res.meta().logs();
      throw new TxError(`${res.toString()}\n${logs.join("\n")}`, logs);
    }
  }

  async expectError(
    ix: TransactionInstruction | Promise<TransactionInstruction>,
    signers: Keypair[],
  ): Promise<string> {
    try {
      await this.send(ix, ...signers);
    } catch (e) {
      if (e instanceof TxError) return e.code;
      throw e;
    }
    throw new Error("Expected transaction to fail, but it succeeded");
  }

  // ------------------------------------------------------------------ fixtures

  async initConfig(minWindowSecs = 60, maxWindowSecs = 30 * 86_400): Promise<void> {
    await this.send(
      this.client.initializeConfig({
        admin: this.admin.publicKey,
        arbiter: this.arbiter.publicKey,
        minWindowSecs,
        maxWindowSecs,
      }),
      this.admin,
    );
  }

  async registerVendor(handle = "@ummie.styles"): Promise<void> {
    await this.send(
      this.client.registerVendor({ vendor: this.vendor.publicKey, handle }),
      this.vendor,
    );
  }

  /** Config + vendor + one order. Returns the order's address. */
  async setupOrder(
    opts: { amount?: bigint; buyer?: PublicKey; ship?: number; confirm?: number } = {},
  ): Promise<PublicKey> {
    if (!(await this.client.fetchConfig())) await this.initConfig();
    if (!(await this.client.fetchVendor(this.vendor.publicKey))) await this.registerVendor();
    const orderId = await this.client.nextOrderId(this.vendor.publicKey);
    await this.send(
      this.client.createOrder({
        vendor: this.vendor.publicKey,
        mint: this.mint,
        orderId,
        amount: opts.amount ?? usd(25),
        title: "Ankara wrap dress (size M)",
        shipWindowSecs: opts.ship ?? 3 * 86_400,
        confirmWindowSecs: opts.confirm ?? 5 * 86_400,
        buyer: opts.buyer,
      }),
      this.vendor,
    );
    return this.client.orderAddress(this.vendor.publicKey, orderId);
  }

  async order(address: PublicKey) {
    const o = await this.client.fetchOrder(address);
    if (!o) throw new Error(`Order ${address.toBase58()} not found`);
    return o;
  }

  async vendorProfile() {
    const p = await this.client.fetchVendor(this.vendor.publicKey);
    if (!p) throw new Error("Vendor not registered");
    return p;
  }

  async fund(address: PublicKey, buyer = this.buyer): Promise<void> {
    const o = await this.order(address);
    if (this.tokenBalance(buyer.publicKey) === null)
      this.setTokenBalance(buyer.publicKey, usd(1_000));
    await this.send(this.client.fundOrder({ buyer: buyer.publicKey, order: o }), buyer);
  }

  async ship(address: PublicKey, tracking = "GIGL-NG-4471-0098"): Promise<void> {
    await this.send(this.client.markShipped(await this.order(address), tracking), this.vendor);
  }

  async dispute(address: PublicKey, reason = "Wrong colour and size delivered"): Promise<void> {
    await this.send(this.client.openDispute(await this.order(address), reason), this.buyer);
  }

  // ------------------------------------------------------------------ fake RPC

  /**
   * Minimal `Connection` backed by LiteSVM, so the SDK's read path (Anchor account fetch,
   * getProgramAccounts with memcmp filters) runs unmodified against real on-chain bytes.
   */
  connection(): Connection {
    const toInfo = (address: PublicKey): AccountInfo<Buffer> | null => {
      const acc = this.svm.getAccount(address);
      if (!acc || acc.lamports === 0) return null;
      return { ...acc, data: Buffer.from(acc.data) };
    };
    const fake = {
      rpcEndpoint: "litesvm://local",
      commitment: "confirmed",
      getAccountInfo: (address: PublicKey) => Promise.resolve(toInfo(address)),
      getAccountInfoAndContext: (address: PublicKey) =>
        Promise.resolve({ context: { slot: 0 }, value: toInfo(address) }),
      getMultipleAccountsInfo: (addresses: PublicKey[]) =>
        Promise.resolve(addresses.map((a) => toInfo(a))),
      getLatestBlockhash: () =>
        Promise.resolve({ blockhash: this.svm.latestBlockhash(), lastValidBlockHeight: 1_000 }),
      getProgramAccounts: (programId: PublicKey, config?: GetProgramAccountsConfig) => {
        const filters = config?.filters ?? [];
        const rows: { pubkey: PublicKey; account: AccountInfo<Buffer> }[] = [];
        for (const key of this.known) {
          const pubkey = new PublicKey(key);
          const info = toInfo(pubkey);
          if (!info?.owner.equals(programId)) continue;
          const ok = filters.every((f) => {
            if ("dataSize" in f) return info.data.length === f.dataSize;
            const bytes = Buffer.from(utils.bytes.bs58.decode(f.memcmp.bytes));
            return info.data
              .subarray(f.memcmp.offset, f.memcmp.offset + bytes.length)
              .equals(bytes);
          });
          if (ok) rows.push({ pubkey, account: info });
        }
        return Promise.resolve(rows);
      },
    };
    return fake as unknown as Connection;
  }
}
