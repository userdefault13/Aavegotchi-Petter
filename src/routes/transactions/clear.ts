import type { H3Event } from 'h3'
import { clearTransactions, clearManualTriggerLogs } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postTransactionsClear(event: H3Event) {
  requireApiAuth(event)
  await Promise.all([clearTransactions(), clearManualTriggerLogs()])
  return { success: true, message: 'Execution history cleared' }
}
