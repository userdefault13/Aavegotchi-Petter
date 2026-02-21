/**
 * Petting logic - ONLY calls interact() on Aavegotchi diamond - no ETH transfers.
 */
import { createPublicClient, createWalletClient, http, parseAbi, type Abi } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import {
  getDelegatedOwners,
  getBotState,
  getPettingIntervalHours,
  addTransaction,
  addWorkerLogs,
  addError,
  setBotState,
} from './redis.js'

const AAVEGOTCHI_DIAMOND = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF' as const

const AAVEGOTCHI_ABI = [
  ...parseAbi([
    'function interact(uint256[] calldata _tokenIds) external',
    'function tokenIdsOfOwner(address _owner) external view returns (uint32[] memory)',
  ]),
  {
    name: 'getAavegotchi',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'randomNumber', type: 'uint256' },
          { name: 'status', type: 'uint256' },
          { name: 'numericTraits', type: 'int16[6]' },
          { name: 'modifiedNumericTraits', type: 'int16[6]' },
          { name: 'equippedWearables', type: 'uint16[16]' },
          { name: 'collateral', type: 'address' },
          { name: 'escrow', type: 'address' },
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'minimumStake', type: 'uint256' },
          { name: 'kinship', type: 'uint256' },
          { name: 'lastInteracted', type: 'uint256' },
          { name: 'experience', type: 'uint256' },
          { name: 'toNextLevel', type: 'uint256' },
          { name: 'usedSkillPoints', type: 'uint256' },
          { name: 'level', type: 'uint256' },
          { name: 'hauntId', type: 'uint256' },
          { name: 'baseRarityScore', type: 'uint256' },
          { name: 'modifiedRarityScore', type: 'uint256' },
          { name: 'locked', type: 'bool' },
          {
            name: 'items',
            type: 'tuple[]',
            components: [
              { name: 'balance', type: 'uint256' },
              { name: 'itemId', type: 'uint256' },
              { name: 'itemBalances', type: 'uint256[]' },
            ],
          },
        ],
      },
    ],
  },
] as const satisfies Abi

export type LogEntry = { timestamp: number; level: 'info' | 'warn' | 'error'; message: string }

export interface RunPettingOptions {
  force?: boolean
  privateKey: string
  petterAddress: string
  baseRpcUrl: string
}

export interface RunPettingResult {
  success: boolean
  message: string
  petted?: number
  transactionHash?: string
  blockNumber?: number
}

