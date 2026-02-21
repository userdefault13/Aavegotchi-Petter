import type { H3Event } from 'h3'
import { getBotState, getTransactions, getErrors } from '../lib/redis.js'
import { requireApiAuth } from '../lib/auth.js'

export async function getHealthApi(event: H3Event) {
  requireApiAuth(event)

  const [state, transactions, errors] = await Promise.all([
    getBotState(),
    getTransactions(100),
    getErrors(100),
  ])

  const totalPetted = transactions.reduce((sum: number, tx: { tokenIds: string[] }) => sum + tx.tokenIds.length, 0)
  const last24h = transactions.filter(
    (tx: { timestamp: number }) => Date.now() - tx.timestamp < 24 * 60 * 60 * 1000
  ).length
  const errorsLast24h = errors.filter(
    (e: { timestamp: number }) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000
  ).length

  const totalGasCostWei = transactions.reduce((sum: bigint, tx: { gasCostWei?: string }) => {
    const wei = tx.gasCostWei ? BigInt(tx.gasCostWei) : 0n
    return sum + wei
  }, 0n)
  const totalGasCostEth = Number(totalGasCostWei) / 1e18

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'aavegotchi-petter-dashboard',
    bot: {
      running: state?.running ?? false,
      lastRun: state?.lastRun ? new Date(state.lastRun).toISOString() : null,
      lastError: state?.lastError ?? null,
      lastRunMessage: state?.lastRunMessage ?? null,
    },
    stats: {
      totalTransactions: transactions.length,
      totalAavegotchisPetted: totalPetted,
      transactionsLast24h: last24h,
      errorsLast24h,
      totalGasCostEth,
      successRate:
        transactions.length + errors.length > 0
          ? Math.round(
              (transactions.length / (transactions.length + errors.length)) * 100
            )
          : 100,
    },
  }
}
