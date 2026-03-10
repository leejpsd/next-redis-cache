function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
        `Please copy .env.example to .env.local and fill in the values.`
    );
  }
  return val;
}

function requireUrlEnv(key: string): string {
  const value = requireEnv(key);
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    throw new Error(`[env] ${key} must be a valid URL. Received: ${value}`);
  }
}

export const env = {
  REDIS_URL: requireEnv("REDIS_URL"),
  REVALIDATION_SECRET: requireEnv("REVALIDATION_SECRET"),
  APP_BASE_URL: requireUrlEnv("APP_BASE_URL"),
} as const;
