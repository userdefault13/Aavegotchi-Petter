import { ethers } from "ethers";

const AAVEGOTCHI_DIAMOND_ADDRESS = "0xA99c4B08201F2913Db8D28e71d020c4298F29dBF";

const AAVEGOTCHI_GAME_FACET_ABI = [
  "function interact(uint256[] calldata _tokenIds) external",
  "function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory)",
  "function getAavegotchi(uint256 _tokenId) external view returns (tuple(uint256 tokenId, string name, address owner, uint256 randomNumber, uint256 status, int16[6] numericTraits, int16[6] modifiedNumericTraits, uint16[16] equippedWearables, address collateral, address escrow, uint256 stakedAmount, uint256 minimumStake, uint256 kinship, uint256 lastInteracted, uint256 experience, uint256 toNextLevel, uint256 usedSkillPoints, uint256 level, uint256 hauntId, uint256 baseRarityScore, uint256 modifiedRarityScore, bool locked, tuple(uint256 balance, uint256 itemId, uint256[] itemBalances)[] items))",
];

export interface Env {
  PRIVATE_KEY: string;
  WALLET_ADDRESS: string; // Petter wallet (pays gas)
  BASE_RPC_URL: string;
  DASHBOARD_URL: string; // AavegotchiPetterUI URL (e.g. https://aavegotchi-petter.vercel.app)
  REPORT_SECRET: string; // Must match REPORT_SECRET in dashboard
}

function validateEnv(env: Env): void {
  const missing: string[] = [];
  if (!env.PRIVATE_KEY) missing.push("PRIVATE_KEY");
  if (!env.WALLET_ADDRESS) missing.push("WALLET_ADDRESS");
  if (!env.BASE_RPC_URL) missing.push("BASE_RPC_URL");
  if (!env.DASHBOARD_URL) missing.push("DASHBOARD_URL");
  if (!env.REPORT_SECRET) missing.push("REPORT_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `Missing required secrets: ${missing.join(", ")}. Set via: wrangler secret put <name>`
    );
  }
}

export interface WorkerLogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
}

async function reportToDashboard(
  env: Env,
  result: {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    gasCostWei?: string;
    petted?: number;
    tokenIds?: string[];
    message?: string;
    error?: string;
    logs?: WorkerLogEntry[];
  }
) {
  const url = `${env.DASHBOARD_URL.replace(/\/$/, "")}/api/bot/report`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Report-Secret": env.REPORT_SECRET,
      },
      body: JSON.stringify(result),
    });
    if (!response.ok) {
      console.error("Failed to report to dashboard:", await response.text());
    }
  } catch (err) {
    console.error("Error reporting to dashboard:", err);
  }
}

