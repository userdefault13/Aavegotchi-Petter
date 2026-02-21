import type { H3Event } from 'h3'
import { getRouterParam } from 'h3'
import { getTransaction } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function getTransactionByHash(event: H3Event) {
  requireApiAuth(event)
  const hash = getRouterParam(event, 'hash')
  if (!hash) {
    throw new Error('Transaction hash required')
  }

  const transaction = await getTransaction(hash)
  if (!transaction) {
    throw new Error('Transaction not found')
  }

  return transaction
}
