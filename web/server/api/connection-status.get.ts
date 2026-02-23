export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const petterUrl = (config.petterApiUrl as string) || 'http://localhost:3002';
  const tunnelUrl = (config.petterTunnelUrl as string) || '';

  const result: {
    petter: { ok: boolean; latencyMs?: number; error?: string };
    tunnel: { ok: boolean; latencyMs?: number; error?: string } | null;
  } = {
    petter: { ok: false },
    tunnel: tunnelUrl ? { ok: false } : null,
  };

  // Check Petter API (local)
  try {
    const start = Date.now();
    const res = await fetch(`${petterUrl.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    result.petter.latencyMs = Date.now() - start;
    result.petter.ok = res.ok;
    if (!res.ok) {
      result.petter.error = `HTTP ${res.status}`;
    }
  } catch (e) {
    result.petter.error = e instanceof Error ? e.message : 'Unreachable';
  }

  // Check Tunnel (public) if URL is configured
  if (tunnelUrl) {
    try {
      const start = Date.now();
      const res = await fetch(`${tunnelUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      result.tunnel!.latencyMs = Date.now() - start;
      result.tunnel!.ok = res.ok;
      if (!res.ok) {
        result.tunnel!.error = `HTTP ${res.status}`;
      }
    } catch (e) {
      result.tunnel!.error = e instanceof Error ? e.message : 'Unreachable';
    }
  }

  return result;
});
