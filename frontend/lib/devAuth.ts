/** Dev-only login — requires NEXT_PUBLIC_ENABLE_DEV_LOGIN=true; never enabled in production. */
export const isDevLoginEnabled =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';
