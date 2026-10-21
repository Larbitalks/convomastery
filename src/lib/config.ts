const env = import.meta.env

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string) || '',
  forceDemo: env.VITE_FORCE_DEMO === 'true',
  hashRouter: env.VITE_HASH_ROUTER === 'true',
  siteUrl: ((env.VITE_SITE_URL as string) || '').replace(/\/$/, ''),
  gaId: (env.VITE_GA_ID as string) || '',
  /** Turn on once a payment service is connected. Until then paid lessons show "Coming soon". */
  paymentsEnabled: env.VITE_PAYMENTS_ENABLED === 'true',
  social: {
    instagram: (env.VITE_INSTAGRAM_URL as string) || '',
    facebook: (env.VITE_FACEBOOK_URL as string) || '',
    youtube: (env.VITE_YOUTUBE_URL as string) || '',
  },
  siteName: 'ConvoMastery',
}

export const isDemo = config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey
