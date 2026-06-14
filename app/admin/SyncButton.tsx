"use client";

import { useState, useEffect, useRef } from "react";

interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  lastSync: string;
}

export interface PendingGame {
  id: number;
  teamA: string;
  teamB: string;
  time: string;
}

// Extended game info used for client-side window detection
export interface WatchGame {
  id: number;
  teamA: string;
  teamB: string;
  time: string;
  kickoffMs: number;
  hasResult: boolean; // true at server render time; page reloads after sync
}

interface Props {
  pendingGames?: PendingGame[];  // pre-computed by server at page load
  watchGames?: WatchGame[];      // all today's games — used for client-side detection
}

const RETRY_INTERVAL_MS = 2 * 60 * 1000;  // 2 min between attempts
const MAX_RETRY_MS      = 30 * 60 * 1000; // give up after 30 min
const GAME_END_BUFFER_MS = 115 * 60 * 1000; // kickoff + 115 min = expected end

function pendingNow(watchGames: WatchGame[]): WatchGame[] {
  const now = Date.now();
  return watchGames.filter((g) => {
    const expectedEnd = g.kickoffMs + GAME_END_BUFFER_MS;
    return !g.hasResult && now >= expectedEnd && now < expectedEnd + MAX_RETRY_MS;
  });
}

export default function SyncButton({ pendingGames = [], watchGames = [] }: Props) {
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<SyncResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const [autoActive, setAutoActive]     = useState(false);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const [autoCountdown, setAutoCountdown] = useState(0);
  // The games currently being watched by the running auto-sync
  const [activePending, setActivePending] = useState<PendingGame[]>([]);

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectorRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef  = useRef<number>(0);
  const autoActiveRef = useRef(false); // mirror of autoActive usable inside callbacks

  // ─── Sync call ───────────────────────────────────────────────────────────

  async function doSync(isAuto = false): Promise<boolean> {
    setLoading(true);
    if (!isAuto) { setResult(null); setError(null); }
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao sincronizar");
        return false;
      }
      setResult(data as SyncResult);
      setError(null);
      return (data as SyncResult).synced > 0;
    } catch {
      setError("Falha de conexão com o servidor");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ─── Timer helpers ────────────────────────────────────────────────────────

  function clearSyncTimers() {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    countdownRef.current = null;
  }

  function startCountdown(durationMs: number) {
    clearSyncTimers();
    let remaining = Math.round(durationMs / 1000);
    setAutoCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setAutoCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
      }
    }, 1000);
  }

  // ─── Auto-sync loop ───────────────────────────────────────────────────────

  async function autoSync() {
    if (Date.now() - startedAtRef.current > MAX_RETRY_MS) {
      setAutoActive(false);
      autoActiveRef.current = false;
      setAutoAttempts(0);
      setAutoCountdown(0);
      setActivePending([]);
      return;
    }

    setAutoAttempts((n) => n + 1);
    const gotResult = await doSync(true);

    if (gotResult) {
      window.location.reload();
      return;
    }

    startCountdown(RETRY_INTERVAL_MS);
    timerRef.current = setTimeout(autoSync, RETRY_INTERVAL_MS);
  }

  function startAutoSync(games: PendingGame[]) {
    clearSyncTimers();
    setAutoActive(true);
    autoActiveRef.current = true;
    setAutoAttempts(0);
    setActivePending(games);
    startedAtRef.current = Date.now();
    autoSync();
  }

  // ─── Boot: server-detected pending games (page loaded after game ended) ──

  useEffect(() => {
    if (pendingGames.length > 0) {
      startAutoSync(pendingGames);
    }
    return () => {
      clearSyncTimers();
      if (detectorRef.current) clearInterval(detectorRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Client-side detector: fires every 60 s to catch games that end while
  //     the page is already open (pendingGames was empty at server render) ───

  useEffect(() => {
    if (watchGames.length === 0) return;

    function check() {
      if (autoActiveRef.current) return; // already running
      const now = pendingNow(watchGames);
      if (now.length > 0) {
        startAutoSync(now.map((g) => ({ id: g.id, teamA: g.teamA, teamB: g.teamB, time: g.time })));
      }
    }

    // Check immediately (catches page loads right at the boundary)
    check();
    detectorRef.current = setInterval(check, 60_000);
    return () => {
      if (detectorRef.current) clearInterval(detectorRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Manual sync ─────────────────────────────────────────────────────────

  async function handleManualSync() {
    clearSyncTimers();
    setAutoActive(false);
    autoActiveRef.current = false;
    setAutoCountdown(0);
    setActivePending([]);
    await doSync(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="rounded-[20px] border p-6 space-y-4"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-lg" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Sincronizar Resultados
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#5a5a5a" }}>
            Importa os placares da Copa 2026 via football-data.org automaticamente.
          </p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={loading}
          className="shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: "#1b4332", color: "white" }}
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sincronizando…
            </>
          ) : (
            <>⟳ Sincronizar agora</>
          )}
        </button>
      </div>

      {/* Auto-sync status banner */}
      {autoActive && activePending.length > 0 && (
        <div className="rounded-[14px] px-4 py-3 space-y-2"
          style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
              <p className="text-sm font-semibold" style={{ color: "#8b7028" }}>
                Aguardando resultado automático
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded-[8px]"
              style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#8b7028" }}>
              {autoAttempts > 0 && autoCountdown > 0
                ? `próxima tentativa em ${autoCountdown}s`
                : loading ? "sincronizando…" : "iniciando…"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activePending.map((g) => (
              <span key={g.id}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: "rgba(201,168,76,0.12)", color: "#8b7028" }}>
                {g.teamA} × {g.teamB} ({g.time}h)
              </span>
            ))}
          </div>

          <p className="text-[11px]" style={{ color: "#a16207" }}>
            Tentativa {autoAttempts} · sincronizando a cada 2 min até o resultado aparecer na API
            {autoAttempts > 0 && ` (timeout em ${Math.max(0, Math.round((MAX_RETRY_MS - (Date.now() - startedAtRef.current)) / 60000))} min)`}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-[12px] px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(220,38,38,0.07)", color: "#dc2626" }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="rounded-[12px] px-4 py-3 space-y-1.5 text-sm"
          style={{ backgroundColor: "rgba(82,183,136,0.08)", borderLeft: "3px solid #52b788" }}>
          <p className="font-semibold" style={{ color: "#1b4332" }}>
            ✓ Sincronização concluída
          </p>
          <p style={{ color: "#5a5a5a" }}>
            <span className="font-medium" style={{ color: "#1b4332" }}>{result.synced}</span> jogo{result.synced !== 1 ? "s" : ""} atualizados
            · <span className="font-medium" style={{ color: "#5a5a5a" }}>{result.skipped}</span> aguardando resultado
          </p>
          {result.errors.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs" style={{ color: "#c9a84c" }}>
                {result.errors.length} aviso{result.errors.length !== 1 ? "s" : ""}
              </summary>
              <ul className="mt-1 space-y-0.5 text-xs pl-3" style={{ color: "#5a5a5a" }}>
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </details>
          )}
          <p className="text-xs" style={{ color: "#9a9a9a" }}>
            {new Date(result.lastSync).toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
