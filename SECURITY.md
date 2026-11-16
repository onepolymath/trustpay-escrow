# Security policy

TrustPay holds buyers' money in escrow, so any way to move funds somewhere the rules don't allow is a security issue.

**Please report privately** via [GitHub security advisories](https://github.com/onepolymath/trustpay-escrow/security/advisories/new). Include the instruction sequence (a failing LiteSVM test is ideal) and devnet signatures if you have them. Never send real keys.

In scope:

- moving escrowed tokens to anyone other than the order's buyer or vendor;
- settling an order twice, or settling outside the state machine;
- the arbiter (or anyone else) influencing an order they are a party to;
- writing to a vendor's reputation without a real settlement;
- taking over the config without the program's upgrade authority;
- server-side key leakage in the web app (`/api/demo/*`).

See the [threat model](docs/THREAT_MODEL.md) for what the program does and does not defend against.

This is hackathon-stage, **unaudited** software running on Solana **devnet**. Do not use it with real funds.
