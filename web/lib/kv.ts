import { kv } from '@vercel/kv';

// Initialize KV client
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  kv.connect({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export interface Transaction {
  hash: string;
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  tokenIds: string[];
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  type: string;
}

export interface BotState {
  running: boolean;
  lastRun?: number;
  lastError?: string;
}

export async function getBotState(): Promise<BotState | null> {
  try {
    const state = await kv.get<BotState>('bot:state');
    return state || { running: false };
  } catch (error) {
    console.error('Error getting bot state:', error);
    return { running: false };
  }
}

export async function setBotState(state: BotState): Promise<void> {
  await kv.set('bot:state', state);
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  await kv.lpush('transactions', transaction);
  // Keep only last 100 transactions
  await kv.ltrim('transactions', 0, 99);
}

export async function getTransactions(limit: number = 50): Promise<Transaction[]> {
  try {
    const transactions = await kv.lrange<Transaction>('transactions', 0, limit - 1);
    return transactions || [];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function getTransaction(hash: string): Promise<Transaction | null> {
  const transactions = await getTransactions(100);
  return transactions.find(t => t.hash === hash) || null;
}

export async function addError(error: ErrorLog): Promise<void> {
  await kv.lpush('errors', error);
  // Keep only last 100 errors
  await kv.ltrim('errors', 0, 99);
}

export async function getErrors(limit: number = 50): Promise<ErrorLog[]> {
  try {
    const errors = await kv.lrange<ErrorLog>('errors', 0, limit - 1);
    return errors || [];
  } catch (error) {
    console.error('Error getting errors:', error);
    return [];
  }
}

export async function clearErrors(): Promise<void> {
  await kv.del('errors');
}

// Delegated owners (EIP PetOperator - owners who approved our petter to pet on their behalf)
// Stored as JSON array for compatibility
export async function getDelegatedOwners(): Promise<string[]> {
  try {
    const owners = await kv.get<string[]>('delegated:owners');
    return owners || [];
  } catch (error) {
    console.error('Error getting delegated owners:', error);
    return [];
  }
}

export async function addDelegatedOwner(owner: string): Promise<void> {
  const normalized = owner.toLowerCase();
  const owners = await getDelegatedOwners();
  if (!owners.includes(normalized)) {
    owners.push(normalized);
    await kv.set('delegated:owners', owners);
  }
}

export async function removeDelegatedOwner(owner: string): Promise<void> {
  const normalized = owner.toLowerCase();
  const owners = await getDelegatedOwners();
  const filtered = owners.filter((o) => o !== normalized);
  if (filtered.length !== owners.length) {
    await kv.set('delegated:owners', filtered);
  }
}

export async function isDelegatedOwner(owner: string): Promise<boolean> {
  const owners = await getDelegatedOwners();
  return owners.includes(owner.toLowerCase());
}

