import cron from 'node-cron'
import { runPetting } from './lib/pet.js'

export function startCron(): void {
  const schedule = process.env.CRON_SCHEDULE || '0 * * * *'
  const privateKey = process.env.PETTER_PRIVATE_KEY
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey || !privateKey.startsWith('0x')) {
    console.warn('[cron] PETTER_PRIVATE_KEY not configured, skipping scheduled petting')
    return
  }

  cron.schedule(schedule, async () => {
    try {
      const result = await runPetting({
        force: false,
        privateKey,
        petterAddress,
        baseRpcUrl,
      })
      console.log(`[cron] Petting run: ${result.message}`)
    } catch (err) {
      console.error('[cron] Petting failed:', err)
    }
  })

  console.log(`[cron] Scheduled petting: ${schedule}`)
}
