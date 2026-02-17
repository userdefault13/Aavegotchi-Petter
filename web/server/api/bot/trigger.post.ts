import { checkAuth } from '../../../lib/auth';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Trigger the bot run endpoint
  const config = useRuntimeConfig();
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/bot/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to trigger bot');
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to trigger bot',
    });
  }
});

