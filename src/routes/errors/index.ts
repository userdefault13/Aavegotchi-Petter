import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { getErrors } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function getErrorsIndex(event: H3Event) {
  requireApiAuth(event)
  const query = getQuery(event)
  const limit = query.limit ? parseInt(String(query.limit)) : 50
  return getErrors(limit)
}
