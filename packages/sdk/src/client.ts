import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { Commitment, Connection, TransactionInstruction } from "@solana/web3.js";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

import {
  BPS_DENOMINATOR,
  MAX_HANDLE_LEN,
  MAX_REASON_LEN,
  MAX_TITLE_LEN,
  MAX_TRACKING_LEN,
  ORDER_OFFSETS,
  TRUSTPAY_PROGRAM_ID,
} from "./constants.js";
import { decodeConfig, decodeOrder, decodeVendorProfile } from "./decode.js";
import { IDL } from "./idl/idl.js";
import type { Trustpay } from "./idl/trustpay.js";
import {
  findConfigPda,
  findOrderPda,
  findProgramDataAddress,
  findVaultAddress,
  findVendorPda,
} from "./pda.js";
import type { ConfigAccount, OrderAccount, OrderStatus, VendorProfileAccount } from "./types.js";

/** Wallet stub: the client only builds instructions, it never signs. */
const READ_ONLY_WALLET: Wallet = {
  publicKey: PublicKey.default,
  signTransaction: () => Promise.reject(new Error("TrustPayClient never signs")),
  signAllTransactions: () => Promise.reject(new Error("TrustPayClient never signs")),
};

export interface CreateOrderParams {
  vendor: PublicKey;
  mint: PublicKey;
  orderId: bigint;
  amount: bigint;
  title: string;
  shipWindowSecs: number;
  confirmWindowSecs: number;
  /** Lock the order to one buyer wallet. */
  buyer?: PublicKey | undefined;
}

export interface UpdateConfigParams {
  admin: PublicKey;
  newAdmin?: PublicKey | undefined;
  newArbiter?: PublicKey | undefined;
  windowBounds?: { minSecs: number; maxSecs: number } | undefined;
}

type FundedOrder = Pick<OrderAccount, "address" | "vendor" | "mint" | "orderId"> & {
  buyer: PublicKey | null;
};

function requireBuyer(order: FundedOrder): PublicKey {
  if (!order.buyer) throw new Error("Order has no buyer yet");
  return order.buyer;
}

function assertText(field: string, value: string, max: number, allowEmpty = false): void {
  const bytes = new TextEncoder().encode(value).length;
  if (!allowEmpty && value.trim().length === 0) throw new Error(`${field} is required`);
  if (bytes > max) throw new Error(`${field} must be at most ${max} bytes`);
}

/**
 * Typed client for the TrustPay program.
 *
 * Every write method returns a `TransactionInstruction` instead of sending, so the same code
 * path serves browser wallets, server-side Solana Actions, and in-process tests.
 */
export class TrustPayClient {
  readonly program: Program<Trustpay>;
  readonly programId: PublicKey;

