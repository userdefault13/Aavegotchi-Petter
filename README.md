# Aavegotchi Automated Petting Bot

An automated Node.js service that pets your Aavegotchis every 12 hours on Base network to maintain and increase kinship scores.

## Features

- Automatically pets all ready Aavegotchis every 12 hours
- Checks cooldown status before petting
- Batches multiple Aavegotchis in a single transaction (gas efficient)
- Comprehensive logging and error handling
- Graceful shutdown handling
- Retry logic with exponential backoff

## Prerequisites

- Node.js 18+ and npm
- A Base network wallet with:
  - Private key (for signing transactions)
  - Some ETH on Base for gas fees
  - At least one Aavegotchi NFT

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in your configuration:
```env
PRIVATE_KEY=your_private_key_here
WALLET_ADDRESS=your_wallet_address
BASE_RPC_URL=https://mainnet.base.org
LOG_LEVEL=info
```

## Usage

### Development Mode

Run with TypeScript directly (requires ts-node):
```bash
npm run dev
```

### Production Mode

1. Build the TypeScript code:
```bash
npm run build
```

2. Run the compiled JavaScript:
```bash
npm start
```

### Watch Mode (Development)

Build and watch for changes:
```bash
npm run watch
```

## How It Works

1. The bot connects to Base network using the configured RPC URL
2. It fetches all Aavegotchis owned by your wallet
3. For each Aavegotchi, it checks if 12 hours have passed since the last interaction
4. All ready Aavegotchis are petted in a single batch transaction
5. The bot logs the results and waits for the next scheduled run (12 hours later)

## Scheduling

The bot runs automatically every 12 hours at:
- 00:00 UTC
- 12:00 UTC

It also runs immediately on startup to check and pet any ready Aavegotchis.

## Logging

The bot uses Winston for structured logging. Logs include:
- Transaction hashes and block numbers
- Aavegotchi status (ready/cooldown)
- Kinship values before and after petting
- Error messages and stack traces

Log level can be configured via `LOG_LEVEL` environment variable:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default)
- `debug`: All logs

## Error Handling

The bot includes:
- Automatic retry with exponential backoff for network errors
- Graceful handling of transaction failures
- Prevents concurrent petting cycles
- Continues running even if individual cycles fail

## Security

- **Never commit your `.env` file** - it contains your private key
- Keep your private key secure
- Consider using a dedicated wallet for the bot
- Monitor gas prices and wallet balance

## Troubleshooting

### "No Aavegotchis found in wallet"
- Verify your `WALLET_ADDRESS` is correct
- Ensure you own Aavegotchis on Base network

### "Transaction failed"
- Check you have enough ETH for gas fees
- Verify network connectivity
- Check if Aavegotchis are actually ready (12-hour cooldown)

### "Connection errors"
- Verify your `BASE_RPC_URL` is correct and accessible
- Check your internet connection
- Try a different RPC endpoint

## Contract Information

- **Network**: Base Mainnet (Chain ID: 8453)
- **Diamond Contract**: `0xA99c4B08201F2913Db8D28e71d020c4298F29dBF`
- **Key Function**: `interact(uint256[] calldata _tokenIds)`

## Deployment

- **Cloudflare Worker**: Petting bot runs on a cron (every 12 hours). See [DEPLOYMENT.md](./DEPLOYMENT.md).
- **Vercel Dashboard**: Health check, stats, and bot control. See [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Deploy

```bash
# 1. Deploy Cloudflare Worker
cd worker && npm install && wrangler secret put PRIVATE_KEY  # etc.
npm run deploy

# 2. Deploy Vercel Dashboard
cd web && vercel
```

## License

MIT

