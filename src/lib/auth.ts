import { getHeader } from 'h3'
import type { H3Event } from 'h3'

export function checkApiAuth(event: H3Event): boolean {
  const secret = process.env.REPORT_SECRET
  if (!secret) return false
  const header = getHeader(event, 'x-report-secret') || getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
  return header === secret
}

export function requireApiAuth(event: H3Event): void {
  if (!checkApiAuth(event)) {
    throw new Error('Unauthorized')
  }
}
