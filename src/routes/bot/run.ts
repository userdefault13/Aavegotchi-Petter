import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { runPetting } from '../../lib/pet.js'
import { addManualTriggerLog } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postBotRun(event: H3Event) {
  requireApiAuth(event)

  const privateKey = process.env.PETTER_PRIVATE_KEY
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('PETTER_PRIVATE_KEY not configured')
  }

  let body: { force?: boolean } = {}
  try {
    body = (await readBody(event)) as { force?: boolean }
  } catch {
    /* empty body ok */
  }

  const result = await runPetting({
    force: body?.force === true,
    privateKey,
    petterAddress,
    baseRpcUrl,
  })

  try {
    await addManualTriggerLog({
      id: `manual-${Date.now()}`,
      timestamp: Date.now(),
      message: result.message || 'Manual trigger completed',
      petted: result.petted,
    })
  } catch {
    /* ignore */
  }

  return result
}
