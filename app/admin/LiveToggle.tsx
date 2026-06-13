"use client";

import { useState } from "react";

interface Props {
  initialEnabled: boolean;
}

export default function LiveToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/live-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        setFeedback(data.enabled ? "Placar ao vivo ativado." : "Placar ao vivo desativado. Requisições suspensas.");
      } else {
        setFeedback("Erro ao atualizar configuração.");
      }
    } catch {
      setFeedback("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-[20px] border p-6 space-y-4"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-lg" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Placar Ao Vivo
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#5a5a5a" }}>
            {enabled
              ? "Habilitado — o site consulta a API de placares em tempo real."
              : "Desabilitado — nenhuma requisição ao vivo está sendo feita."}
          </p>
        </div>

        <button
          onClick={toggle}
          disabled={loading}
          className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            enabled
              ? { backgroundColor: "rgba(220,38,38,0.10)", color: "#dc2626" }
              : { backgroundColor: "rgba(82,183,136,0.15)", color: "#1b4332" }
          }
        >
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <span
              className="inline-block w-9 h-5 rounded-full transition-colors relative"
              style={{ backgroundColor: enabled ? "#dc2626" : "rgba(27,67,50,0.15)" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                style={{ left: enabled ? "calc(100% - 1.125rem)" : "0.125rem" }}
              />
            </span>
          )}
          {enabled ? "Desativar" : "Ativar"}
        </button>
      </div>

      {feedback && (
        <div
          className="rounded-[12px] px-4 py-3 text-sm"
          style={
            enabled
              ? { backgroundColor: "rgba(82,183,136,0.08)", borderLeft: "3px solid #52b788", color: "#1b4332" }
              : { backgroundColor: "rgba(201,168,76,0.08)", borderLeft: "3px solid #c9a84c", color: "#5a5a5a" }
          }
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