  constructor(
    readonly connection: Connection,
    opts: { commitment?: Commitment } = {},
  ) {
    const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
      commitment: opts.commitment ?? "confirmed",
    });
    this.program = new Program<Trustpay>(IDL, provider);
    this.programId = TRUSTPAY_PROGRAM_ID;
  }

  // ---------------------------------------------------------------- addresses

  configAddress(): PublicKey {
    return findConfigPda(this.programId);
  }

  vendorAddress(vendor: PublicKey): PublicKey {
    return findVendorPda(vendor, this.programId);
  }

  orderAddress(vendor: PublicKey, orderId: bigint): PublicKey {
    return findOrderPda(vendor, orderId, this.programId);
  }

  // ---------------------------------------------------------------- admin

  initializeConfig(params: {
    admin: PublicKey;
    arbiter: PublicKey;
    minWindowSecs: number;
    maxWindowSecs: number;
  }): Promise<TransactionInstruction> {
    return this.program.methods
      .initializeConfig(params.arbiter, new BN(params.minWindowSecs), new BN(params.maxWindowSecs))
      .accountsStrict({
        admin: params.admin,
        config: this.configAddress(),
        program: this.programId,
        programData: findProgramDataAddress(this.programId),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  updateConfig(params: UpdateConfigParams): Promise<TransactionInstruction> {
    const bounds = params.windowBounds
      ? {
          minSecs: new BN(params.windowBounds.minSecs),
          maxSecs: new BN(params.windowBounds.maxSecs),
        }
      : null;
    return this.program.methods
      .updateConfig(params.newAdmin ?? null, params.newArbiter ?? null, bounds)
      .accountsStrict({ admin: params.admin, config: this.configAddress() })
      .instruction();
  }

  // ---------------------------------------------------------------- vendor

  registerVendor(params: { vendor: PublicKey; handle: string }): Promise<TransactionInstruction> {
    assertText("Handle", params.handle, MAX_HANDLE_LEN);
    return this.program.methods
      .registerVendor(params.handle)
      .accountsStrict({
        vendor: params.vendor,
        vendorProfile: this.vendorAddress(params.vendor),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  createOrder(params: CreateOrderParams): Promise<TransactionInstruction> {
    assertText("Title", params.title, MAX_TITLE_LEN);
    if (params.amount <= 0n) throw new Error("Amount must be greater than zero");
    return this.program.methods
      .createOrder({
        orderId: new BN(params.orderId.toString()),
        amount: new BN(params.amount.toString()),
        title: params.title,
        shipWindowSecs: new BN(params.shipWindowSecs),
        confirmWindowSecs: new BN(params.confirmWindowSecs),
        buyer: params.buyer ?? null,
      })
      .accountsStrict({
        vendor: params.vendor,
        config: this.configAddress(),
        vendorProfile: this.vendorAddress(params.vendor),
        mint: params.mint,
        order: this.orderAddress(params.vendor, params.orderId),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  cancelOrder(order: Pick<OrderAccount, "address" | "vendor">): Promise<TransactionInstruction> {
    return this.program.methods
      .cancelOrder()
      .accountsStrict({ vendor: order.vendor, order: order.address })
      .instruction();
  }

  markShipped(
    order: Pick<OrderAccount, "address" | "vendor">,
    tracking: string,
  ): Promise<TransactionInstruction> {
    assertText("Tracking", tracking, MAX_TRACKING_LEN, true);
    return this.program.methods
      .markShipped(tracking)
      .accountsStrict({ vendor: order.vendor, order: order.address })
      .instruction();
  }

  refundByVendor(order: FundedOrder): Promise<TransactionInstruction> {
    const buyer = requireBuyer(order);
    return this.program.methods
      .refundByVendor()
      .accountsStrict({
        vendor: order.vendor,
        order: order.address,
        vendorProfile: this.vendorAddress(order.vendor),
        buyer,
        mint: order.mint,
        vault: findVaultAddress(order.address, order.mint),
        buyerToken: getAssociatedTokenAddressSync(order.mint, buyer, true),
        ...this.tokenPrograms(),
      })
      .instruction();
  }

  // ---------------------------------------------------------------- buyer

  fundOrder(params: {
    buyer: PublicKey;
    order: Pick<OrderAccount, "address" | "mint">;
  }): Promise<TransactionInstruction> {
    const { buyer, order } = params;
    return this.program.methods
      .fundOrder()
      .accountsStrict({
        buyer,
        order: order.address,
        mint: order.mint,
        buyerToken: getAssociatedTokenAddressSync(order.mint, buyer, true),
        vault: findVaultAddress(order.address, order.mint),
        ...this.tokenPrograms(),
      })
      .instruction();
  }

  openDispute(order: FundedOrder, reason: string): Promise<TransactionInstruction> {
    assertText("Reason", reason, MAX_REASON_LEN);
    return this.program.methods
      .openDispute(reason)
      .accountsStrict({
        buyer: requireBuyer(order),
        order: order.address,
        vendorProfile: this.vendorAddress(order.vendor),
      })
      .instruction();
  }

  confirmDelivery(order: FundedOrder): Promise<TransactionInstruction> {
    return this.program.methods
      .confirmDelivery()
      .accountsStrict({
        buyer: requireBuyer(order),
        order: order.address,
        vendorProfile: this.vendorAddress(order.vendor),
        vendor: order.vendor,
        mint: order.mint,
        vault: findVaultAddress(order.address, order.mint),
        vendorToken: getAssociatedTokenAddressSync(order.mint, order.vendor, true),
        ...this.tokenPrograms(),
      })
      .instruction();
  }

  reclaimUnshipped(order: FundedOrder): Promise<TransactionInstruction> {
    const buyer = requireBuyer(order);
    return this.program.methods
      .reclaimUnshipped()
      .accountsStrict({
        buyer,
        order: order.address,
        vendorProfile: this.vendorAddress(order.vendor),
        mint: order.mint,
        vault: findVaultAddress(order.address, order.mint),
        buyerToken: getAssociatedTokenAddressSync(order.mint, buyer, true),
        ...this.tokenPrograms(),
      })
      .instruction();
  }

  // ---------------------------------------------------------------- permissionless / arbiter

  autoRelease(params: { cranker: PublicKey; order: FundedOrder }): Promise<TransactionInstruction> {
    const { order } = params;
    return this.program.methods
      .autoRelease()
      .accountsStrict({
        cranker: params.cranker,
        order: order.address,
        vendorProfile: this.vendorAddress(order.vendor),
        buyer: requireBuyer(order),
        vendor: order.vendor,
        mint: order.mint,
        vault: findVaultAddress(order.address, order.mint),
        vendorToken: getAssociatedTokenAddressSync(order.mint, order.vendor, true),
        ...this.tokenPrograms(),
      })
      .instruction();
  }

  resolveDispute(params: {
    arbiter: PublicKey;
    order: FundedOrder;
    buyerBps: number;
  }): Promise<TransactionInstruction> {
    const { order, buyerBps } = params;
    if (!Number.isInteger(buyerBps) || buyerBps < 0 || buyerBps > BPS_DENOMINATOR) {
      throw new Error("buyerBps must be an integer between 0 and 10000");
    }
    const buyer = requireBuyer(order);
    return this.program.methods
      .resolveDispute(buyerBps)
      .accountsStrict({
        arbiter: params.arbiter,
        config: this.configAddress(),
        order: order.address,
        vendorProfile: this.vendorAddress(order.vendor),
        buyer,
        vendor: order.vendor,
        mint: order.mint,
        vault: findVaultAddress(order.address, order.mint),
        buyerToken: getAssociatedTokenAddressSync(order.mint, buyer, true),
        vendorToken: getAssociatedTokenAddressSync(order.mint, order.vendor, true),
        ...this.tokenPrograms(),
      })
      .instruction();
  }

  // ---------------------------------------------------------------- reads

  async fetchConfig(): Promise<ConfigAccount | null> {
    const address = this.configAddress();
    const raw = await this.program.account.config.fetchNullable(address);
    return raw ? decodeConfig(address, raw) : null;
  }

  async fetchVendor(vendor: PublicKey): Promise<VendorProfileAccount | null> {
    const address = this.vendorAddress(vendor);
    const raw = await this.program.account.vendorProfile.fetchNullable(address);
    return raw ? decodeVendorProfile(address, raw) : null;
  }

  async fetchOrder(address: PublicKey): Promise<OrderAccount | null> {
    const raw = await this.program.account.order.fetchNullable(address);
    return raw ? decodeOrder(address, raw) : null;
  }

  fetchOrderById(vendor: PublicKey, orderId: bigint): Promise<OrderAccount | null> {
    return this.fetchOrder(this.orderAddress(vendor, orderId));
  }

  /** Lists orders straight from program accounts; no off-chain indexer required. */
  async listOrders(
    filter: { vendor?: PublicKey; buyer?: PublicKey; status?: OrderStatus } = {},
  ): Promise<OrderAccount[]> {
    const memcmp = [
      ...(filter.vendor
        ? [{ memcmp: { offset: ORDER_OFFSETS.vendor, bytes: filter.vendor.toBase58() } }]
        : []),
      ...(filter.buyer
        ? [{ memcmp: { offset: ORDER_OFFSETS.buyer, bytes: filter.buyer.toBase58() } }]
        : []),
    ];
    const rows = await this.program.account.order.all(memcmp);
    return rows
      .map((r) => decodeOrder(r.publicKey, r.account))
      .filter((o) => !filter.status || o.status === filter.status)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async listVendors(): Promise<VendorProfileAccount[]> {
    const rows = await this.program.account.vendorProfile.all();
    return rows.map((r) => decodeVendorProfile(r.publicKey, r.account));
  }

  /** The id the next `createOrder` must use (ids are sequential per vendor). */
  async nextOrderId(vendor: PublicKey): Promise<bigint> {
    const profile = await this.fetchVendor(vendor);
    if (!profile) throw new Error("Vendor is not registered");
    return profile.ordersCreated;
  }

  async buildTransaction(
    instructions: TransactionInstruction[],
    feePayer: PublicKey,
  ): Promise<Transaction> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    return new Transaction({ feePayer, blockhash, lastValidBlockHeight }).add(...instructions);
  }

  private tokenPrograms() {
    return {
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
  }
}