export async function runPetting(options: RunPettingOptions): Promise<RunPettingResult> {
  const { force = false, privateKey, petterAddress, baseRpcUrl } = options

  const logs: LogEntry[] = []
  const log = (level: LogEntry['level'], msg: string) => {
    logs.push({ timestamp: Date.now(), level, message: msg })
  }

  log('info', `Starting run (force=${force})`)

  const [botState, pettingIntervalHours] = await Promise.all([
    getBotState(),
    getPettingIntervalHours(),
  ])
  log('info', `Petting interval: ${pettingIntervalHours}h`)

  if (!botState?.running && !force) {
    log('info', 'Bot is stopped. Skipping. Start the bot in the dashboard to run on schedule.')
    await addWorkerLogs(logs)
    await setBotState({
      ...botState!,
      lastRun: Date.now(),
      lastRunMessage: 'Bot stopped, skipped',
    })
    return { success: true, message: 'Bot stopped, skipped', petted: 0 }
  }

  const transport = http(baseRpcUrl)
  const publicClient = createPublicClient({ chain: base, transport })
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport,
  })

  const delegatedOwners = await getDelegatedOwners()
  const delegatedLower = delegatedOwners
    .filter((o): o is string => typeof o === 'string' && o.length > 0)
    .map((o) => o.toLowerCase())
  const ownersToCheck = [...new Set([petterAddress.toLowerCase(), ...delegatedLower])]
  log('info', `Checking ${ownersToCheck.length} owner(s) for gotchis`)

  const allTokenIds: string[] = []
  for (const owner of ownersToCheck) {
    try {
      const tokenIds = await publicClient.readContract({
        address: AAVEGOTCHI_DIAMOND,
        abi: AAVEGOTCHI_ABI,
        functionName: 'tokenIdsOfOwner',
        args: [owner as `0x${string}`],
      })
      const ids = Array.isArray(tokenIds) ? tokenIds.map((id: bigint) => id.toString()) : []
      allTokenIds.push(...ids)
      log('info', `Owner ${owner.slice(0, 10)}...: ${ids.length} gotchi(s)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log('error', `tokenIdsOfOwner(${owner.slice(0, 10)}...): ${msg}`)
    }
  }

  if (allTokenIds.length === 0) {
    const msg =
      delegatedOwners.length > 0
        ? 'No Aavegotchis found for delegated owners'
        : 'No delegated owners or Aavegotchis found'
    log('info', msg)
    await addWorkerLogs(logs)
    await setBotState({
      ...botState!,
      lastRun: Date.now(),
      lastRunMessage: msg,
    })
    return { success: true, message: msg, petted: 0 }
  }

  let readyToPet: string[] = []
  if (force) {
    readyToPet = [...allTokenIds]
  } else {
    const block = await publicClient.getBlock({ blockTag: 'latest' })
    const currentTimestamp = block?.timestamp ?? BigInt(Math.floor(Date.now() / 1000))
    let anyNeedsKinship = false
    for (const tokenId of allTokenIds) {
      try {
        const gotchi = await publicClient.readContract({
          address: AAVEGOTCHI_DIAMOND,
          abi: AAVEGOTCHI_ABI,
          functionName: 'getAavegotchi',
          args: [BigInt(tokenId)],
        })
        const lastInteracted = Number((gotchi as { lastInteracted: bigint }).lastInteracted)
        const hoursSince = (Number(currentTimestamp) - lastInteracted) / 3600
        if (hoursSince >= pettingIntervalHours) {
          anyNeedsKinship = true
          break
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log('warn', `getAavegotchi(${tokenId}): ${msg}`)
        anyNeedsKinship = true
        break
      }
    }
    if (anyNeedsKinship) {
      readyToPet = [...allTokenIds]
    }
  }

  if (readyToPet.length === 0) {
    const msg = force
      ? 'No Aavegotchis to pet.'
      : `No Aavegotchis ready for kinship (${pettingIntervalHours}h cooldown). Checked ${allTokenIds.length} gotchis.`
    log('info', msg)
    await addWorkerLogs(logs)
    await setBotState({ ...botState!, lastRun: Date.now(), lastRunMessage: msg })
    return { success: true, message: msg, petted: 0 }
  }

  log('info', `Petting ${readyToPet.length} gotchi(s)`)

  try {
    const hash = await walletClient.writeContract({
      address: AAVEGOTCHI_DIAMOND,
      abi: AAVEGOTCHI_ABI,
      functionName: 'interact',
      args: [readyToPet.map((id) => BigInt(id))],
      account,
    })

    if (!hash) {
      throw new Error('Transaction hash is null')
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    const gasCostWei =
      receipt.gasUsed && receipt.effectiveGasPrice
        ? (receipt.gasUsed * receipt.effectiveGasPrice).toString()
        : undefined

    log('info', `Tx ${hash} confirmed`)

    await addTransaction({
      hash,
      timestamp: Date.now(),
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      gasCostWei,
      tokenIds: readyToPet,
    })
    await addWorkerLogs(logs)
    await setBotState({
      ...botState!,
      running: true,
      lastRun: Date.now(),
      lastError: undefined,
      lastRunMessage: `Petted ${readyToPet.length} Aavegotchi(s)`,
    })

    return {
      success: true,
      message: `Petted ${readyToPet.length} Aavegotchi(s)`,
      petted: readyToPet.length,
      transactionHash: hash,
      blockNumber: Number(receipt.blockNumber),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', `Transaction failed: ${msg}`)
    await addWorkerLogs(logs)
    await addError({
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: msg,
      type: 'PettingError',
    })
    await setBotState({
      ...botState!,
      lastError: msg,
      lastRunMessage: undefined,
    })
    throw err
  }
}
