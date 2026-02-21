import type { H3Event } from 'h3'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { getDelegatedOwners } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

const AAVEGOTCHI_DIAMOND = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF' as const
const ABI = parseAbi([
  'function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory)',
  'function isPetOperatorForAll(address _owner, address _operator) external view returns (bool)',
])

function isRawAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s)
}

export async function getDelegationOwners(event: H3Event) {
  requireApiAuth(event)

  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'

  const owners = await getDelegatedOwners()
  const rawOwners = owners.filter((a) => isRawAddress(a))
  if (rawOwners.length === 0) {
    return { owners: [], totalGotchis: 0 }
  }

  const client = createPublicClient({
    chain: base,
    transport: http(baseRpcUrl),
  })

  const results = await Promise.all(
    rawOwners.map(async (address) => {
      try {
        const [tokenIds, approved] = await Promise.all([
          client.readContract({
            address: AAVEGOTCHI_DIAMOND,
            abi: ABI,
            functionName: 'tokenIdsOfOwner',
            args: [address as `0x${string}`],
          }),
          client.readContract({
            address: AAVEGOTCHI_DIAMOND,
            abi: ABI,
            functionName: 'isPetOperatorForAll',
            args: [address as `0x${string}`, petterAddress as `0x${string}`],
          }),
        ])
        return { address, gotchiCount: approved ? tokenIds.length : 0, approved }
      } catch {
        return { address, gotchiCount: 0, approved: false }
      }
    })
  )

  const approvedOwners = results.filter((r) => r.approved)
  const totalGotchis = approvedOwners.reduce((sum, r) => sum + r.gotchiCount, 0)

  return {
    owners: approvedOwners.map(({ address, gotchiCount }) => ({ address, gotchiCount })),
    totalGotchis,
  }
}
