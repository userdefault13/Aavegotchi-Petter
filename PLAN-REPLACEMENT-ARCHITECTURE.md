# Plan: Replace Aavegotchi Petter + AavegotchiPetterUI

## Goal

Split the current monolith into two self-hosted components:

| Repo | Role | Runs |
|------|------|------|
| **Aavegotchi-Petter** | Petting backend + Redis | Node service on spare computer |
| **AavegotchiPetterUI** | Admin dashboard only | Nuxt app on same computer |

No cloud services. Redis runs locally. All secrets stay on the spare computer.

---

## Current State

### AavegotchiPetterUI (monolith)
- Nuxt 3 app with Nitro
- **Server**: API routes, scheduled tasks, `@vercel/kv` (Upstash REST)
- **Logic**: `lib/pet.ts`, `lib/kv.ts`, `lib/auth.ts`
- **UI**: BotControl, DelegationCard, WalletConnect, HomeDashboard
- **Auth**: Wallet sign-in (ALLOWED_ADDRESS), session cookie
- **Scheduling**: Nitro `pet` task via cron

### Aavegotchi-Petter (deprecated)
- Cloudflare Worker
- Fetched delegated owners + config from dashboard
- Reported results to dashboard
- Scheduled via Cloudflare cron

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Spare Computer                                                  │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────────────┐   │
│  │  Redis               │     │  Aavegotchi-Petter           │   │
│  │  (localhost:6379)     │◄────│  Node + Express/H3           │   │
│  │                      │     │  - Petting logic              │   │
│  │  - bot:state         │     │  - REST API                  │   │
│  │  - delegated:owners  │     │  - Cron (node-cron)          │   │
│  │  - worker_logs       │     │  - ioredis                   │   │
│  │  - transactions      │     │  Port: 3001                  │   │
│  │  - errors, etc.      │     └──────────────▲───────────────┘   │
│  └──────────────────────┘                    │                   │
│                                              │ HTTP (proxy)      │
│  ┌──────────────────────┐                    │                   │
│  │  AavegotchiPetterUI  │────────────────────┘                   │
│  │  Nuxt admin dashboard │                                        │
│  │  - UI only           │  Nuxt server routes proxy to Petter     │
│  │  - Proxy API routes  │  with PETTER_API_SECRET                │
│  │  Port: 3000          │                                        │
│  └──────────────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Aavegotchi-Petter (Backend)

### Responsibilities
- Petting logic (from `lib/pet.ts`)
- Redis storage (ioredis, local Redis)
- REST API for dashboard
- Cron scheduling (node-cron or similar)
- **No UI**

### Tech Stack
- Node 20+
- Express or H3 (lightweight)
- ioredis
- viem (for blockchain)
- node-cron

### REST API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | none | Health check |
| GET | /api/bot/status | secret | Bot state |
| POST | /api/bot/start | secret | Start bot |
| POST | /api/bot/stop | secret | Stop bot |
| POST | /api/bot/run | secret | Run petting (force?: boolean) |
| POST | /api/bot/trigger | secret | Manual trigger (calls run with force) |
| GET | /api/bot/logs | secret | Worker logs |
| GET | /api/bot/config | secret | Config (running, interval, etc.) |
| POST | /api/bot/frequency | secret | Set petting interval |
| GET | /api/delegation/owners | secret | Delegated owners |
| GET | /api/delegation/registered | secret | Registered owners |
| POST | /api/delegation/register | secret | Register owner |
| POST | /api/delegation/unregister | secret | Unregister owner |
| POST | /api/delegation/clear-all | secret | Clear all |
| GET | /api/transactions | secret | Transaction history |
| POST | /api/transactions/clear | secret | Clear transactions |
| GET | /api/errors | secret | Error logs |
| POST | /api/errors/clear | secret | Clear errors |
| GET | /api/petter-balance | secret | Petter ETH balance |

**Auth**: All `/api/*` require `X-Report-Secret` or `Authorization: Bearer <PETTER_API_SECRET>`.

### File Structure (Aavegotchi-Petter)

```
Aavegotchi-Petter/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts           # Express/H3 server entry
│   ├── lib/
│   │   ├── redis.ts       # ioredis client (replaces lib/kv.ts)
│   │   ├── pet.ts         # Petting logic (from PetterUI)
│   │   └── auth.ts        # Check X-Report-Secret
│   ├── routes/
│   │   ├── health.ts
│   │   ├── bot/
│   │   │   ├── status.ts
│   │   │   ├── start.ts
│   │   │   ├── stop.ts
│   │   │   ├── run.ts
│   │   │   ├── trigger.ts
│   │   │   ├── logs.ts
│   │   │   ├── config.ts
│   │   │   └── frequency.ts
│   │   ├── delegation/
│   │   │   ├── owners.ts
│   │   │   ├── registered.ts
│   │   │   ├── register.ts
│   │   │   ├── unregister.ts
│   │   │   └── clear-all.ts
│   │   ├── transactions/
│   │   │   ├── index.ts
│   │   │   └── clear.ts
│   │   ├── errors/
│   │   │   ├── index.ts
│   │   │   └── clear.ts
│   │   └── petter-balance.ts
│   └── cron.ts            # node-cron for pet task
└── worker/                # DELETE (old Cloudflare Worker)
```

### Environment Variables (Aavegotchi-Petter)

