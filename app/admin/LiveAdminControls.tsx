"use client";

import { useState, useTransition } from "react";
import type { LiveAdminSettings, GameOverrideEntry } from "@/lib/data";

interface TodayGame {
  id: number;
  teamA: string;
  teamB: string;
  time: string;
}

interface BudgetInfo {
  todayGames: number;
  reqPerGame: number;
  liveTTL: number;
  statsTTL: number;
  clientPollMs: number;
}

interface Props {
  initialSettings: LiveAdminSettings;
  initialGameOverrides: Record<number, GameOverrideEntry>;
  todayGames: TodayGame[];
  budget: BudgetInfo;
}

function fmtMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function computeStatsTTL(reqPerGame: number): number {
  const GAME_DURATION = 105 * 60_000;
  const liveReq = Math.max(4, Math.floor(reqPerGame * 0.65));
  const statsReq = Math.max(3, reqPerGame - liveReq);
  return Math.floor(GAME_DURATION / statsReq);
}

function GameRow({
  game,
  entry,
  globalReqPerGame,
  onToggle,
  onReqChange,
}: {
  game: TodayGame;
  entry: GameOverrideEntry;
  globalReqPerGame: number;
  onToggle: (enabled: boolean) => void;
  onReqChange: (req: number | null) => void;
}) {
  const [reqInput, setReqInput] = useState(entry.reqPerGame != null ? String(entry.reqPerGame) : "");
  const [pending, startTransition] = useTransition();

  const effectiveReq = entry.reqPerGame ?? globalReqPerGame;
  const statsTTL = computeStatsTTL(effectiveReq);
  const isOverriding = entry.reqPerGame != null;

  function applyReq() {
    const val = reqInput.trim();
    startTransition(() => {
      onReqChange(val === "" ? null : Math.min(92, Math.max(1, parseInt(val, 10))));
    });
  }

  return (
    <div
      className="rounded-[14px] border p-4 space-y-3"
      style={{
        borderColor: entry.liveEnabled ? "rgba(27,67,50,0.10)" : "rgba(220,38,38,0.20)",
        backgroundColor: entry.liveEnabled ? "white" : "rgba(220,38,38,0.03)",
      }}
    >
      {/* Game header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: "#1b4332" }}>
            {game.teamA} <span style={{ color: "#9a9a9a" }}>vs</span> {game.teamB}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>
            {game.time}h · jogo #{game.id}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!entry.liveEnabled && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(220,38,38,0.10)", color: "#dc2626" }}>
              desativado
            </span>
          )}
          <button
            onClick={() => onToggle(!entry.liveEnabled)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ backgroundColor: entry.liveEnabled ? "#52b788" : "#d1d5db" }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              style={{ transform: entry.liveEnabled ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
            />
          </button>
        </div>
      </div>

      {/* Per-game req override */}
      {entry.liveEnabled && (
        <div className="flex items-center justify-between gap-3 pt-2"
          style={{ borderTop: "1px solid rgba(27,67,50,0.06)" }}>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold" style={{ color: "#5a5a5a" }}>
              Requisições de stats
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "#9a9a9a" }}>
              {isOverriding
                ? `Manual: ${entry.reqPerGame} req → stats a cada ${fmtMs(statsTTL)}`
                : `Global: ${globalReqPerGame} req → stats a cada ${fmtMs(statsTTL)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min={1}
              max={92}
              value={reqInput}
              onChange={(e) => setReqInput(e.target.value)}
              placeholder="global"
              disabled={pending}
              className="w-20 rounded-[10px] border px-3 py-1.5 text-sm font-bold text-center tabular-nums outline-none"
              style={{ borderColor: isOverriding ? "#52b788" : "rgba(27,67,50,0.15)", color: "#1b4332" }}
            />
            <button
              onClick={applyReq}
              disabled={pending}
              className="rounded-[10px] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1b4332" }}
            >
              {pending ? "…" : "OK"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveAdminControls({ initialSettings, initialGameOverrides, todayGames, budget: initialBudget }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [gameOverrides, setGameOverrides] = useState<Record<number, GameOverrideEntry>>(initialGameOverrides);
  const [reqInput, setReqInput] = useState(
    initialSettings.liveMaxReqPerGame != null ? String(initialSettings.liveMaxReqPerGame) : ""
  );
  const [budget, setBudget] = useState(initialBudget);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function patchSettings(patch: Partial<LiveAdminSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);

    const res = await fetch("/api/admin/live-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      const budgetRes = await fetch("/api/live", { cache: "no-store" });
      if (budgetRes.ok) {
        const data = await budgetRes.json();
        if (data.budget) setBudget(data.budget);
      }
      setFeedback("Salvo");
    } else {
      setFeedback("Erro ao salvar");
    }
    setTimeout(() => setFeedback(null), 2000);
  }

  function handleGlobalReqOverride() {
    const val = reqInput.trim();
    startTransition(async () => {
      await patchSettings({ liveMaxReqPerGame: val === "" ? null : Math.max(1, Math.min(92, parseInt(val, 10))) });
    });
  }

  async function patchGameOverride(gameId: number, patch: Partial<GameOverrideEntry>) {
    setGameOverrides((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId] ?? { liveEnabled: true, reqPerGame: null }, ...patch },
    }));
    await fetch("/api/admin/live-game-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, ...patch }),
    });
    setFeedback("Salvo");
    setTimeout(() => setFeedback(null), 2000);
  }

  const isAutoReq = settings.liveMaxReqPerGame == null;

  return (
    <div className="rounded-[20px] border p-6 space-y-6"
      style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: "rgba(82,183,136,0.15)", color: "#1b4332" }}>📡</span>
          <h2 className="font-bold text-lg" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Controle de Requisições Ao Vivo
          </h2>
        </div>
        {feedback && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
            {feedback}
          </span>
        )}
      </div>

      {/* Budget info */}
      <div className="rounded-[14px] p-4 space-y-3"
        style={{ backgroundColor: "rgba(27,67,50,0.03)", border: "1px solid rgba(27,67,50,0.08)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
          Orçamento global (100 req/dia)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Jogos hoje", value: String(budget.todayGames) },
            { label: "Req / jogo (global)", value: `${budget.reqPerGame}${isAutoReq ? " (auto)" : " (manual)"}` },
            { label: "Intervalo live", value: fmtMs(budget.liveTTL) },
            { label: "Intervalo stats (global)", value: fmtMs(budget.statsTTL) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[10px] p-3" style={{ backgroundColor: "white", border: "1px solid rgba(27,67,50,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a9a9a" }}>{label}</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: "#1b4332" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Global toggles */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
          Configurações globais
        </p>

        {/* Stats toggle */}
        <div className="flex items-center justify-between rounded-[14px] border px-4 py-3"
          style={{ borderColor: "rgba(27,67,50,0.08)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1b4332" }}>
              Estatísticas do jogo
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
              Posse de bola, chutes, etc. — usa ~35% do orçamento
            </p>
          </div>
          <button
            onClick={() => startTransition(() => patchSettings({ liveStatsEnabled: !settings.liveStatsEnabled }))}
            disabled={isPending}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
            style={{ backgroundColor: settings.liveStatsEnabled ? "#52b788" : "#d1d5db" }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              style={{ transform: settings.liveStatsEnabled ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
            />
          </button>
        </div>

        {/* Global req/game override */}
        <div className="flex items-center justify-between gap-4 rounded-[14px] border px-4 py-3"
          style={{ borderColor: "rgba(27,67,50,0.08)" }}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "#1b4332" }}>
              Req / jogo (padrão global)
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
              Deixe vazio para automático ({initialBudget.reqPerGame} hoje). Jogos com override próprio ignoram este valor.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min={1}
              max={92}
              value={reqInput}
              onChange={(e) => setReqInput(e.target.value)}
              placeholder="auto"
              className="w-20 rounded-[10px] border px-3 py-1.5 text-sm font-bold text-center tabular-nums outline-none"
              style={{
                borderColor: isAutoReq ? "rgba(27,67,50,0.15)" : "#52b788",
                color: "#1b4332",
              }}
            />
            <button
              onClick={handleGlobalReqOverride}
              disabled={isPending}
              className="rounded-[10px] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1b4332" }}
            >
              {isPending ? "…" : "Aplicar"}
            </button>
          </div>
        </div>
      </div>

      {/* Per-game overrides */}
      {todayGames.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9a9a9a" }}>
            Jogos de hoje · configuração individual
          </p>
          <div className="space-y-2">
            {todayGames.map((g) => (
              <GameRow
                key={g.id}
                game={g}
                entry={gameOverrides[g.id] ?? { liveEnabled: true, reqPerGame: null }}
                globalReqPerGame={budget.reqPerGame}
                onToggle={(enabled) => patchGameOverride(g.id, { liveEnabled: enabled })}
                onReqChange={(req) => patchGameOverride(g.id, { reqPerGame: req })}
              />
            ))}
          </div>
          <p className="text-[10px]" style={{ color: "#9a9a9a" }}>
            O campo "req / stats" controla quantas vezes as estatísticas do jogo (posse, chutes…) são atualizadas durante a partida. Deixe em branco para usar o valor global.
          </p>
        </div>
      )}

      {todayGames.length === 0 && (
        <p className="text-sm text-center py-2" style={{ color: "#9a9a9a" }}>
          Nenhum jogo programado para hoje.
        </p>
      )}
    </div>
  );
}
