/**
 * Background sync worker — runs server-side, no browser needed.
 * Started once via instrumentation.ts when the Next.js server boots.
 *
 * Every CHECK_INTERVAL_MS it:
 *   1. Checks whether a game is kicking off RIGHT NOW and restarts the process
 *      via PM2 so the live-ranking state is clean from the start.
 *   2. Checks whether any game today is in the post-game window
 *      (kickoff + 115 min → kickoff + 145 min) and has no result yet.
 *      If so, syncs results from the external API.
 *
 * Restart loop prevention: we only restart for games whose kickoff is AFTER
 * PROCESS_BOOT_MS. After PM2 brings the process back up the new instance has
 * a later boot time, so the same game no longer qualifies.
 */

import { exec } from "child_process";
import { GAMES } from "./games-data";
import { getResults } from "./data";
import { syncResultsFromAPI } from "./sync-results";

// Captured once when this module is first imported (= server boot time).
const PROCESS_BOOT_MS = Date.now();

const GAME_END_BUFFER_MS  = 115 * 60_000; // assume game ends 115 min after kickoff
const SYNC_WINDOW_MS      =  30 * 60_000; // keep trying for 30 min after expected end
const CHECK_INTERVAL_MS   =   2 * 60_000; // check every 2 minutes
// Window after kickoff during which we trigger a restart.
// Must be > CHECK_INTERVAL_MS so the periodic check always catches it.
const KICKOFF_RESTART_WINDOW_MS = CHECK_INTERVAL_MS + 60_000; // 3 minutes

// ─── Kickoff restart ──────────────────────────────────────────────────────────

function checkKickoffRestart() {
  const nowMs  = Date.now();
  const nowBRT = new Date(nowMs - 3 * 3_600_000);
  const today  = nowBRT.toISOString().slice(0, 10);

  const gameStarting = GAMES.find((g) => {
    if (!g.date.startsWith(today)) return false;
    const kickoff = new Date(g.date + ":00-03:00").getTime();
    // Only games that started AFTER this process booted (prevents restart loops).
    return kickoff > PROCESS_BOOT_MS
      && nowMs >= kickoff
      && nowMs < kickoff + KICKOFF_RESTART_WINDOW_MS;
  });

  if (!gameStarting) return;

  console.log(
    `[auto-sync] Kickoff detectado: ${gameStarting.teamA} x ${gameStarting.teamB} — reiniciando processo para limpar estado do ranking ao vivo`
  );
  exec("pm2 restart web-agropesg-bolao", (err) => {
    if (err) console.error("[auto-sync] Erro ao reiniciar via PM2:", err.message);
  });
}

// ─── Result sync ──────────────────────────────────────────────────────────────

// Promise-based lock: set before the first await so the event loop cannot
// interleave a second checkAndSync() call between the guard check and the lock set.
let syncInFlight: Promise<void> | null = null;

async function checkAndSync() {
  if (syncInFlight) return;

  // Fast synchronous check — no await, so this block is atomic from the
  // event-loop's point of view. If a game is not in window we return before
  // ever touching the lock, keeping overhead near zero.
  const nowMs  = Date.now();
  const nowBRT = new Date(nowMs - 3 * 3_600_000);
  const today  = nowBRT.toISOString().slice(0, 10);

  const anyInWindow = GAMES.some((g) => {
    if (!g.date.startsWith(today)) return false;
    const kickoff     = new Date(g.date + ":00-03:00").getTime();
    const expectedEnd = kickoff + GAME_END_BUFFER_MS;
    return nowMs >= expectedEnd && nowMs < expectedEnd + SYNC_WINDOW_MS;
  });

  if (!anyInWindow) return;

  // Acquire lock BEFORE the first await so no second call can sneak in.
  syncInFlight = runSync(today, nowMs);
  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

async function runSync(today: string, nowMs: number): Promise<void> {
  try {
    // Slow path: DB read to confirm pending games still lack results
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

    console.log("[auto-sync] Jogos sem resultado detectados — sincronizando...");
    const result = await syncResultsFromAPI();
    console.log(`[auto-sync] Concluído: ${result.synced} sincronizado(s), ${result.skipped} aguardando`);
    if (result.errors.length > 0) {
      console.warn("[auto-sync] Avisos:", result.errors);
    }
  } catch (err) {
    console.error("[auto-sync] Erro ao sincronizar:", err);
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

let started = false;

export function startAutoSyncWorker() {
  if (started) return;
  started = true;

  function tick() {
    checkKickoffRestart();
    checkAndSync().catch(console.error);
  }

  // Check immediately at startup (catches server restarts during a sync window)
  tick();

  // Then check every 2 minutes
  setInterval(tick, CHECK_INTERVAL_MS);

  console.log("[auto-sync] Worker iniciado — verificando kickoffs e resultados a cada 2 min");
}
