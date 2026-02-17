import { verifySignature, createSession, isAddressAllowed } from '~/lib/auth';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const { address, message, signature } = body;

  if (!address || !message || !signature) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    });
  }

  const allowedAddress = config.allowedAddress;
  if (!isAddressAllowed(address, allowedAddress)) {
    throw createError({
      statusCode: 403,
      message: 'Address not whitelisted',
    });
  }

  const isValid = await verifySignature(address, message, signature, allowedAddress);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid signature',
    });
  }

  createSession(event, address);

  return { success: true, address };
});

