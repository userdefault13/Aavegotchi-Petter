import type { H3Event } from 'h3'
import { getTransactions, setTransactions } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

interface RpcReceipt {
  gasUsed?: string
  effectiveGasPrice?: string
  gasPrice?: string
}

async function fetchReceipt(rpcUrl: string, txHash: string): Promise<RpcReceipt | null> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }),
  })
  const data = (await res.json()) as { result?: RpcReceipt }
  return data.result ?? null
}

export async function postTransactionsBackfillGas(event: H3Event) {
  requireApiAuth(event)

  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

  const transactions = await getTransactions(100)
  const needsBackfill = transactions.filter((t) => !t.gasCostWei)
  if (needsBackfill.length === 0) {
    return { ok: true, updated: 0, message: 'All transactions already have gas cost' }
  }

  const updated = [...transactions]
  let updatedCount = 0

  for (let i = 0; i < updated.length; i++) {
    const tx = updated[i]
    if (tx.gasCostWei) continue

    try {
      const receipt = await fetchReceipt(rpcUrl, tx.hash)
      if (!receipt?.gasUsed) continue

      const gasUsed = BigInt(receipt.gasUsed)
      const gasPrice = receipt.effectiveGasPrice
        ? BigInt(receipt.effectiveGasPrice)
        : receipt.gasPrice
          ? BigInt(receipt.gasPrice)
          : 0n

      if (gasPrice > 0n) {
        updated[i] = { ...tx, gasCostWei: (gasUsed * gasPrice).toString() }
        updatedCount++
      }
    } catch (err) {
      console.error(`[backfill-gas] Failed to fetch receipt for ${tx.hash}:`, err)
    }
  }

  if (updatedCount > 0) {
    await setTransactions(updated)
  }

  return { ok: true, updated: updatedCount, total: transactions.length }
}
