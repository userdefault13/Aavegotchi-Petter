# Wallet Update Guide

When you create and fund a new petter wallet, update these locations:

## Petter Node Server (src/)

**Current petter wallet:** `0x9b23dB04457D9aF944858681331E40da8c91981F`

Update `.env` in the Petter root:

| Variable | Description |
|----------|-------------|
| `PETTER_PRIVATE_KEY` | Private key for the petter wallet (0x-prefixed hex) – **must** correspond to `PETTER_ADDRESS` |
| `PETTER_ADDRESS` | The petter wallet that signs transactions and holds gas |

**Important:** `PETTER_PRIVATE_KEY` and `PETTER_ADDRESS` must be for the same wallet. The petter wallet needs ETH on Base for gas.

After updating, restart the Petter (`npm run dev`).

## Cloudflare Worker (this repo)

Update secrets via Wrangler:

```bash
cd worker
wrangler secret put PRIVATE_KEY    # Your new wallet private key
wrangler secret put WALLET_ADDRESS # Your new wallet address
```

Then redeploy:
```bash
npm run deploy
```

## Dashboard (AavegotchiPetterUI)

If you use the separate AavegotchiPetterUI dashboard, update its `.env` and Vercel env vars:

- `ALLOWED_ADDRESSES` – your new wallet address
- `PETTER_ADDRESS` – your new petter wallet address  
- `WALLET_ADDRESS` – your new wallet address
- `PRIVATE_KEY` – your new wallet's private key

See `AavegotchiPetterUI/WALLET_UPDATE.md` for full details.
