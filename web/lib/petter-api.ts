/**
 * Fetches data from the Petter backend API when PETTER_API_URL is configured.
 * Used as an alternative to KV when running locally with the Petter.
 */

export async function fetchFromPetter(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<unknown> {
  const config = useRuntimeConfig();
  const baseUrl = (config.petterApiUrl as string)?.replace(/\/$/, '');
  if (!baseUrl) return null;

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const reportSecret = (config.reportSecret as string) || process.env.REPORT_SECRET;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(reportSecret && { 'X-Report-Secret': reportSecret }),
    ...options.headers,
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Petter API: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getBotStateFromPetter(): Promise<{ running: boolean; lastRun?: number; lastError?: string } | null> {
  try {
    const data = await fetchFromPetter('/api/bot/status') as { running?: boolean; lastRun?: number; lastError?: string };
    return data ? { running: data.running ?? false, lastRun: data.lastRun, lastError: data.lastError } : null;
  } catch {
    return null;
  }
}

export async function getHealthFromPetter(): Promise<Record<string, unknown> | null> {
  try {
    return await fetchFromPetter('/api/health') as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getStatsFromPetter(): Promise<Record<string, unknown> | null> {
  try {
    return await fetchFromPetter('/api/stats') as Record<string, unknown>;
  } catch {
    return null;
  }
}
