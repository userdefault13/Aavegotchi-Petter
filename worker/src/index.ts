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
  DASHBOARD_URL: string;
  REPORT_SECRET: string;
}

async function reportToDashboard(
  env: Env,
  result: {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    petted?: number;
    tokenIds?: string[];
    message?: string;
    error?: string;
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
  const res = await fetch(url, {
    headers: { "X-Report-Secret": env.REPORT_SECRET },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch delegated owners: ${await res.text()}`);
  }
  const data = (await res.json()) as { owners: string[] };
  return data.owners || [];
}

async function runPetting(env: Env): Promise<void> {
  const provider = new ethers.JsonRpcProvider(env.BASE_RPC_URL);
  const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(
    AAVEGOTCHI_DIAMOND_ADDRESS,
    AAVEGOTCHI_GAME_FACET_ABI,
    wallet
  );

  // EIP PetOperator: fetch owners who delegated petting to us
  const delegatedOwners = await fetchDelegatedOwners(env);

  // Also support legacy: petter wallet's own gotchis
  const ownersToCheck = [...new Set([env.WALLET_ADDRESS.toLowerCase(), ...delegatedOwners.map((o) => o.toLowerCase())])];

  const allTokenIds: string[] = [];
  for (const owner of ownersToCheck) {
    try {
      const tokenIds = await contract.tokenIdsOfOwner(owner);
      const ids = tokenIds.map((id: ethers.BigNumberish) => id.toString());
      allTokenIds.push(...ids);
    } catch (err) {
      console.error(`Error fetching tokens for ${owner}:`, err);
    }
  }

  if (allTokenIds.length === 0) {
    await reportToDashboard(env, {
      success: true,
      message: delegatedOwners.length > 0 ? "No Aavegotchis found for delegated owners" : "No delegated owners or Aavegotchis found",
      petted: 0,
    });
    return;
  }

  const currentBlock = await provider.getBlock("latest");
  const currentTimestamp =
    currentBlock?.timestamp || Math.floor(Date.now() / 1000);

  const readyToPet: string[] = [];
  for (const tokenId of allTokenIds) {
    try {
      const gotchi = await contract.getAavegotchi(tokenId);
      const lastInteractedTimestamp = Number(gotchi.lastInteracted);
      const hoursSinceInteraction =
        (currentTimestamp - lastInteractedTimestamp) / 3600;
      if (hoursSinceInteraction >= 12) {
        readyToPet.push(tokenId);
      }
    } catch (err) {
      console.error(`Error checking Aavegotchi ${tokenId}:`, err);
    }
  }

  if (readyToPet.length === 0) {
    await reportToDashboard(env, {
      success: true,
      message: "No Aavegotchis ready to pet",
      petted: 0,
    });
    return;
  }

  const tx = await contract.interact(readyToPet);
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction receipt is null");
  }

  await reportToDashboard(env, {
    success: true,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    petted: readyToPet.length,
    tokenIds: readyToPet,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
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
        await runPetting(env);
        return Response.json({ success: true, message: "Petting completed" });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        await reportToDashboard(env, {
          success: false,
          error: error.message,
        });
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      await runPetting(env);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      await reportToDashboard(env, {
        success: false,
        error: error.message,
      });
      throw err;
    }
  },
};
