import { ethers } from 'ethers';
import { addTransaction, addError, getBotState, setBotState } from '~/lib/kv';

const AAVEGOTCHI_DIAMOND_ADDRESS = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF';

const AAVEGOTCHI_GAME_FACET_ABI = [
  'function interact(uint256[] calldata _tokenIds) external',
  'function kinship(uint256 _tokenId) external view returns (uint256)',
  'function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory)',
  'function getAavegotchi(uint256 _tokenId) external view returns (tuple(uint256 tokenId, string name, address owner, uint256 randomNumber, uint256 status, int16[6] numericTraits, int16[6] modifiedNumericTraits, uint16[16] equippedWearables, address collateral, address escrow, uint256 stakedAmount, uint256 minimumStake, uint256 kinship, uint256 lastInteracted, uint256 experience, uint256 toNextLevel, uint256 usedSkillPoints, uint256 level, uint256 hauntId, uint256 baseRarityScore, uint256 modifiedRarityScore, bool locked, tuple(uint256 balance, uint256 itemId, uint256[] itemBalances)[] items))',
];

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  if (!config.privateKey || !config.walletAddress || !config.baseRpcUrl) {
    throw createError({
      statusCode: 500,
      message: 'Bot configuration missing',
    });
  }

  try {
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    const contract = new ethers.Contract(
      AAVEGOTCHI_DIAMOND_ADDRESS,
      AAVEGOTCHI_GAME_FACET_ABI,
      wallet
    );

    // Get user's Aavegotchis
    const tokenIds = await contract.tokenIdsOfOwner(config.walletAddress);
    const tokenIdsString = tokenIds.map((id: ethers.BigNumberish) => id.toString());

    if (tokenIdsString.length === 0) {
      return { success: true, message: 'No Aavegotchis found', petted: 0 };
    }

    // Get current block timestamp
    const currentBlock = await provider.getBlock('latest');
    const currentTimestamp = currentBlock?.timestamp || Math.floor(Date.now() / 1000);

    // Check which Aavegotchis are ready
    const readyToPet: string[] = [];

    for (const tokenId of tokenIdsString) {
      try {
        const gotchi = await contract.getAavegotchi(tokenId);
        const lastInteracted = gotchi.lastInteracted;
        const lastInteractedTimestamp = Number(lastInteracted);
        const hoursSinceInteraction = (currentTimestamp - lastInteractedTimestamp) / 3600;
        
        if (hoursSinceInteraction >= 12) {
          readyToPet.push(tokenId);
        }
      } catch (error) {
        console.error(`Error checking Aavegotchi ${tokenId}:`, error);
      }
    }

    if (readyToPet.length === 0) {
      return { success: true, message: 'No Aavegotchis ready to pet', petted: 0 };
    }

    // Pet the Aavegotchis
    const tx = await contract.interact(readyToPet);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }

    // Store transaction
    await addTransaction({
      hash: tx.hash,
      timestamp: Date.now(),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      tokenIds: readyToPet,
    });

    // Update bot state
    const state = await getBotState();
    await setBotState({
      ...state,
      lastRun: Date.now(),
      running: state?.running ?? true,
    });

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      petted: readyToPet.length,
      tokenIds: readyToPet,
    };
  } catch (error: any) {
    // Store error
    await addError({
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.name || 'Error',
    });

    // Update bot state
    const state = await getBotState();
    await setBotState({
      ...state,
      lastError: error.message,
    });

    throw createError({
      statusCode: 500,
      message: error.message || 'Bot execution failed',
    });
  }
});

