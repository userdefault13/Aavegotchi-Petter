# Plan: New Auto Petter

## Context

The previous Cloudflare Worker was draining funds to `0xeeeee9097186264C53175D3Af6840a8dD5dc7b6C` within seconds of receiving ETH. A new wallet (not added to the worker) had no outbound transactions. The worker code in the repo only calls `contract.interact()` with 0 value—so either the deployed worker differed from the repo, or a dependency/edge case caused the drain. We're starting fresh.

---

## Goals

1. **Automated petting** – Pet delegated Aavegotchis on a schedule (e.g. every 12h)
2. **Security** – No ETH transfers except gas for `interact()`; no external calls that could leak keys
3. **Transparency** – Minimal, auditable code; easy to verify behavior
4. **Dashboard integration** – Start/stop, manual trigger, logs (reuse AavegotchiPetterUI)

---

## Architecture Options

### Option A: New Cloudflare Worker (minimal rewrite)

- **Pros:** Same infra, cron, cheap
- **Cons:** Previous worker drained funds; need to rule out Cloudflare/env issues

**Mitigation:** Strip to bare minimum—only `interact()`, no extra deps. Deploy from a clean branch. Test with tiny amounts first.

### Option B: Vercel Serverless (API route + external cron)

- **Pros:** Same stack as dashboard; no separate Cloudflare account; code in one repo
- **Cons:** Vercel serverless has execution limits; need external cron (e.g. cron-job.org, Upstash QStash)

**Flow:** Cron service hits `POST /api/bot/run` → serverless runs petting logic → signs with `PRIVATE_KEY` env var.

### Option C: Standalone Node script + system cron / GitHub Actions

- **Pros:** Full control; no serverless limits; easy to audit
- **Cons:** Needs a always-on machine or scheduled job; key storage on that machine

**Flow:** `node scripts/pet.js` runs on schedule; reads config + key from env; calls `interact()`.

### Option D: Reown / third-party relayer

- **Pros:** No key in our infra
- **Cons:** Extra setup; may not support custom `interact()` flow

---

## Recommended: Option B (Vercel + external cron)

- Keeps dashboard and petter in one place
- No Cloudflare Worker (avoids previous drain environment)
- Reuse existing `/api/bot/run`-style API in AavegotchiPetterUI
- Use Upstash QStash or cron-job.org for scheduling

---

## Implementation Plan

### Phase 1: Secure petting API (no worker)

1. **Create `POST /api/bot/run`** in AavegotchiPetterUI (or Aavegotchi-Petter web)
   - Auth: `X-Report-Secret` header (same as worker report)
   - Logic: fetch delegated owners from KV → check gotchis → call `interact(tokenIds)` via ethers
   - **Only** `contract.interact()` – no `sendTransaction`, `transfer`, or `wallet.sendTransaction` with value
   - Return: `{ success, transactionHash?, petted?, error? }`

2. **Key storage**
   - `PRIVATE_KEY` in Vercel env (encrypted at rest)
   - Never log, never send to external APIs
   - Consider Vercel's secret rotation

3. **Audit checklist**
   - [ ] No `wallet.sendTransaction({ to: ..., value: ... })` except implicit in `contract.interact()`
   - [ ] No fetch/axios to unknown URLs with key
   - [ ] No `eval`, `Function`, or dynamic code execution

### Phase 2: Scheduler

1. **Upstash QStash** (or similar)
   - Create schedule: e.g. every 12 hours
   - Target: `POST https://your-dashboard.vercel.app/api/bot/run`
   - Headers: `X-Report-Secret: <secret>`

2. **Respect dashboard "running" flag**
   - `/api/bot/run` checks KV `bot:state.running` before petting
   - If stopped, return `{ success: true, skipped: true }` and do nothing

### Phase 3: Dashboard updates

1. **Remove Cloudflare Worker references**
   - Already done: `WORKER_URL` empty hides Bot Control, etc.

2. **Wire "Trigger Now" to new API**
   - `POST /api/bot/run` with `force: true` (bypass running check for manual trigger)

3. **Worker Logs**
   - `/api/bot/run` writes to KV `worker_logs` (same as before) so dashboard can show logs

### Phase 4: Testing

1. **Testnet first** (Base Sepolia if Aavegotchi supports it, or small amounts on mainnet)
2. **Fund with 0.0001 ETH** → run once → verify only `interact()` tx, no outbound ETH transfer
3. **Monitor for 24h** – no unexpected outbound txs

---

## Security Principles

1. **Single responsibility** – The petter only calls `interact()`. No swaps, no transfers, no relayers.
2. **Minimal dependencies** – ethers, fetch for KV/RPC. No extra packages that could introduce malicious behavior.
3. **Explicit allowlist** – Only call Aavegotchi diamond at `0xA99c4B08201F2913Db8D28e71d020c4298F29dBF`.
4. **No dynamic code** – No loading scripts from URLs, no `eval`.

---

## File Structure (Option B)

```
AavegotchiPetterUI/
  server/
    api/
      bot/
        run.post.ts    # NEW: does petting (replaces worker)
        trigger.post.ts # Calls run.post with force
        config.get.ts  # Keep for compatibility
        ...
```

Or in Aavegotchi-Petter:

```
Aavegotchi-Petter/
  web/
    server/
      api/
        bot/
          run.post.ts  # Petting logic
```

---

## Next Steps

1. Choose architecture (A, B, C, or D)
2. Implement Phase 1 (petting API)
3. Test on small balance
4. Add scheduler (Phase 2)
5. Deploy and monitor
