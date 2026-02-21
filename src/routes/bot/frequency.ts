import type { H3Event } from 'h3'
import { readBody } from 'h3'
import { getPettingIntervalHours, setPettingIntervalHours } from '../../lib/redis.js'
import { requireApiAuth } from '../../lib/auth.js'

export async function getBotFrequency(event: H3Event) {
  requireApiAuth(event)
  const hours = await getPettingIntervalHours()
  return { pettingIntervalHours: hours }
}

export async function postBotFrequency(event: H3Event) {
  requireApiAuth(event)
  const body = (await readBody(event)) as { pettingIntervalHours?: number }
  const hours = body?.pettingIntervalHours

  if (typeof hours !== 'number' || hours < 30 / 3600 || hours > 24) {
    throw new Error('pettingIntervalHours must be between 30 seconds and 24 hours')
  }

  await setPettingIntervalHours(hours)
  return { pettingIntervalHours: hours, ok: true }
}
