import type { H3Event } from 'h3'
import { getDelegatedOwners } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

/** Used by external cron / AarcadeGh-t to fetch owners list */
export async function getDelegatedOwnersRoute(event: H3Event) {
  requireApiAuth(event)
  const owners = await getDelegatedOwners()
  return { owners }
}
