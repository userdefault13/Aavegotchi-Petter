import { getCookie } from 'h3';
import { checkAuth } from '../../../lib/auth';

export default defineEventHandler((event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }
  const address = getCookie(event, 'auth_session');
  return { address: address || null };
});
