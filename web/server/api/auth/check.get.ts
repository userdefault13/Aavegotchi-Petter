import { checkAuth } from '../../../lib/auth';

export default defineEventHandler(async (event) => {
  const isAuthenticated = checkAuth(event);
  return { authenticated: isAuthenticated };
});

