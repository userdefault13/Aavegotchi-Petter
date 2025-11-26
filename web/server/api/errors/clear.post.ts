import { clearErrors, checkAuth } from '~/lib';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  await clearErrors();
  return { success: true };
});

