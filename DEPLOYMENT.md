# Aavegotchi Petter - Deployment Guide

## Architecture

- **Cloudflare Worker**: Runs the petting bot on a cron schedule (every 12 hours at 00:00 and 12:00 UTC)
- **Vercel Dashboard**: Nuxt app with health check, stats, and bot control

## EIP PetOperator Delegation

Owners keep their Aavegotchis and delegate petting to our bot—no transfer needed:

1. Owner calls `setPetOperatorForAll(petterAddress, true)` on the Aavegotchi Diamond
2. Owner registers in our dashboard (we verify on-chain)
3. Our petter pets their gotchis every 12 hours; petter wallet pays gas

## 1. Deploy Cloudflare Worker

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account

### Setup

```bash
cd worker
npm install
```

### Configure Secrets

Set these secrets via Wrangler (never commit them):

```bash
# Required
wrangler secret put PRIVATE_KEY      # Your wallet private key
wrangler secret put WALLET_ADDRESS   # Your wallet address
wrangler secret put BASE_RPC_URL     # https://mainnet.base.org
wrangler secret put DASHBOARD_URL    # https://your-app.vercel.app
wrangler secret put REPORT_SECRET    # Shared secret for report API (generate with: openssl rand -hex 32)
```

### Deploy

```bash
npm run deploy
```

### Test Locally

```bash
# Start dev server
npm run dev

# Trigger the scheduled handler manually
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+0+*+*+*"

# Or trigger via HTTP
curl -X POST http://localhost:8787/run
```

### Worker Endpoints

- `GET /health` - Health check (public)
- `POST /run` - Manual trigger (for testing)

## 2. Deploy Vercel Dashboard

### Prerequisites

- Vercel account
- Vercel KV database (or Upstash Redis)

### Environment Variables

Set these in Vercel Project Settings → Environment Variables:

```
# Wallet (for manual trigger from dashboard)
PRIVATE_KEY=your_private_key
WALLET_ADDRESS=your_wallet_address
BASE_RPC_URL=https://mainnet.base.org

# Auth - wallet address allowed to access dashboard
ALLOWED_ADDRESS=0xYourWalletAddress

# Report API - must match Cloudflare REPORT_SECRET
REPORT_SECRET=your_shared_secret_from_openssl

# Vercel KV (create at vercel.com/storage)
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=your_token
```

### Deploy

```bash
cd web
npm install
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Dashboard Endpoints

- `GET /api/health` - Health check (public, no auth)
- `GET /api/stats` - Stats (requires auth)
- `POST /api/bot/report` - Webhook for Cloudflare Worker (authenticated via X-Report-Secret)

## 3. Connect Cloudflare to Vercel

1. Deploy the Vercel dashboard first to get your URL
2. Set `DASHBOARD_URL` and `REPORT_SECRET` in Cloudflare Worker secrets
3. Set the same `REPORT_SECRET` in Vercel environment variables
4. Deploy the Cloudflare Worker

The Worker will POST results to `https://your-dashboard.vercel.app/api/bot/report` after each run.

## 4. Verify Deployment

1. **Health Check**: `curl https://your-dashboard.vercel.app/api/health`
2. **Worker Health**: `curl https://aavegotchi-petter.<your-subdomain>.workers.dev/health`
3. **Manual Trigger**: Use the dashboard "Trigger Now" button (runs on Vercel) or call the Worker's `/run` endpoint
