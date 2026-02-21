import type { H3Event } from 'h3'
import { getBotState, setBotState } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postBotStart(event: H3Event) {
  requireApiAuth(event)
  const state = await getBotState()
  await setBotState({ ...(state || {}), running: true })
  return { success: true, running: true }
}
