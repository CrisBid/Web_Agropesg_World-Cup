"use client";

import { useState } from "react";

interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  lastSync: string;
}

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao sincronizar");
      } else {
        setResult(data as SyncResult);
      }
    } catch {
      setError("Falha de conexão com o servidor");
    } finally {
      setLoading(false);
    }
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
          onClick={handleSync}
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
