# Aavegotchi Petter (Backend)

Node.js backend for automated Aavegotchi petting on Base. Uses in-memory storage. Pairs with **AavegotchiPetterUI** as the admin dashboard.

## Architecture

- **Aavegotchi-Petter** (this repo): Petting logic, REST API, cron, in-memory storage
- **AavegotchiPetterUI**: Nuxt admin dashboard (proxies to this API)
- **Storage**: In-memory (bot state, delegated owners, logs — data lost on restart)

## Prerequisites

- Node.js 20+

## Quick Start

```bash
# 1. Configure
cp .env.example .env
# Edit .env: PETTER_PRIVATE_KEY, REPORT_SECRET

# 2. Run
npm install
npm run build
npm start
```

Runs at http://localhost:3001

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PETTER_PRIVATE_KEY` | Yes | Wallet key (0x...) |
| `REPORT_SECRET` | Yes | API auth (X-Report-Secret) |
| `PETTER_ADDRESS` | Optional | Petter wallet address |
| `BASE_RPC_URL` | Optional | Base RPC (default: mainnet.base.org) |
| `PORT` | Optional | Server port (default: 3001) |
| `CRON_SCHEDULE` | Optional | Cron pattern (default: every hour) |

## API

All `/api/*` routes require `X-Report-Secret` header.

- `GET /health` – Health check (no auth)
- `GET /api/bot/status` – Bot state
- `POST /api/bot/start` | `stop` | `run` | `trigger`
- `GET /api/bot/logs` | `config` | `frequency`
- `POST /api/bot/frequency`
- `GET /api/delegation/owners` | `registered`
- `POST /api/delegation/register` | `unregister` | `clear-all`
- `GET /api/delegated-owners` – For AarcadeGh-t / external cron
- `GET /api/transactions` | `POST /api/transactions/clear`
- `GET /api/errors` | `POST /api/errors/clear`
- `GET /api/petter-balance`

## Deployment (PM2)

```bash
npm run build
pm2 start dist/index.js --name petter
pm2 save
pm2 startup
```

## Contract

- **Network**: Base Mainnet (Chain ID: 8453)
- **Diamond**: `0xA99c4B08201F2913Db8D28e71d020c4298F29dBF`
- **Function**: `interact(uint256[] calldata _tokenIds)`

## License

MIT
