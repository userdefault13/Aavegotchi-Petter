import { getTransaction, checkAuth } from '../../../lib';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const hash = getRouterParam(event, 'hash');
  if (!hash) {
    throw createError({
      statusCode: 400,
      message: 'Transaction hash required',
    });
  }

  const transaction = await getTransaction(hash);
  if (!transaction) {
    throw createError({
      statusCode: 404,
      message: 'Transaction not found',
    });
  }

  return transaction;
});