| Variable | Required | Description |
|----------|----------|-------------|
| REDIS_URL | Yes | `redis://localhost:6379` |
| PETTER_PRIVATE_KEY | Yes | Wallet key (0x...) |
| PETTER_ADDRESS | Optional | Petter wallet address |
| REPORT_SECRET | Yes | API auth (X-Report-Secret) |
| BASE_RPC_URL | Optional | Base RPC (default: mainnet.base.org) |
| PORT | Optional | Server port (default: 3001) |
| CRON_SCHEDULE | Optional | Cron pattern (default: `0 * * * *`) |

---

## AavegotchiPetterUI (Admin Dashboard)

### Responsibilities
- **UI only**: BotControl, DelegationCard, WalletConnect, HomeDashboard
- **Auth**: Wallet sign-in (unchanged)
- **API proxy**: Nuxt server routes receive `/api/*`, verify session, proxy to Petter with secret

### Changes
1. **Remove**: `lib/kv.ts`, `lib/pet.ts`, Nitro scheduled tasks
2. **Remove**: `@vercel/kv` dependency
3. **Add**: Proxy layer – server routes call `http://localhost:3001/api/...` with `X-Report-Secret`
4. **Keep**: All Vue components, composables, auth flow
5. **Config**: `PETTER_API_URL` (e.g. `http://localhost:3001`), `PETTER_API_SECRET` (= REPORT_SECRET)

### Proxy Flow

```
Browser  →  GET /api/bot/status  →  Nuxt server
                                         ↓
                                    Check session (auth)
                                         ↓
                                    fetch(PETTER_API_URL + '/api/bot/status', {
                                      headers: { 'X-Report-Secret': PETTER_API_SECRET }
                                    })
                                         ↓
                                    Return response to browser
```

- **Read-only (no session)**: e.g. `/api/bot/status` when not logged in – could show limited info or require login
- **Write / sensitive**: Require wallet session, then proxy with secret

### Environment Variables (AavegotchiPetterUI)

| Variable | Required | Description |
|----------|----------|-------------|
| PETTER_API_URL | Yes | `http://localhost:3001` |
| PETTER_API_SECRET | Yes | Same as Petter's REPORT_SECRET |
| ALLOWED_ADDRESS | Optional | Dashboard admin wallet(s) |
| BASE_RPC_URL | Optional | For wallet connect / display |

**Removed**: KV_REST_API_URL, KV_REST_API_TOKEN, PETTER_PRIVATE_KEY, REPORT_SECRET (moved to Petter), CRON_SCHEDULE

---

## Redis Schema (unchanged)

Same keys as current `lib/kv.ts`:
- `bot:state` – BotState
- `bot:petting_interval_hours` – number
- `delegated:owners` – string[]
- `worker_logs` – list
- `transactions` – list
- `manual_triggers` – list
- `errors` – list

---

## Migration Phases

### Phase 1: Aavegotchi-Petter backend
1. Create new Node project in Aavegotchi-Petter (alongside or replace worker/)
2. Add `lib/redis.ts` with ioredis (same interface as kv.ts)
3. Copy `lib/pet.ts` from PetterUI, update imports to use redis
4. Implement REST routes (Express or H3)
5. Add node-cron for scheduled petting
6. Test: `curl -H "X-Report-Secret: x" http://localhost:3001/api/bot/status`

### Phase 2: AavegotchiPetterUI proxy
1. Replace server API routes with proxy to Petter
2. Remove lib/kv.ts, lib/pet.ts, @vercel/kv
3. Remove Nitro scheduled tasks
4. Add PETTER_API_URL, PETTER_API_SECRET
5. Update nuxt.config.ts (remove kv, cron)
6. Test: run both, use dashboard

### Phase 3: Cleanup
1. Delete Aavegotchi-Petter/worker/
2. Update READMEs, LOCAL-RUN.md
3. Document deployment (PM2, systemd)

---

## Deployment (Spare Computer)

```bash
# 1. Redis
brew install redis   # or apt install redis-server
brew services start redis

# 2. Aavegotchi-Petter
cd Aavegotchi-Petter
npm install
# .env: REDIS_URL, PETTER_PRIVATE_KEY, REPORT_SECRET, etc.
npm run build && npm start
# Or: pm2 start dist/index.js --name petter

# 3. AavegotchiPetterUI
cd AavegotchiPetterUI
npm install
# .env: PETTER_API_URL=http://localhost:3001, PETTER_API_SECRET=...
npm run build
pm2 start .output/server/index.mjs --name petter-ui
```

---

## Security Notes

1. **Secrets**: Petter holds PETTER_PRIVATE_KEY and REPORT_SECRET. Dashboard only needs PETTER_API_SECRET to proxy.
2. **Network**: Petter binds to localhost. Dashboard proxies; no direct Petter access from browser.
3. **Auth**: Dashboard still uses wallet sign-in for admin actions. Petter trusts requests with correct X-Report-Secret (from dashboard proxy only).
4. **Redis**: No password by default for localhost; optional `requirepass` for extra security.

---

## Open Questions

1. **Petter framework**: Express vs H3 (H3 is smaller, Nuxt-compatible)
2. **Session + proxy**: Should unauthenticated users see any bot status, or require login for all?
3. **AarcadeGh-t**: Continues to register via dashboard; dashboard proxies to Petter `/api/delegation/register` – confirm flow
