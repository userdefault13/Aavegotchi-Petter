import { ethers } from "ethers";
import { config } from "../config";
import { logger } from "../utils/logger";

export function createProvider(): ethers.JsonRpcProvider {
  const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
  logger.info("Provider created", { rpcUrl: config.baseRpcUrl });
  return provider;
}

export function createWallet(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const wallet = new ethers.Wallet(config.privateKey, provider);
  logger.info("Wallet created", { address: wallet.address });
  return wallet;
}

