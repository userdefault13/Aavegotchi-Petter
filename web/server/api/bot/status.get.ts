import { getBotState, checkAuth } from '../../../lib';
import { getBotStateFromPetter } from '../../../lib/petter-api';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const config = useRuntimeConfig();
  const petterUrl = config.petterApiUrl as string | undefined;
  if (petterUrl) {
    const state = await getBotStateFromPetter();
    if (state) return state;
  }
  const state = await getBotState();
  return state || { running: false };
});

