import { createProvider, createWallet } from "./blockchain/provider";
import { createAavegotchiContract } from "./blockchain/contract";
import { PetterService } from "./services/petter";
import { SchedulerService } from "./services/scheduler";
import { logger } from "./utils/logger";
import { config } from "./config";

let scheduler: SchedulerService | null = null;

async function main() {
  try {
    logger.info("=== Aavegotchi Petting Bot Starting ===");

    // Initialize blockchain connections
    const provider = createProvider();
    const wallet = createWallet(provider);
    const contract = createAavegotchiContract(wallet);

    // Verify wallet address matches config
    const walletAddress = await wallet.getAddress();
    if (walletAddress.toLowerCase() !== config.walletAddress.toLowerCase()) {
      logger.warn(
        "Wallet address mismatch",
        {
          config: config.walletAddress,
          actual: walletAddress,
        }
      );
    }

    // Initialize services
    const petterService = new PetterService(contract, provider, walletAddress);
    scheduler = new SchedulerService(petterService);

    // Start scheduler
    scheduler.start();

    const nextRun = scheduler.getNextRunTime();
    if (nextRun) {
      logger.info("Next scheduled run", { nextRun: nextRun.toISOString() });
    }

    logger.info("=== Bot is running ===");
    logger.info("Press Ctrl+C to stop");

    // Handle graceful shutdown
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

    // Keep process alive
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection", {
        reason,
        promise,
      });
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown();
    });
  } catch (error) {
    logger.error("Failed to start bot", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

function gracefulShutdown() {
  logger.info("Shutting down gracefully...");

  if (scheduler) {
    scheduler.stop();
  }

  logger.info("Shutdown complete");
  process.exit(0);
}

// Start the bot
main();

