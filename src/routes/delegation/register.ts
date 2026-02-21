import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { addDelegatedOwner, isDelegatedOwner } from '../../lib/redis.js'
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

export async function postDelegationRegister(event: H3Event) {
  requireApiAuth(event)

  const body = (await readBody(event)) as { ownerAddress?: string }
  const ownerAddress = body?.ownerAddress
  if (!ownerAddress) {
    throw new Error('Missing ownerAddress in body')
  }

  const normalized = ensureRawAddress(ownerAddress)
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

  const client = createPublicClient({
    chain: base,
    transport: http(baseRpcUrl),
  })

  const isApproved = await client.readContract({
    address: AAVEGOTCHI_DIAMOND,
    abi: ABI,
    functionName: 'isPetOperatorForAll',
    args: [normalized as `0x${string}`, petterAddress as `0x${string}`],
  })

  if (!isApproved) {
    throw new Error(
      'Please approve the petter first. Call setPetOperatorForAll on the Aavegotchi contract.'
    )
  }

  if (!(await isDelegatedOwner(normalized))) {
    await addDelegatedOwner(normalized)
  }

  return {
    success: true,
    message: 'Registered for auto-petting. Your Aavegotchis will be petted every 12 hours.',
  }
}
