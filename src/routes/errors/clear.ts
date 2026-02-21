import type { H3Event } from 'h3'
import { clearErrors } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postErrorsClear(event: H3Event) {
  requireApiAuth(event)
  await clearErrors()
  return { success: true }
}