async function fetchDelegatedOwners(env: Env): Promise<string[]> {
  const url = `${env.DASHBOARD_URL.replace(/\/$/, "")}/api/delegated-owners`;
  try {
    const res = await fetch(url, {
      headers: { "X-Report-Secret": env.REPORT_SECRET },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Failed to fetch delegated owners (${res.status}): ${text.slice(0, 200)}. ` +
          `Check DASHBOARD_URL (${env.DASHBOARD_URL}) and REPORT_SECRET match the dashboard.`
      );
    }
    const data = JSON.parse(text) as { owners?: string[] };
    return data.owners || [];
  } catch (err) {
    if (err instanceof Error && err.message.includes("Failed to fetch delegated owners")) {
      throw err;
    }
    throw new Error(
      `Failed to fetch delegated owners: ${err instanceof Error ? err.message : String(err)}. ` +
        `Ensure DASHBOARD_URL and REPORT_SECRET are set correctly.`
    );
  }
}

/** Fetch config from dashboard (RPC URL + petting interval) */
async function fetchDashboardConfig(env: Env): Promise<{
  baseRpcUrl: string;
  pettingIntervalHours: number;
}> {
  const url = `${env.DASHBOARD_URL.replace(/\/$/, "")}/api/bot/config`;
  try {
    const res = await fetch(url, {
      headers: { "X-Report-Secret": env.REPORT_SECRET },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        baseRpcUrl?: string;
        pettingIntervalHours?: number;
      };
      const baseRpcUrl = data.baseRpcUrl || env.BASE_RPC_URL;
      const pettingIntervalHours =
        typeof data.pettingIntervalHours === "number" &&
        data.pettingIntervalHours >= 30 / 3600 &&
        data.pettingIntervalHours <= 24
          ? data.pettingIntervalHours
          : 12;
      return { baseRpcUrl, pettingIntervalHours };
    }
  } catch (err) {
    console.error("Failed to fetch dashboard config:", err);
  }
  return {
    baseRpcUrl: env.BASE_RPC_URL,
    pettingIntervalHours: 12,
  };
}

interface RunResult {
  success: boolean;
  message: string;
  petted?: number;
  transactionHash?: string;
  blockNumber?: number;
}

async function runPetting(env: Env, options?: { force?: boolean }): Promise<RunResult> {
  const logs: WorkerLogEntry[] = [];
  const log = (level: WorkerLogEntry["level"], message: string) => {
    logs.push({ timestamp: Date.now(), level, message });
  };

  validateEnv(env);
  log("info", `Starting run (force=${options?.force ?? false})`);
  const { baseRpcUrl, pettingIntervalHours } = await fetchDashboardConfig(env);
  log("info", `Using RPC: ${baseRpcUrl.replace(/\/\/[^/]+@/, "//***@").slice(0, 50)}...`);
  log("info", `Petting interval: ${pettingIntervalHours}h`);
  const provider = new ethers.JsonRpcProvider(baseRpcUrl);
  const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(
    AAVEGOTCHI_DIAMOND_ADDRESS,
    AAVEGOTCHI_GAME_FACET_ABI,
    wallet
  );

  // EIP PetOperator: fetch owners who delegated petting to us
  const delegatedOwners = await fetchDelegatedOwners(env);
  log("info", `Fetched ${delegatedOwners.length} delegated owner(s): ${delegatedOwners.join(", ") || "(none)"}`);

  // Also support legacy: petter wallet's own gotchis
  const delegatedLower = (delegatedOwners || [])
    .filter((o): o is string => typeof o === "string" && o.length > 0)
    .map((o) => o.toLowerCase());
  const ownersToCheck = [...new Set([env.WALLET_ADDRESS.toLowerCase(), ...delegatedLower])];
  log("info", `Checking ${ownersToCheck.length} owner(s) for gotchis`);

  const allTokenIds: string[] = [];
  for (const owner of ownersToCheck) {
    try {
      const tokenIds = await contract.tokenIdsOfOwner(owner);
      const ids = tokenIds.map((id: ethers.BigNumberish) => id.toString());
      allTokenIds.push(...ids);
      log("info", `Owner ${owner.slice(0, 10)}...: ${ids.length} gotchi(s)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `tokenIdsOfOwner(${owner.slice(0, 10)}...): ${msg}`);
    }
  }

  if (allTokenIds.length === 0) {
    const msg = delegatedOwners.length > 0 ? "No Aavegotchis found for delegated owners" : "No delegated owners or Aavegotchis found";
    log("info", msg);
    await reportToDashboard(env, { success: true, message: msg, petted: 0, logs });
    return { success: true, message: msg, petted: 0 };
  }

  const skipCooldown = options?.force === true;

  const readyToPet: string[] = [];
  if (skipCooldown) {
    readyToPet.push(...allTokenIds);
  } else {
    const currentBlock = await provider.getBlock("latest");
    const currentTimestamp =
      currentBlock?.timestamp || Math.floor(Date.now() / 1000);

    let anyNeedsKinship = false;
    for (const tokenId of allTokenIds) {
      try {
        const gotchi = await contract.getAavegotchi(tokenId);
        const lastInteractedTimestamp = Number(gotchi.lastInteracted);
        const hoursSinceInteraction =
          (currentTimestamp - lastInteractedTimestamp) / 3600;
        if (hoursSinceInteraction >= pettingIntervalHours) {
          anyNeedsKinship = true;
          break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("warn", `getAavegotchi(${tokenId}): ${msg}`);
      }
    }
    // If any gotchi needs kinship (past 12h), pet ALL gotchis in one batch
    if (anyNeedsKinship) {
      readyToPet.push(...allTokenIds);
    }
  }

  if (readyToPet.length === 0) {
    const msg = skipCooldown
      ? "No Aavegotchis to pet."
      : `No Aavegotchis ready for kinship (${pettingIntervalHours}h cooldown). Checked ${allTokenIds.length} gotchis.`;
    log("info", msg);
    await reportToDashboard(env, { success: true, message: msg, petted: 0, logs });
    return { success: true, message: msg, petted: 0 };
  }

  log("info", `Petting ${readyToPet.length} gotchi(s)`);
  let tx;
  try {
    tx = await contract.interact(readyToPet);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Transaction failed: ${msg}. ` +
        `Check: petter wallet has ETH for gas, all owners have approved setPetOperatorForAll, and RPC is healthy.`
    );
  }
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction receipt is null");
  }

  const gasCostWei =
    receipt.gasUsed && receipt.effectiveGasPrice
      ? (receipt.gasUsed * receipt.effectiveGasPrice).toString()
      : undefined;

  const result: RunResult = {
    success: true,
    message: `Petted ${readyToPet.length} Aavegotchi(s)`,
    petted: readyToPet.length,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
  };
  log("info", `Tx ${tx.hash} confirmed`);
  await reportToDashboard(env, {
    success: true,
    message: result.message,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasCostWei,
    petted: readyToPet.length,
    tokenIds: readyToPet,
    logs,
  });
  return result;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        return Response.json({
          status: "ok",
          service: "aavegotchi-petter",
          timestamp: new Date().toISOString(),
        });
      }
      if (url.pathname === "/run" && request.method === "POST") {
        try {
          let body: { force?: boolean } = {};
          try {
            body = (await request.json()) as { force?: boolean };
          } catch {
            /* empty body is ok */
          }
          const result = await runPetting(env, { force: body.force });
          return Response.json(result);
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          const logs: WorkerLogEntry[] = [
            { timestamp: Date.now(), level: "error", message: error.message },
          ];
          try {
            await reportToDashboard(env, {
              success: false,
              error: error.message,
              logs,
            });
          } catch (_) {
            /* ignore report failure */
          }
          return Response.json(
            { success: false, error: error.message },
            { status: 500 }
          );
        }
      }
      return new Response("Not Found", { status: 404 });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const _result = await runPetting(env);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const logs: WorkerLogEntry[] = [
        { timestamp: Date.now(), level: "error", message: error.message },
      ];
      await reportToDashboard(env, {
        success: false,
        error: error.message,
        logs,
      });
      throw err;
    }
  },
};
