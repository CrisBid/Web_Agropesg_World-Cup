"use client";

import { useState } from "react";

type Phase = "idle" | "restarting" | "waiting" | "done" | "error";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

export default function RestartButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);

  async function handleRestart() {
    if (phase === "restarting" || phase === "waiting") return;
    setPhase("restarting");
    setElapsed(0);

    try {
      await fetch("/api/admin/restart", { method: "POST" });
    } catch {
      // Expected: server may die before responding
    }

    // Wait a beat for the process to actually go down
    await new Promise((r) => setTimeout(r, 2000));
    setPhase("waiting");

    // Poll until server is back up
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000));
    }, 500);

    try {
      while (Date.now() - start < POLL_TIMEOUT_MS) {
        try {
          const r = await fetch("/api/admin/restart", {
            method: "POST",
            signal: AbortSignal.timeout(2000),
          }).catch(() => null);
          // If the server responds to a POST (even an error), it's back up.
          // We use a simple GET to a known-fast endpoint instead.
          void r;

          const ping = await fetch("/api/resultados", {
            signal: AbortSignal.timeout(2000),
          }).catch(() => null);

          if (ping?.ok) {
            clearInterval(timer);
            setPhase("done");
            return;
          }
        } catch {
          // still down
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      clearInterval(timer);
      setPhase("error");
    } catch {
      clearInterval(timer);
      setPhase("error");
    }
  }

  const label = {
    idle: "Reiniciar aplicação",
    restarting: "Enviando comando...",
    waiting: `Aguardando servidor... ${elapsed}s`,
    done: "Online novamente ✓",
    error: "Timeout — verifique o servidor",
  }[phase];

  const color = {
    idle: "#c9601a",
    restarting: "#888",
    waiting: "#888",
    done: "#2d6a4f",
    error: "#dc2626",
  }[phase];

  const busy = phase === "restarting" || phase === "waiting";

  return (
    <div
      className="rounded-[20px] border p-6 space-y-3"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: "rgba(201,96,26,0.10)" }}
        >
          🔄
        </div>
        <div>
          <h3 className="font-bold text-base" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Reiniciar Servidor
          </h3>
          <p className="text-xs" style={{ color: "#5a5a5a" }}>
            Reinicia o processo PM2 para limpar o estado interno do ranking ao vivo.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRestart}
          disabled={busy}
          className="text-sm font-semibold px-5 py-2 rounded-[10px] text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: busy ? "#888" : "#c9601a" }}
        >
          {busy && (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle" />
          )}
          {label}
        </button>

        {phase === "done" && (
          <button
            onClick={() => { setPhase("idle"); setElapsed(0); }}
            className="text-xs font-medium px-3 py-1.5 rounded-[8px] border transition-all"
            style={{ borderColor: "rgba(27,67,50,0.15)", color: "#5a5a5a" }}
          >
            OK
          </button>
        )}

        {phase === "error" && (
          <button
            onClick={() => { setPhase("idle"); setElapsed(0); }}
            className="text-xs font-medium px-3 py-1.5 rounded-[8px] border transition-all"
            style={{ borderColor: "rgba(220,38,38,0.2)", color: "#dc2626" }}
          >
            Fechar
          </button>
        )}
      </div>

      {phase === "waiting" && (
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(27,67,50,0.08)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              backgroundColor: "#52b788",
              width: `${Math.min(100, (elapsed / (POLL_TIMEOUT_MS / 1000)) * 100)}%`,
            }}
          />
        </div>
      )}

      {phase === "done" && (
        <p className="text-xs font-medium" style={{ color: "#2d6a4f" }}>
          Servidor reiniciado em {elapsed}s — ranking ao vivo resetado.
        </p>
      )}
    </div>
  );
}
