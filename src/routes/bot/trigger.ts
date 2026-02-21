import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { runPetting } from '../../lib/pet.js'
import { addManualTriggerLog } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postBotTrigger(event: H3Event) {
  requireApiAuth(event)

  const privateKey = process.env.PETTER_PRIVATE_KEY
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey || !privateKey.startsWith('0x')) {
    return { success: false, error: 'PETTER_PRIVATE_KEY not configured' }
  }

  let body: { force?: boolean } = {}
  try {
    body = (await readBody(event)) as { force?: boolean }
  } catch {
    /* empty body ok */
  }

  try {
    const result = await runPetting({
      force: body?.force !== false,
      privateKey,
      petterAddress,
      baseRpcUrl,
    })
    await addManualTriggerLog({
      id: `manual-${Date.now()}`,
      timestamp: Date.now(),
      message: result.message || 'Manual trigger completed',
      petted: result.petted,
    })
    return { success: true, result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
