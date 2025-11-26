import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

// Contract address for Base Mainnet
export const AAVEGOTCHI_DIAMOND_ADDRESS =
  "0xA99c4B08201F2913Db8D28e71d020c4298F29dBF";

// ABI for the interact function and related view functions
export const AAVEGOTCHI_GAME_FACET_ABI = [
  "function interact(uint256[] calldata _tokenIds) external",
  "function kinship(uint256 _tokenId) external view returns (uint256)",
  "function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory)",
  "function getAavegotchi(uint256 _tokenId) external view returns (tuple(uint256 tokenId, string name, address owner, uint256 randomNumber, uint256 status, int16[6] numericTraits, int16[6] modifiedNumericTraits, uint16[16] equippedWearables, address collateral, address escrow, uint256 stakedAmount, uint256 minimumStake, uint256 kinship, uint256 lastInteracted, uint256 experience, uint256 toNextLevel, uint256 usedSkillPoints, uint256 level, uint256 hauntId, uint256 baseRarityScore, uint256 modifiedRarityScore, bool locked, tuple(uint256 balance, uint256 itemId, uint256[] itemBalances)[] items))",
];

export interface Config {
  privateKey: string;
  walletAddress: string;
  baseRpcUrl: string;
  logLevel: string;
}

function validateConfig(): Config {
  const privateKey = process.env.PRIVATE_KEY;
  const walletAddress = process.env.WALLET_ADDRESS;
  const baseRpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const logLevel = process.env.LOG_LEVEL || "info";

  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!walletAddress) {
    throw new Error("WALLET_ADDRESS environment variable is required");
  }

  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    throw new Error("PRIVATE_KEY must be a valid hex string (0x...)");
  }

  return {
    privateKey,
    walletAddress,
    baseRpcUrl,
    logLevel,
  };
}

export const config = validateConfig();

logger.info("Configuration loaded", {
  walletAddress: config.walletAddress,
  baseRpcUrl: config.baseRpcUrl,
  logLevel: config.logLevel,
});

