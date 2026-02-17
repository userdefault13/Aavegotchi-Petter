import { addTransaction, addError, getBotState, setBotState } from '../../../lib/kv';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const reportSecret = config.reportSecret || process.env.REPORT_SECRET;

  if (!reportSecret) {
    throw createError({
      statusCode: 500,
      message: 'Report secret not configured',
    });
  }

  const authHeader = getHeader(event, 'x-report-secret');
  if (authHeader !== reportSecret) {
    throw createError({
      statusCode: 401,
      message: 'Invalid report secret',
    });
  }

  const body = (await readBody(event)) as {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    petted?: number;
    tokenIds?: string[];
    message?: string;
    error?: string;
  } | undefined;

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
    });
  }

  const state = await getBotState();

  if (body.success && body.transactionHash && body.blockNumber !== undefined) {
    await addTransaction({
      hash: body.transactionHash,
      timestamp: Date.now(),
      blockNumber: body.blockNumber,
      gasUsed: body.gasUsed || '0',
      tokenIds: body.tokenIds || [],
    });
    await setBotState({
      ...state,
      running: true,
      lastRun: Date.now(),
      lastError: undefined,
    });
  } else if (!body.success && body.error) {
    await addError({
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: body.error,
      type: 'CloudflareWorkerError',
    });
    await setBotState({
      ...state,
      lastError: body.error,
    });
  } else {
    await setBotState({
      ...state,
      lastRun: Date.now(),
      lastError: undefined,
    });
  }

  return { ok: true };
});
