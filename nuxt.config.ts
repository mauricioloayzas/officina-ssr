export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2025-07-15',

  nitro: {
    preset: 'aws-lambda',
  },

  css: ['~/assets/css/main.css'],

  app: {
    cdnURL: process.env.NUXT_APP_CDN_URL ?? '',
    head: {
      htmlAttrs: { lang: 'es' },
      titleTemplate: (title) => title ? `${title} — Clichín` : 'Clichín — Solicitar pedido',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiAuthBase: process.env.NUXT_PUBLIC_API_AUTH_BASE || '',
      apiOfficinaBase: process.env.NUXT_PUBLIC_API_OFFICINA_BASE || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://pedidos.clichin.app',
    },
  },
})
