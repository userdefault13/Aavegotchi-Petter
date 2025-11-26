import { verifySignature, createSession, isAddressAllowed } from '~/lib/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { address, message, signature } = body;

  if (!address || !message || !signature) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    });
  }

  if (!isAddressAllowed(address)) {
    throw createError({
      statusCode: 403,
      message: 'Address not whitelisted',
    });
  }

  const isValid = await verifySignature(address, message, signature);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid signature',
    });
  }

  createSession(event, address);

  return { success: true, address };
});

