export const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(
      `[ERROR] ${message}`,
      error instanceof Error ? error.stack : error
    ),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
};
