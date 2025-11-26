import { ethers } from "ethers";
import {
  AAVEGOTCHI_DIAMOND_ADDRESS,
  AAVEGOTCHI_GAME_FACET_ABI,
} from "../config";
import { logger } from "../utils/logger";

export function createAavegotchiContract(
  signer: ethers.Wallet
): ethers.Contract {
  const contract = new ethers.Contract(
    AAVEGOTCHI_DIAMOND_ADDRESS,
    AAVEGOTCHI_GAME_FACET_ABI,
    signer
  );
  logger.info("Contract instance created", {
    address: AAVEGOTCHI_DIAMOND_ADDRESS,
  });
  return contract;
}

