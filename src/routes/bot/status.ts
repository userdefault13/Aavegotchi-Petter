import type { H3Event } from 'h3'
import { getBotState } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function getBotStatus(event: H3Event) {
  requireApiAuth(event)
  const state = await getBotState()
  return state || { running: false }
}
