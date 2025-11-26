# Aavegotchi Petter Bot - Web UI

Vue/Nuxt.js web application for controlling the Aavegotchi petting bot, deployed on Vercel.

## Features

- **MetaMask Authentication**: Connect wallet and sign message to authenticate
- **Whitelist Protection**: Only address `0x2127aa7265d573aa467f1d73554d17890b872e76` can access
- **Bot Control**: Start/stop bot and trigger manual petting cycles
- **Transaction History**: View all successful petting transactions
- **Error Logs**: Monitor and clear error logs
- **Real-time Updates**: Auto-refreshing status and data

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```env
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
ALLOWED_ADDRESS=0x2127aa7265d573aa467f1d73554d17890b872e76
PRIVATE_KEY=your_bot_private_key
WALLET_ADDRESS=your_bot_wallet_address
BASE_RPC_URL=https://mainnet.base.org
```

3. Run development server:
```bash
npm run dev
```

## Deployment to Vercel

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set up Vercel KV database
4. Deploy

The bot will automatically run every 12 hours via Vercel Cron Jobs (configured in `vercel.json`).

## Project Structure

```
web/
├── components/          # Vue components
│   ├── WalletConnect.vue
│   ├── BotControl.vue
│   ├── TransactionList.vue
│   └── ErrorList.vue
├── pages/              # Nuxt pages
│   ├── index.vue       # Login page
│   └── dashboard/      # Dashboard (protected)
├── server/api/         # API routes
│   ├── auth/           # Authentication endpoints
│   ├── bot/            # Bot control endpoints
│   ├── transactions/   # Transaction endpoints
│   └── errors/         # Error log endpoints
├── lib/                # Utilities
│   ├── auth.ts         # Authentication helpers
│   ├── kv.ts           # Vercel KV operations
│   └── wagmi.ts        # Wagmi configuration
└── vercel.json         # Vercel configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify MetaMask signature
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Check authentication status

### Bot Control
- `GET /api/bot/status` - Get bot status
- `POST /api/bot/start` - Start bot
- `POST /api/bot/stop` - Stop bot
- `POST /api/bot/trigger` - Trigger manual petting cycle
- `POST /api/bot/run` - Execute petting (called by cron)

### Transactions
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/[hash]` - Get specific transaction

### Errors
- `GET /api/errors` - Get error logs
- `POST /api/errors/clear` - Clear error logs

## Security

- All API routes (except auth) require authentication
- Whitelist check on every request
- MetaMask signature verification
- Secure cookie-based sessions
- Private keys stored only in environment variables
