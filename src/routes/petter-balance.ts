import type { H3Event } from 'h3'
import { createPublicClient, http, formatEther } from 'viem'
import { base } from 'viem/chains'
import { requireApiAuth } from '../lib/auth.js'

export async function getPetterBalance(event: H3Event) {
  requireApiAuth(event)

  const balanceAddr = process.env.PETTER_BALANCE_ADDRESS?.trim() || ''
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const addr = balanceAddr || petterAddress

  if (!addr || !addr.startsWith('0x')) {
    return { balance: '0', address: petterAddress, balanceAddress: null }
  }

  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  const client = createPublicClient({
    chain: base,
    transport: http(baseRpcUrl),
  })

  const balance = await client.getBalance({ address: addr as `0x${string}` })
  const eth = parseFloat(formatEther(balance)).toFixed(4)

  return {
    balance: eth,
    address: petterAddress,
    balanceAddress: balanceAddr || null,
  }
}
