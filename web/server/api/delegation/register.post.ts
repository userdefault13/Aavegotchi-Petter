import { ethers } from 'ethers';
import { getCookie } from 'h3';
import { addDelegatedOwner, isDelegatedOwner, checkAuth } from '~/lib';

const AAVEGOTCHI_DIAMOND_ADDRESS = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF';

const AAVEGOTCHI_FACET_ABI = [
  'function isPetOperatorForAll(address _owner, address _operator) external view returns (bool)',
  'function setPetOperatorForAll(address _operator, bool _approved) external',
];

export default defineEventHandler(async (event) => {
  if (!checkAuth(event)) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const config = useRuntimeConfig();
  const petterAddress = config.petterAddress || config.walletAddress;

  if (!petterAddress || !config.baseRpcUrl) {
    throw createError({
      statusCode: 500,
      message: 'Petter not configured',
    });
  }

  const session = getCookie(event, 'auth_session') as string | undefined;
  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  const ownerAddress = session;

  try {
    const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
    const contract = new ethers.Contract(
      AAVEGOTCHI_DIAMOND_ADDRESS,
      AAVEGOTCHI_FACET_ABI,
      provider
    );

    const isApproved = await contract.isPetOperatorForAll(ownerAddress, petterAddress);

    if (!isApproved) {
      throw createError({
        statusCode: 400,
        message: 'Please approve the petter first. Call setPetOperatorForAll on the Aavegotchi contract.',
      });
    }

    const alreadyRegistered = await isDelegatedOwner(ownerAddress);
    if (!alreadyRegistered) {
      await addDelegatedOwner(ownerAddress);
    }

    return {
      success: true,
      message: 'Registered for auto-petting. Your Aavegotchis will be petted every 12 hours.',
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    throw createError({
      statusCode: 500,
      message: err.message || 'Registration failed',
    });
  }
});
