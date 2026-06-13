"use client";

import { useState, useTransition } from "react";
import type { LiveBannerTestMode } from "@/lib/data";

interface Props {
  initialMode: LiveBannerTestMode;
}

const MODES: { value: LiveBannerTestMode; label: string; desc: string; color: string; bg: string }[] = [
  {
    value: null,
    label: "Normal",
    desc: "Sem banner de teste — comportamento real",
    color: "#5a5a5a",
    bg: "rgba(27,67,50,0.06)",
  },
  {
    value: "pre",
    label: "Pré-jogo",
    desc: "Jogo começa em 20 min com contagem regressiva",
    color: "#a16207",
    bg: "rgba(201,168,76,0.15)",
  },
  {
    value: "live",
    label: "Ao vivo",
    desc: "Partida fictícia em andamento (2-1, 67') com stats e ranking",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.10)",
  },
  {
    value: "post",
    label: "Pós-jogo",
    desc: "Resultado final congelado por 30 min com ranking final",
    color: "#1b4332",
    bg: "rgba(82,183,136,0.12)",
  },
];

export default function LiveBannerTest({ initialMode }: Props) {
  const [mode, setMode] = useState<LiveBannerTestMode>(initialMode);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function applyMode(next: LiveBannerTestMode) {
    setMode(next);
    startTransition(async () => {
      const res = await fetch("/api/admin/live-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveBannerTestMode: next }),
      });
      if (res.ok) {
        setFeedback(next === null ? "Modo teste desativado" : `Modo "${next}" ativado`);
      } else {
        setFeedback("Erro ao salvar");
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];

  return (
    <div className="rounded-[20px] border p-6 space-y-5"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#a16207" }}>🧪</span>
          <div>
            <h2 className="font-bold text-lg leading-tight" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
              Teste do Banner Ao Vivo
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
              Ativa um banner fictício para visualizar cada estado da tela
            </p>
          </div>
        </div>
        {feedback && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
            {feedback}
          </span>
        )}
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={String(m.value)}
              onClick={() => applyMode(m.value)}
              disabled={isPending}
              className="flex flex-col items-start gap-1.5 rounded-[14px] border px-4 py-3 text-left transition-all hover:shadow-sm disabled:opacity-50"
              style={{
                backgroundColor: active ? m.bg : "white",
                borderColor: active ? m.color : "rgba(27,67,50,0.10)",
                borderWidth: active ? "2px" : "1px",
              }}
            >
              <span className="text-sm font-bold" style={{ color: active ? m.color : "#1b4332" }}>
                {active && "✓ "}{m.label}
              </span>
              <span className="text-[10px] leading-snug" style={{ color: "#9a9a9a" }}>
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status note */}
      {mode !== null && (
        <div className="rounded-[12px] px-4 py-3 text-sm"
          style={{ backgroundColor: activeMode.bg, border: `1px solid ${activeMode.color}30` }}>
          <p className="font-semibold" style={{ color: activeMode.color }}>
            Modo <strong>{activeMode.label}</strong> ativo em todo o site
          </p>
          <p className="text-xs mt-1" style={{ color: "#5a5a5a" }}>
            O banner aparece no topo de todas as páginas. Usuários reais também verão o banner de teste
            enquanto este modo estiver ativo. Desative ao terminar.
          </p>
        </div>
      )}
    </div>
  );
}
