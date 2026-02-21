import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { removeDelegatedOwner } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function postDelegationUnregister(event: H3Event) {
  requireApiAuth(event)

  const body = (await readBody(event)) as { ownerAddress?: string }
  const ownerAddress = body?.ownerAddress
  if (!ownerAddress) {
    throw new Error('Missing ownerAddress in body')
  }

  await removeDelegatedOwner(ownerAddress)

  return {
    success: true,
    message: 'Unregistered from auto-petting. Revoke on-chain to fully remove the petter.',
  }
}
