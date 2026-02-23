/**
 * Persist delegated owners to a JSON file so they survive restarts.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const DATA_DIR = process.env.PETTER_DATA_DIR || join(process.cwd(), 'data')
const FILE_PATH = join(DATA_DIR, 'delegated-owners.json')

export async function loadDelegatedOwnersFromFile(): Promise<string[]> {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((a): a is string => typeof a === 'string').map((a) => a.toLowerCase())
    }
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.error('[petter] Failed to load delegated-owners.json:', err?.message)
    }
  }
  return []
}

export async function saveDelegatedOwnersToFile(owners: string[]): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(FILE_PATH, JSON.stringify(owners, null, 2), 'utf-8')
  } catch (err: any) {
    console.error('[petter] Failed to save delegated-owners.json:', err?.message)
  }
}
