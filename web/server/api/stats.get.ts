import { getTransactions, getErrors, getBotState, checkAuth } from '~/lib';

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const [transactions, errors, state] = await Promise.all([
    getTransactions(100),
    getErrors(100),
    getBotState(),
  ]);

  const totalPetted = transactions.reduce((sum, tx) => sum + tx.tokenIds.length, 0);
  const last24h = transactions.filter(
    (tx) => Date.now() - tx.timestamp < 24 * 60 * 60 * 1000
  );
  const last7d = transactions.filter(
    (tx) => Date.now() - tx.timestamp < 7 * 24 * 60 * 60 * 1000
  );

  return {
    bot: {
      running: state?.running ?? false,
      lastRun: state?.lastRun ?? null,
      lastError: state?.lastError ?? null,
    },
    transactions: {
      total: transactions.length,
      last24h: last24h.length,
      last7d: last7d.length,
      totalAavegotchisPetted: totalPetted,
    },
    errors: {
      total: errors.length,
      last24h: errors.filter(
        (e) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000
      ).length,
    },
    successRate:
      transactions.length + errors.length > 0
        ? Math.round(
            (transactions.length / (transactions.length + errors.length)) * 100
          )
        : 100,
  };
});
