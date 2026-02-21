/**
 * Redis client - same interface as AavegotchiPetterUI lib/kv.ts
 * Uses ioredis for local Redis (no cloud).
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Redis = require('ioredis')

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
export const redis = new Redis(redisUrl)

export interface Transaction {
  hash: string
  timestamp: number
  blockNumber: number
  gasUsed: string
  gasCostWei?: string
  tokenIds: string[]
}

export interface ErrorLog {
  id: string
  timestamp: number
  message: string
  stack?: string
  type: string
}

export interface WorkerLogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
}

export async function addWorkerLogs(entries: WorkerLogEntry[]): Promise<void> {
  if (!entries.length) return
  for (const e of entries) {
    await redis.lpush('worker_logs', JSON.stringify(e))
  }
  await redis.ltrim('worker_logs', 0, 199)
}

export async function getWorkerLogs(limit = 100): Promise<WorkerLogEntry[]> {
  try {
    const raw = await redis.lrange('worker_logs', 0, limit - 1)
    return raw.map((r: string) => JSON.parse(r) as WorkerLogEntry)
  } catch {
    return []
  }
}

export interface BotState {
  running: boolean
  lastRun?: number
  lastError?: string
  lastRunMessage?: string
}

export async function getBotState(): Promise<BotState | null> {
  try {
    const raw = await redis.get('bot:state')
    if (!raw) return { running: false }
    return JSON.parse(raw) as BotState
  } catch {
    return { running: false }
  }
}

export async function setBotState(state: BotState): Promise<void> {
  await redis.set('bot:state', JSON.stringify(state))
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  await redis.lpush('transactions', JSON.stringify(transaction))
  await redis.ltrim('transactions', 0, 99)
}

export async function getTransactions(limit = 50): Promise<Transaction[]> {
  try {
    const raw = await redis.lrange('transactions', 0, limit - 1)
    return raw.map((r: string) => JSON.parse(r) as Transaction)
  } catch {
    return []
  }
}

export async function clearTransactions(): Promise<void> {
  await redis.del('transactions')
}

export async function setTransactions(transactions: Transaction[]): Promise<void> {
  await redis.del('transactions')
  if (transactions.length === 0) return
  const ordered = [...transactions].reverse()
  for (const t of ordered) {
    await redis.lpush('transactions', JSON.stringify(t))
  }
  await redis.ltrim('transactions', 0, 99)
}

export async function getTransaction(hash: string): Promise<Transaction | null> {
  const transactions = await getTransactions(100)
  return transactions.find((t) => t.hash === hash) || null
}

export interface ManualTriggerLog {
  id: string
  timestamp: number
  message: string
  petted?: number
}

export async function addManualTriggerLog(log: ManualTriggerLog): Promise<void> {
  await redis.lpush('manual_triggers', JSON.stringify(log))
  await redis.ltrim('manual_triggers', 0, 99)
}

export async function getManualTriggerLogs(limit = 50): Promise<ManualTriggerLog[]> {
  try {
    const raw = await redis.lrange('manual_triggers', 0, limit - 1)
    return raw.map((r: string) => JSON.parse(r) as ManualTriggerLog)
  } catch {
    return []
  }
}

export async function clearManualTriggerLogs(): Promise<void> {
  await redis.del('manual_triggers')
}

export async function addError(error: ErrorLog): Promise<void> {
  await redis.lpush('errors', JSON.stringify(error))
  await redis.ltrim('errors', 0, 99)
}

export async function getErrors(limit = 50): Promise<ErrorLog[]> {
  try {
    const raw = await redis.lrange('errors', 0, limit - 1)
    return raw.map((r: string) => JSON.parse(r) as ErrorLog)
  } catch {
    return []
  }
}

export async function clearErrors(): Promise<void> {
  await redis.del('errors')
}

export async function getDelegatedOwners(): Promise<string[]> {
  try {
    const raw = await redis.get('delegated:owners')
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export async function addDelegatedOwner(owner: string): Promise<void> {
  if (!owner || typeof owner !== 'string') return
  const normalized = owner.toLowerCase()
  const owners = await getDelegatedOwners()
  if (!owners.includes(normalized)) {
    owners.push(normalized)
    await redis.set('delegated:owners', JSON.stringify(owners))
  }
}

export async function removeDelegatedOwner(owner: string): Promise<void> {
  if (!owner || typeof owner !== 'string') return
  const normalized = owner.toLowerCase()
  const owners = await getDelegatedOwners()
  const filtered = owners.filter((o) => o !== normalized)
  if (filtered.length !== owners.length) {
    await redis.set('delegated:owners', JSON.stringify(filtered))
  }
}

export async function clearAllDelegatedOwners(): Promise<number> {
  const owners = await getDelegatedOwners()
  await redis.set('delegated:owners', JSON.stringify([]))
  return owners.length
}

export async function isDelegatedOwner(owner: string): Promise<boolean> {
  if (!owner || typeof owner !== 'string') return false
  const owners = await getDelegatedOwners()
  return owners.includes(owner.toLowerCase())
}

const PETTING_INTERVAL_KEY = 'bot:petting_interval_hours'
const DEFAULT_PETTING_INTERVAL = 12
const MIN_INTERVAL_HOURS = 30 / 3600

export async function getPettingIntervalHours(): Promise<number> {
  try {
    const raw = await redis.get(PETTING_INTERVAL_KEY)
    const val = raw ? parseFloat(raw) : NaN
    if (typeof val === 'number' && !isNaN(val) && val >= MIN_INTERVAL_HOURS && val <= 24) return val
  } catch {
    /* ignore */
  }
  return DEFAULT_PETTING_INTERVAL
}

export async function setPettingIntervalHours(hours: number): Promise<void> {
  const clamped = Math.max(MIN_INTERVAL_HOURS, Math.min(24, hours))
  await redis.set(PETTING_INTERVAL_KEY, String(clamped))
}
