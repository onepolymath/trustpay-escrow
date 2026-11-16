import { TrustPayClient } from "@trustpay/sdk";
import { Connection } from "@solana/web3.js";

import { RPC_URL } from "./config";

let connection: Connection | undefined;
let client: TrustPayClient | undefined;

export function getConnection(): Connection {
  connection ??= new Connection(RPC_URL, "confirmed");
  return connection;
}

export function getClient(): TrustPayClient {
  client ??= new TrustPayClient(getConnection());
  return client;
}
