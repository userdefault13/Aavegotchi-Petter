import { ethers } from "ethers";
import { logger } from "../utils/logger";
import { retryWithBackoff, PettingError } from "../utils/errors";

export interface Aavegotchi {
  tokenId: string;
  name: string;
  kinship: string;
  lastInteracted: string;
  canInteract: boolean;
  hoursUntilInteract: number;
}

export class PetterService {
  constructor(
    private contract: ethers.Contract,
    private provider: ethers.JsonRpcProvider,
    private walletAddress: string
  ) {}

  async getUserAavegotchis(): Promise<string[]> {
    try {
      logger.info("Fetching user's Aavegotchis...");
      const tokenIds = await retryWithBackoff(() =>
        this.contract.tokenIdsOfOwner(this.walletAddress)
      );
      const tokenIdsString = tokenIds.map((id: ethers.BigNumberish) =>
        id.toString()
      );
      logger.info(`Found ${tokenIdsString.length} Aavegotchi(s)`, {
        tokenIds: tokenIdsString,
      });
      return tokenIdsString;
    } catch (error) {
      logger.error("Error fetching Aavegotchis", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new PettingError("Failed to fetch Aavegotchis", error as Error);
    }
  }

  async checkAavegotchiStatus(tokenId: string): Promise<Aavegotchi> {
    try {
      const gotchi = await retryWithBackoff(() =>
        this.contract.getAavegotchi(tokenId)
      );
      const kinship = await retryWithBackoff(() =>
        this.contract.kinship(tokenId)
      );

      const currentBlock = await this.provider.getBlock("latest");
      const currentTimestamp = currentBlock?.timestamp || Math.floor(Date.now() / 1000);
      const lastInteracted = gotchi.lastInteracted;
      const lastInteractedTimestamp = Number(lastInteracted);
      const hoursSinceInteraction =
        (currentTimestamp - lastInteractedTimestamp) / 3600;
      const canInteract = hoursSinceInteraction >= 12;

      return {
        tokenId: tokenId.toString(),
        name: gotchi.name || `Aavegotchi #${tokenId}`,
        kinship: kinship.toString(),
        lastInteracted: lastInteractedTimestamp.toString(),
        canInteract,
        hoursUntilInteract: canInteract ? 0 : 12 - hoursSinceInteraction,
      };
    } catch (error) {
      logger.error(`Error checking Aavegotchi ${tokenId} status`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new PettingError(
        `Failed to check Aavegotchi ${tokenId} status`,
        error as Error
      );
    }
  }

  async checkAllAavegotchisStatus(
    tokenIds: string[]
  ): Promise<{ aavegotchis: Aavegotchi[]; readyToPet: string[] }> {
    const aavegotchis: Aavegotchi[] = [];
    const readyToPet: string[] = [];

    logger.info("Checking status of all Aavegotchis...");

    for (const tokenId of tokenIds) {
      try {
        const aavegotchi = await this.checkAavegotchiStatus(tokenId);
        aavegotchis.push(aavegotchi);

        if (aavegotchi.canInteract) {
          readyToPet.push(tokenId);
        } else {
          logger.info(
            `Aavegotchi #${tokenId} (${aavegotchi.name}) not ready`,
            {
              hoursUntilInteract: aavegotchi.hoursUntilInteract.toFixed(1),
              kinship: aavegotchi.kinship,
            }
          );
        }
      } catch (error) {
        logger.error(`Error processing Aavegotchi ${tokenId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Status check complete", {
      total: aavegotchis.length,
      ready: readyToPet.length,
    });

    return { aavegotchis, readyToPet };
  }

  async petAavegotchis(tokenIds: string[]): Promise<string> {
    if (tokenIds.length === 0) {
      logger.info("No Aavegotchis ready to pet");
      throw new PettingError("No Aavegotchis ready to pet");
    }

    try {
      logger.info(`Petting ${tokenIds.length} Aavegotchi(s)...`, {
        tokenIds,
      });

      const tx = await retryWithBackoff(() =>
        this.contract.interact(tokenIds)
      );

      logger.info("Transaction sent", { hash: tx.hash });
      logger.info("Waiting for confirmation...");

      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }

      logger.info("Transaction confirmed", {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });

      return tx.hash;
    } catch (error) {
      logger.error("Error petting Aavegotchis", {
        error: error instanceof Error ? error.message : String(error),
        tokenIds,
      });
      throw new PettingError("Failed to pet Aavegotchis", error as Error);
    }
  }

  async verifyPetting(
    tokenIds: string[],
    previousKinship: Map<string, string>
  ): Promise<void> {
    logger.info("Verifying petting results...");

    for (const tokenId of tokenIds) {
      try {
        const newKinship = await retryWithBackoff(() =>
          this.contract.kinship(tokenId)
        );
        const oldKinship = previousKinship.get(tokenId) || "0";
        const increase =
          parseInt(newKinship.toString()) - parseInt(oldKinship);

        logger.info(`Aavegotchi #${tokenId} kinship updated`, {
          oldKinship,
          newKinship: newKinship.toString(),
          increase,
        });
      } catch (error) {
        logger.error(`Error verifying Aavegotchi ${tokenId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async executePetting(): Promise<void> {
    try {
      logger.info("=== Starting petting cycle ===");

      // Get all owned Aavegotchis
      const tokenIds = await this.getUserAavegotchis();

      if (tokenIds.length === 0) {
        logger.info("No Aavegotchis found in wallet");
        return;
      }

      // Check status of all Aavegotchis
      const { aavegotchis, readyToPet } =
        await this.checkAllAavegotchisStatus(tokenIds);

      // Display status
      logger.info("Aavegotchi Status:");
      for (const gotchi of aavegotchis) {
        const status = gotchi.canInteract ? "Ready" : "Cooldown";
        const hoursLeft = gotchi.hoursUntilInteract.toFixed(1);
        logger.info(
          `${status} | ${gotchi.name} | Kinship: ${gotchi.kinship} | ${
            gotchi.canInteract
              ? "Ready to pet!"
              : `${hoursLeft}h until ready`
          }`
        );
      }

      if (readyToPet.length === 0) {
        logger.info("No Aavegotchis are ready to pet right now");
        return;
      }

      // Store previous kinship values
      const previousKinship = new Map<string, string>();
      for (const gotchi of aavegotchis) {
        if (readyToPet.includes(gotchi.tokenId)) {
          previousKinship.set(gotchi.tokenId, gotchi.kinship);
        }
      }

      // Pet all ready Aavegotchis
      const txHash = await this.petAavegotchis(readyToPet);

      // Verify results
      await this.verifyPetting(readyToPet, previousKinship);

      logger.info("=== Petting cycle complete ===", { txHash });
    } catch (error) {
      logger.error("Error in petting cycle", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

