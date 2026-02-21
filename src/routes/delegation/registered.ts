import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { isDelegatedOwner } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

const AAVEGOTCHI_DIAMOND = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF' as const
const ABI = parseAbi([
  'function isPetOperatorForAll(address _owner, address _operator) external view returns (bool)',
])

function ensureRawAddress(addr: string): string {
  const lower = addr.toLowerCase()
  if (!/^0x[a-f0-9]{40}$/.test(lower)) {
    throw new Error('Invalid address format')
  }
  return lower
}

export async function getDelegationRegistered(event: H3Event) {
  requireApiAuth(event)

  const query = getQuery(event)
  const ownerAddress = query.address as string | undefined
  if (!ownerAddress) {
    throw new Error('Missing address query param')
  }

  const normalized = ensureRawAddress(ownerAddress)
  const inKv = await isDelegatedOwner(normalized)
  if (!inKv) {
    return { registered: false }
  }

  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

  const client = createPublicClient({
    chain: base,
    transport: http(baseRpcUrl),
  })
  const approved = await client.readContract({
    address: AAVEGOTCHI_DIAMOND,
    abi: ABI,
    functionName: 'isPetOperatorForAll',
    args: [normalized as `0x${string}`, petterAddress as `0x${string}`],
  })

  return { registered: inKv && approved }
}
