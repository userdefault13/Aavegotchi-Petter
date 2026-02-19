# Wallet Update Guide

When you create and fund a new petter wallet, update these locations:

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
