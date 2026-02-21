import type { H3Event } from 'h3'
import { getTransactions, getErrors, getBotState } from '../lib/redis.js'
import { requireApiAuth } from '../lib/auth.js'

export async function getStats(event: H3Event) {
  requireApiAuth(event)

  const [transactions, errors, state] = await Promise.all([
    getTransactions(100),
    getErrors(100),
    getBotState(),
  ])

  const totalPetted = transactions.reduce((sum: number, tx: { tokenIds: string[] }) => sum + tx.tokenIds.length, 0)
  const last24h = transactions.filter(
    (tx: { timestamp: number }) => Date.now() - tx.timestamp < 24 * 60 * 60 * 1000
  )
  const last7d = transactions.filter(
    (tx: { timestamp: number }) => Date.now() - tx.timestamp < 7 * 24 * 60 * 60 * 1000
  )

  const totalGasCostWei = transactions.reduce((sum: bigint, tx: { gasCostWei?: string }) => {
    const wei = tx.gasCostWei ? BigInt(tx.gasCostWei) : 0n
    return sum + wei
  }, 0n)
  const totalGasCostEth = Number(totalGasCostWei) / 1e18

  return {
    bot: {
      running: state?.running ?? false,
      lastRun: state?.lastRun ?? null,
      lastError: state?.lastError ?? null,
    },
    transactions: {
      total: transactions.length,
      last24h: last24h.length,
      last7d: last7d.length,
      totalAavegotchisPetted: totalPetted,
      totalGasCostEth,
    },
    errors: {
      total: errors.length,
      last24h: errors.filter(
        (e: { timestamp: number }) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000
      ).length,
    },
    successRate:
      transactions.length + errors.length > 0
        ? Math.round(
            (transactions.length / (transactions.length + errors.length)) * 100
          )
        : 100,
  }
}
