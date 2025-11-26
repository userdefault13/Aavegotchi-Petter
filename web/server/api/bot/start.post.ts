import { getBotState, setBotState, checkAuth } from '~/lib';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const state = await getBotState();
  await setBotState({ ...state, running: true });

  return { success: true, running: true };
});

