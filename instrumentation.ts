export async function register() {
  // Only run in the Node.js runtime (not Edge).
  // Dynamic import keeps the heavy DB/fetch code out of the edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoSyncWorker } = await import("./lib/auto-sync-worker");
    startAutoSyncWorker();
  }
}
