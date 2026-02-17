import { clearSession } from '../../../lib/auth';

export default defineEventHandler(async (event) => {
  clearSession(event);
  return { success: true };
});

