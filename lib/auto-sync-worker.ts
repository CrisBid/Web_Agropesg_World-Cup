/**
 * Background sync worker — runs server-side, no browser needed.
 * Started once via instrumentation.ts when the Next.js server boots.
 *
 * Every CHECK_INTERVAL_MS it checks whether any game today is in the
 * post-game window (kickoff + 115 min → kickoff + 145 min) and has no
 * result in the DB yet. If so, it calls syncResultsFromAPI().
 */

import { GAMES } from "./games-data";
import { getResults } from "./data";
import { syncResultsFromAPI } from "./sync-results";

const GAME_END_BUFFER_MS = 115 * 60_000; // assume game ends 115 min after kickoff
const SYNC_WINDOW_MS     =  30 * 60_000; // keep trying for 30 min after expected end
const CHECK_INTERVAL_MS  =   2 * 60_000; // check every 2 minutes

let syncInProgress = false;

async function checkAndSync() {
  if (syncInProgress) return;

  const nowMs  = Date.now();
  const nowBRT = new Date(nowMs - 3 * 3_600_000);
  const today  = nowBRT.toISOString().slice(0, 10); // "YYYY-MM-DD" in BRT

  // Fast path: is any game even in the post-game window right now?
  const anyInWindow = GAMES.some((g) => {
    if (!g.date.startsWith(today)) return false;
    const kickoff     = new Date(g.date + ":00-03:00").getTime();
    const expectedEnd = kickoff + GAME_END_BUFFER_MS;
    return nowMs >= expectedEnd && nowMs < expectedEnd + SYNC_WINDOW_MS;
  });

  if (!anyInWindow) return;

  // Slower path: check DB to see if results are missing
  const results = await getResults();
  const hasPending = GAMES.some((g) => {
    if (!g.date.startsWith(today)) return false;
    const kickoff     = new Date(g.date + ":00-03:00").getTime();
    const expectedEnd = kickoff + GAME_END_BUFFER_MS;
    if (!(nowMs >= expectedEnd && nowMs < expectedEnd + SYNC_WINDOW_MS)) return false;
    const hasResult = g.phase === "grupos"
      ? results.groups[g.id] !== undefined
      : results.knockout[g.id] !== undefined;
    return !hasResult;
  });

  if (!hasPending) return;

  syncInProgress = true;
  try {
    console.log("[auto-sync] Jogos sem resultado detectados — sincronizando...");
    const result = await syncResultsFromAPI();
    console.log(`[auto-sync] Concluído: ${result.synced} sincronizado(s), ${result.skipped} aguardando`);
    if (result.errors.length > 0) {
      console.warn("[auto-sync] Avisos:", result.errors);
    }
  } catch (err) {
    console.error("[auto-sync] Erro ao sincronizar:", err);
  } finally {
    syncInProgress = false;
  }
}

let started = false;

export function startAutoSyncWorker() {
  if (started) return;
  started = true;

  // Check immediately at startup (catches server restarts during a sync window)
  checkAndSync().catch(console.error);

  // Then check every 2 minutes
  setInterval(() => {
    checkAndSync().catch(console.error);
  }, CHECK_INTERVAL_MS);

  console.log("[auto-sync] Worker iniciado — verificando a cada 2 min");
}
