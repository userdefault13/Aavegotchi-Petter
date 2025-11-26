import cron from "node-cron";
import { logger } from "../utils/logger";
import { PetterService } from "./petter";

export class SchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private petterService: PetterService;

  constructor(petterService: PetterService) {
    this.petterService = petterService;
  }

  start(): void {
    // Schedule to run every 12 hours at the top of the hour
    // This runs at 00:00 and 12:00 UTC every day
    const cronExpression = "0 */12 * * *";

    logger.info("Starting scheduler", { cronExpression });

    this.cronJob = cron.schedule(
      cronExpression,
      async () => {
        if (this.isRunning) {
          logger.warn("Previous petting cycle still running, skipping...");
          return;
        }

        this.isRunning = true;
        try {
          await this.petterService.executePetting();
        } catch (error) {
          logger.error("Error in scheduled petting", {
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          this.isRunning = false;
        }
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    // Also run immediately on startup (optional, can be removed if not desired)
    logger.info("Running initial petting cycle...");
    this.petterService.executePetting().catch((error) => {
      logger.error("Error in initial petting cycle", {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    logger.info("Scheduler started successfully");
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info("Scheduler stopped");
    }
  }

  getNextRunTime(): Date | null {
    if (!this.cronJob) {
      return null;
    }

    // Calculate next run time (every 12 hours)
    const now = new Date();
    const hours = now.getUTCHours();
    const nextHour = hours < 12 ? 12 : 24;
    const nextRun = new Date(now);
    nextRun.setUTCHours(nextHour, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      nextRun.setUTCHours(0, 0, 0, 0);
    }

    return nextRun;
  }
}

