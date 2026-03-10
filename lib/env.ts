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

function optionalNumberEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[env] ${key} must be a positive number. Received: ${raw}`);
  }
  return parsed;
}

export const env = {
  REDIS_URL: requireEnv("REDIS_URL"),
  REVALIDATION_SECRET: requireEnv("REVALIDATION_SECRET"),
  WEBHOOK_SIGNING_SECRET: requireEnv("WEBHOOK_SIGNING_SECRET"),
  APP_BASE_URL: requireUrlEnv("APP_BASE_URL"),
  REVALIDATE_RATE_LIMIT_PER_MINUTE: optionalNumberEnv(
    "REVALIDATE_RATE_LIMIT_PER_MINUTE",
    30
  ),
  WEBHOOK_MAX_SKEW_SECONDS: optionalNumberEnv("WEBHOOK_MAX_SKEW_SECONDS", 300),
} as const;
