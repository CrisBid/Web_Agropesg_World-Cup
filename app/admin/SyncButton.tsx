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

interface Props {
  pendingGames?: PendingGame[];
}

const RETRY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between retries
const MAX_RETRY_MS      = 30 * 60 * 1000; // give up after 30 minutes

export default function SyncButton({ pendingGames = [] }: Props) {
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<SyncResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Auto-sync state
  const [autoActive, setAutoActive]   = useState(false);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const [autoCountdown, setAutoCountdown] = useState(0); // seconds until next attempt
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

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

  function clearTimers() {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    countdownRef.current = null;
  }

  function startCountdown(durationMs: number) {
    clearTimers();
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

  async function autoSync() {
    if (Date.now() - startedAtRef.current > MAX_RETRY_MS) {
      setAutoActive(false);
      setAutoAttempts(0);
      setAutoCountdown(0);
      return;
    }

    setAutoAttempts((n) => n + 1);
    const gotResult = await doSync(true);

    if (gotResult) {
      // Result arrived — reload page so server re-renders with updated data
      window.location.reload();
      return;
    }

    // Not yet — schedule next attempt
    startCountdown(RETRY_INTERVAL_MS);
    timerRef.current = setTimeout(autoSync, RETRY_INTERVAL_MS);
  }

  // Start auto-sync when component mounts with pending games
  useEffect(() => {
    if (pendingGames.length === 0) return;
    setAutoActive(true);
    setAutoAttempts(0);
    startedAtRef.current = Date.now();
    autoSync();
    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualSync() {
    clearTimers();
    setAutoActive(false);
    setAutoCountdown(0);
    await doSync(false);
  }

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
      {autoActive && pendingGames.length > 0 && (
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
            {pendingGames.map((g) => (
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
