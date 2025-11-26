// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    kvRestApiUrl: process.env.KV_REST_API_URL,
    kvRestApiToken: process.env.KV_REST_API_TOKEN,
    allowedAddress: process.env.ALLOWED_ADDRESS || '0x2127aa7265d573aa467f1d73554d17890b872e76',
    privateKey: process.env.PRIVATE_KEY,
    walletAddress: process.env.WALLET_ADDRESS,
    baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    public: {
      allowedAddress: process.env.ALLOWED_ADDRESS || '0x2127aa7265d573aa467f1d73554d17890b872e76',
    }
  }
})
