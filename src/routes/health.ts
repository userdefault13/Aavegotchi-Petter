import type { H3Event } from 'h3'

export function getHealth(_event: H3Event): object {
  return {
    status: 'ok',
    service: 'aavegotchi-petter',
    timestamp: new Date().toISOString(),
  }
}
