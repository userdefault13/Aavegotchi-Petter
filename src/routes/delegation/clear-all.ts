import type { H3Event } from 'h3'
import { clearAllDelegatedOwners } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postDelegationClearAll(event: H3Event) {
  requireApiAuth(event)
  const count = await clearAllDelegatedOwners()
  const petterAddress = process.env.PETTER_ADDRESS || '0x9a3E95f448f3daB367dd9213D4554444faa272F1'
  const revokeHint = petterAddress
    ? `Each owner should revoke on-chain: setPetOperatorForAll(${petterAddress}, false)`
    : 'Each owner should revoke the petter on-chain.'
  return {
    success: true,
    message: `Unregistered ${count} delegate(s). ${revokeHint}`,
    count,
  }
}
