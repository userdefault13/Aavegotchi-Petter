import path from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    preset: 'vercel',
  },
  modules: [
    '@nuxtjs/tailwindcss',
    (_options: any, nuxt: any) => {
      nuxt.hook('modules:done', () => {
        const root = nuxt.options.rootDir ?? process.cwd()
        const postcssOptions = (nuxt.options as any).postcss ?? (nuxt.options.build as any)?.postcss?.postcssOptions ?? (nuxt.options.build as any)?.postcss
        const plugins = postcssOptions?.plugins as Record<string, unknown> | undefined
        if (plugins?.tailwindcss && typeof plugins.tailwindcss === 'string' && plugins.tailwindcss.includes('.nuxt/tailwind/postcss.mjs')) {
          plugins.tailwindcss = path.join(root, 'tailwind.config.js')
        }
      })
    },
  ],
  runtimeConfig: {
    kvRestApiUrl: process.env.KV_REST_API_URL,
    kvRestApiToken: process.env.KV_REST_API_TOKEN,
    allowedAddress: process.env.ALLOWED_ADDRESS || '0x2127aa7265d573aa467f1d73554d17890b872e76',
    privateKey: process.env.PRIVATE_KEY,
    walletAddress: process.env.WALLET_ADDRESS,
    baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    reportSecret: process.env.REPORT_SECRET,
    petterAddress: process.env.PETTER_ADDRESS || process.env.WALLET_ADDRESS,
    public: {
      allowedAddress: process.env.ALLOWED_ADDRESS || '0x2127aa7265d573aa467f1d73554d17890b872e76',
    }
  }
})
