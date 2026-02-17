import { ethers } from 'ethers';
import { getCookie } from 'h3';
import { isDelegatedOwner, checkAuth } from '~/lib';

const AAVEGOTCHI_DIAMOND_ADDRESS = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF';

const AAVEGOTCHI_FACET_ABI = [
  'function isPetOperatorForAll(address _owner, address _operator) external view returns (bool)',
  'function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory)',
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

    const [approved, registered] = await Promise.all([
      contract.isPetOperatorForAll(ownerAddress, petterAddress),
      isDelegatedOwner(ownerAddress),
    ]);

    let gotchiCount = 0;
    if (approved) {
      const tokenIds = await contract.tokenIdsOfOwner(ownerAddress);
      gotchiCount = tokenIds.length;
    }

    return {
      approved,
      registered,
      gotchiCount,
      petterAddress,
      canRegister: approved && !registered,
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to check status',
    });
  }
});
