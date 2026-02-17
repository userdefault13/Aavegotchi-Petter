import { getBotState, checkAuth } from '../../../lib';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const state = await getBotState();
  return state || { running: false };
});

