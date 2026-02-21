import type { H3Event } from 'h3'
import { getPettingIntervalHours, getBotState } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function getBotConfig(event: H3Event) {
  requireApiAuth(event)
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  const pettingIntervalHours = await getPettingIntervalHours()
  const botState = await getBotState()
  return {
    baseRpcUrl,
    pettingIntervalHours,
    running: botState?.running ?? false,
  }
}
