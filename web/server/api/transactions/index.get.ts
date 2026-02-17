import { getTransactions, checkAuth } from '../../../lib';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const query = getQuery(event);
  const limit = query.limit ? parseInt(query.limit as string) : 50;

  const transactions = await getTransactions(limit);
  return transactions;
});

