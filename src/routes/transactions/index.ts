import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { getTransactions, getManualTriggerLogs } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export type ExecutionEntry =
  | {
      type: 'transaction'
      hash: string
      timestamp: number
      blockNumber: number
      gasUsed: string
      gasCostWei?: string
      tokenIds: string[]
    }
  | { type: 'manual'; id: string; timestamp: number; message: string; petted?: number }

export async function getTransactionsIndex(event: H3Event): Promise<ExecutionEntry[]> {
  requireApiAuth(event)

  const query = getQuery(event)
  const limit = query.limit ? parseInt(String(query.limit)) : 50

  const [transactions, manualLogs] = await Promise.all([
    getTransactions(limit),
    getManualTriggerLogs(limit),
  ])

  const entries: ExecutionEntry[] = [
    ...transactions.map((t) => ({
      type: 'transaction' as const,
      hash: t.hash,
      timestamp: t.timestamp,
      blockNumber: t.blockNumber,
      gasUsed: t.gasUsed,
      gasCostWei: t.gasCostWei,
      tokenIds: t.tokenIds,
    })),
    ...manualLogs.map((m) => ({
      type: 'manual' as const,
      id: m.id,
      timestamp: m.timestamp,
      message: m.message,
      petted: m.petted,
    })),
  ]

  entries.sort((a, b) => b.timestamp - a.timestamp)
  return entries.slice(0, limit)
}
