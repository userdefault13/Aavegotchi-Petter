/**
 * In-memory storage - same interface as previous Redis-based implementation.
 * Delegated owners are persisted to data/delegated-owners.json so they survive restarts.
 */
import { loadDelegatedOwnersFromFile, saveDelegatedOwnersToFile } from './delegated-owners-file.js'

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

// In-memory storage
const store: {
  worker_logs: string[]
  transactions: string[]
  manual_triggers: string[]
  errors: string[]
  'bot:state': string | null
  'delegated:owners': string | null
  'bot:petting_interval_hours': string | null
} = {
  worker_logs: [],
  transactions: [],
  manual_triggers: [],
  errors: [],
  'bot:state': null,
  'delegated:owners': null,
  'bot:petting_interval_hours': null,
}

function lpush(key: keyof typeof store, ...values: string[]): void {
  const arr = store[key] as string[] | undefined
  if (!Array.isArray(arr)) return
  arr.unshift(...values)
}

function ltrim(key: keyof typeof store, start: number, stop: number): void {
  const arr = store[key] as string[] | undefined
  if (!Array.isArray(arr)) return
  store[key] = arr.slice(0, stop + 1) as any
}

function lrange(key: keyof typeof store, start: number, stop: number): string[] {
  const arr = store[key] as string[] | undefined
  if (!Array.isArray(arr)) return []
  return arr.slice(start, stop + 1)
}

function get(key: keyof typeof store): string | null {
  const val = store[key]
  if (Array.isArray(val)) return null
  return val ?? null
}

function set(key: keyof typeof store, value: string): void {
  (store as Record<string, unknown>)[key] = value
}

function del(key: keyof typeof store): void {
  if (key === 'worker_logs' || key === 'transactions' || key === 'manual_triggers' || key === 'errors') {
    (store as Record<string, unknown>)[key] = []
  } else {
    (store as Record<string, unknown>)[key] = null
  }
}

export async function addWorkerLogs(entries: WorkerLogEntry[]): Promise<void> {
  if (!entries.length) return
  for (const e of entries) {
    lpush('worker_logs', JSON.stringify(e))
  }
  ltrim('worker_logs', 0, 199)
}

export async function getWorkerLogs(limit = 100): Promise<WorkerLogEntry[]> {
  try {
    const raw = lrange('worker_logs', 0, limit - 1)
    return raw.map((r) => JSON.parse(r) as WorkerLogEntry)
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
    const raw = get('bot:state')
    if (!raw) return { running: false }
    return JSON.parse(raw) as BotState
  } catch {
    return { running: false }
  }
}

export async function setBotState(state: BotState): Promise<void> {
  set('bot:state', JSON.stringify(state))
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  lpush('transactions', JSON.stringify(transaction))
  ltrim('transactions', 0, 99)
}

export async function getTransactions(limit = 50): Promise<Transaction[]> {
  try {
    const raw = lrange('transactions', 0, limit - 1)
    return raw.map((r) => JSON.parse(r) as Transaction)
  } catch {
    return []
  }
}

export async function clearTransactions(): Promise<void> {
  del('transactions')
}

export async function setTransactions(transactions: Transaction[]): Promise<void> {
  del('transactions')
  if (transactions.length === 0) return
  const ordered = [...transactions].reverse()
  for (const t of ordered) {
    lpush('transactions', JSON.stringify(t))
  }
  ltrim('transactions', 0, 99)
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
  lpush('manual_triggers', JSON.stringify(log))
  ltrim('manual_triggers', 0, 99)
}

export async function getManualTriggerLogs(limit = 50): Promise<ManualTriggerLog[]> {
  try {
    const raw = lrange('manual_triggers', 0, limit - 1)
    return raw.map((r) => JSON.parse(r) as ManualTriggerLog)
  } catch {
    return []
  }
}

export async function clearManualTriggerLogs(): Promise<void> {
  del('manual_triggers')
}

export async function addError(error: ErrorLog): Promise<void> {
  lpush('errors', JSON.stringify(error))
  ltrim('errors', 0, 99)
}

export async function getErrors(limit = 50): Promise<ErrorLog[]> {
  try {
    const raw = lrange('errors', 0, limit - 1)
    return raw.map((r) => JSON.parse(r) as ErrorLog)
  } catch {
    return []
  }
}

export async function clearErrors(): Promise<void> {
  del('errors')
}

export async function getDelegatedOwners(): Promise<string[]> {
  try {
    const raw = get('delegated:owners')
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

/** Load delegated owners from data/delegated-owners.json into memory. Call once at startup. */
export async function initDelegatedOwnersFromFile(): Promise<void> {
  const owners = await loadDelegatedOwnersFromFile()
  if (owners.length > 0) {
    set('delegated:owners', JSON.stringify(owners))
  }
}

async function persistDelegatedOwners(): Promise<void> {
  const owners = await getDelegatedOwners()
  await saveDelegatedOwnersToFile(owners)
}

export async function addDelegatedOwner(owner: string): Promise<void> {
  if (!owner || typeof owner !== 'string') return
  const normalized = owner.toLowerCase()
  const owners = await getDelegatedOwners()
  if (!owners.includes(normalized)) {
    owners.push(normalized)
    set('delegated:owners', JSON.stringify(owners))
    await persistDelegatedOwners()
  }
}

export async function removeDelegatedOwner(owner: string): Promise<void> {
  if (!owner || typeof owner !== 'string') return
  const normalized = owner.toLowerCase()
  const owners = await getDelegatedOwners()
  const filtered = owners.filter((o) => o !== normalized)
  if (filtered.length !== owners.length) {
    set('delegated:owners', JSON.stringify(filtered))
    await persistDelegatedOwners()
  }
}

export async function clearAllDelegatedOwners(): Promise<number> {
  const owners = await getDelegatedOwners()
  set('delegated:owners', JSON.stringify([]))
  await persistDelegatedOwners()
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
    const raw = get(PETTING_INTERVAL_KEY as keyof typeof store)
    const val = raw ? parseFloat(raw) : NaN
    if (typeof val === 'number' && !isNaN(val) && val >= MIN_INTERVAL_HOURS && val <= 24) return val
  } catch {
    /* ignore */
  }
  return DEFAULT_PETTING_INTERVAL
}

export async function setPettingIntervalHours(hours: number): Promise<void> {
  const clamped = Math.max(MIN_INTERVAL_HOURS, Math.min(24, hours))
  set(PETTING_INTERVAL_KEY as keyof typeof store, String(clamped))
}
