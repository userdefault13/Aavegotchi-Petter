import 'dotenv/config'
import { createServer } from 'node:http'
import { createApp, createRouter, eventHandler, setResponseStatus, toNodeListener } from 'h3'
import { getHealth } from './routes/health.js'
import { getBotStatus } from './routes/bot/status.js'
import { postBotStart } from './routes/bot/start.js'
import { postBotStop } from './routes/bot/stop.js'
import { postBotRun } from './routes/bot/run.js'
import { postBotTrigger } from './routes/bot/trigger.js'
import { getBotLogs } from './routes/bot/logs.js'
import { getBotConfig } from './routes/bot/config.js'
import { getBotFrequency, postBotFrequency } from './routes/bot/frequency.js'
import { getDelegationOwners } from './routes/delegation/owners.js'
import { getDelegationRegistered } from './routes/delegation/registered.js'
import { postDelegationRegister } from './routes/delegation/register.js'
import { postDelegationUnregister } from './routes/delegation/unregister.js'
import { postDelegationClearAll } from './routes/delegation/clear-all.js'
import { getDelegatedOwnersRoute } from './routes/delegation/delegated-owners.js'
import { getTransactionsIndex } from './routes/transactions/index.js'
import { postTransactionsClear } from './routes/transactions/clear.js'
import { getTransactionByHash } from './routes/transactions/byHash.js'
import { postTransactionsBackfillGas } from './routes/transactions/backfill-gas.js'
import { getErrorsIndex } from './routes/errors/index.js'
import { postErrorsClear } from './routes/errors/clear.js'
import { getPetterBalance } from './routes/petter-balance.js'
import { getStats } from './routes/stats.js'
import { getHealthApi } from './routes/health-api.js'
import { startCron } from './cron.js'

const app = createApp()
const router = createRouter()

// Health (no auth)
router.get('/health', eventHandler((event) => getHealth(event)))

// Bot
router.get('/api/bot/status', eventHandler(handleError(getBotStatus)))
router.post('/api/bot/start', eventHandler(handleError(postBotStart)))
router.post('/api/bot/stop', eventHandler(handleError(postBotStop)))
router.post('/api/bot/run', eventHandler(handleError(postBotRun)))
router.post('/api/bot/trigger', eventHandler(handleError(postBotTrigger)))
router.get('/api/bot/logs', eventHandler(handleError(getBotLogs)))
router.get('/api/bot/config', eventHandler(handleError(getBotConfig)))
router.get('/api/bot/frequency', eventHandler(handleError(getBotFrequency)))
router.post('/api/bot/frequency', eventHandler(handleError(postBotFrequency)))

// Delegation
router.get('/api/delegation/owners', eventHandler(handleError(getDelegationOwners)))
router.get('/api/delegation/registered', eventHandler(handleError(getDelegationRegistered)))
router.post('/api/delegation/register', eventHandler(handleError(postDelegationRegister)))
router.post('/api/delegation/unregister', eventHandler(handleError(postDelegationUnregister)))
router.post('/api/delegation/clear-all', eventHandler(handleError(postDelegationClearAll)))
router.get('/api/delegated-owners', eventHandler(handleError(getDelegatedOwnersRoute)))

// Transactions
router.get('/api/transactions', eventHandler(handleError(getTransactionsIndex)))
router.post('/api/transactions/clear', eventHandler(handleError(postTransactionsClear)))
router.get('/api/transactions/:hash', eventHandler(handleError(getTransactionByHash)))
router.post('/api/transactions/backfill-gas', eventHandler(handleError(postTransactionsBackfillGas)))

// Errors
router.get('/api/errors', eventHandler(handleError(getErrorsIndex)))
router.post('/api/errors/clear', eventHandler(handleError(postErrorsClear)))

// Petter balance
router.get('/api/petter-balance', eventHandler(handleError(getPetterBalance)))

// Stats & health (dashboard)
router.get('/api/stats', eventHandler(handleError(getStats)))
router.get('/api/health', eventHandler(handleError(getHealthApi)))

function handleError<T>(handler: (e: T) => Promise<unknown>) {
  return async (event: T) => {
    try {
      return await handler(event)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'Unauthorized') {
        setResponseStatus(event as Parameters<typeof setResponseStatus>[0], 401)
        return { error: 'Unauthorized' }
      }
      if (msg.includes('Missing') || msg.includes('Invalid') || msg.includes('must be')) {
        setResponseStatus(event as Parameters<typeof setResponseStatus>[0], 400)
        return { error: msg }
      }
      if (msg === 'Transaction not found') {
        setResponseStatus(event as Parameters<typeof setResponseStatus>[0], 404)
        return { error: msg }
      }
      console.error('[petter]', err)
      setResponseStatus(event as Parameters<typeof setResponseStatus>[0], 500)
      return { error: msg }
    }
  }
}

app.use(router)

const port = parseInt(process.env.PORT || '3001', 10)

startCron()

createServer(toNodeListener(app)).listen(port, '0.0.0.0', () => {
  console.log(`Aavegotchi Petter running at http://localhost:${port}`)
})
