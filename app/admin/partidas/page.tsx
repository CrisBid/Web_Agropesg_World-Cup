"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GAMES, PHASE_LABELS, ALL_TEAMS } from "@/lib/games-data";
import type { Phase, Game } from "@/lib/games-data";

interface ScheduleOverride {
  date: string | null;
  stadium: string | null;
  teamA: string | null;
  teamB: string | null;
}

type Overrides = Record<number, ScheduleOverride>;

interface EditState {
  date: string;
  stadium: string;
  teamA: string;
  teamB: string;
}

const PHASES_ORDER: Phase[] = ["grupos", "fase32", "oitavas", "quartas", "semis", "terceiro", "final"];

const inputBase =
  "w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors";
const inputStyle = {
  backgroundColor: "#f7f5ef",
  borderColor: "rgba(27,67,50,0.15)",
  color: "#1a1a1a",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(iso: string) {
  // Convert "2026-06-11T16:00" to the format datetime-local needs
  return iso.slice(0, 16);
}

function effectiveGame(game: Game, overrides: Overrides): Game {
  const ov = overrides[game.id];
  if (!ov) return game;
  return {
    ...game,
    date: ov.date ?? game.date,
    stadium: ov.stadium ?? game.stadium,
    teamA: ov.teamA ?? game.teamA,
    teamB: ov.teamB ?? game.teamB,
  };
}

export default function PartidasPage() {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<Phase | "todos">("todos");

  useEffect(() => {
    fetch("/api/admin/partidas")
      .then((r) => r.json())
      .then(setOverrides);
  }, []);

  function startEdit(game: Game) {
    const eff = effectiveGame(game, overrides);
    setEditingId(game.id);
    setEditState({
      date: toLocalInputValue(eff.date),
      stadium: eff.stadium,
      teamA: eff.teamA,
      teamB: eff.teamB,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
    setSaveMsg("");
  }

  const saveEdit = useCallback(
    async (gameId: number) => {
      if (!editState) return;
      setSaving(true);
      const game = GAMES.find((g) => g.id === gameId)!;
      const payload: Record<string, unknown> = { gameId };

      payload.date = editState.date || null;
      payload.stadium = editState.stadium || null;
      payload.teamA = editState.teamA || null;
      payload.teamB = editState.teamB || null;

      await fetch("/api/admin/partidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setOverrides((prev) => ({
        ...prev,
        [gameId]: {
          date: editState.date !== toLocalInputValue(game.date) ? editState.date : null,
          stadium: editState.stadium !== game.stadium ? editState.stadium : null,
          teamA: editState.teamA !== game.teamA ? editState.teamA : null,
          teamB: editState.teamB !== game.teamB ? editState.teamB : null,
        },
      }));

      setSaving(false);
      setSaveMsg("Salvo ✓");
      setTimeout(() => {
        setSaveMsg("");
        setEditingId(null);
        setEditState(null);
      }, 1200);
    },
    [editState]
  );

  const resetGame = useCallback(async (gameId: number) => {
    await fetch("/api/admin/partidas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, reset: true }),
    });
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
    setEditingId(null);
    setEditState(null);
  }, []);

  const filteredGames = GAMES.filter((g) => {
    if (phaseFilter !== "todos" && g.phase !== phaseFilter) return false;
    if (!search.trim()) return true;
    const eff = effectiveGame(g, overrides);
    const q = search.toLowerCase();
    return (
      eff.teamA.toLowerCase().includes(q) ||
      eff.teamB.toLowerCase().includes(q) ||
      eff.stadium.toLowerCase().includes(q) ||
      String(g.num).includes(q)
    );
  });

  const isGroupPhase = (phase: Phase) => phase === "grupos";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-1"
            style={{ color: "#52b788" }}
          >
            Admin
          </p>
          <h1
            className="text-3xl font-black"
            style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}
          >
            Partidas
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5a5a5a" }}>
            Edite horário, estádio ou times de qualquer partida.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium px-4 py-2 rounded-[10px] border transition-all hover:shadow-sm"
          style={{
            borderColor: "rgba(27,67,50,0.15)",
            color: "#1b4332",
            backgroundColor: "white",
          }}
        >
          ← Voltar
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar time, estádio ou nº..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputBase}
          style={{ ...inputStyle, maxWidth: 260 }}
        />
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value as Phase | "todos")}
          className={inputBase}
          style={{ ...inputStyle, maxWidth: 200 }}
        >
          <option value="todos">Todas as fases</option>
          {PHASES_ORDER.map((ph) => (
            <option key={ph} value={ph}>
              {PHASE_LABELS[ph]}
            </option>
          ))}
        </select>
        <span className="text-sm self-center" style={{ color: "#5a5a5a" }}>
          {filteredGames.length} partida{filteredGames.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Game list */}
      <div className="space-y-3">
        {filteredGames.map((game) => {
          const eff = effectiveGame(game, overrides);
          const hasOverride = !!overrides[game.id];
          const isEditing = editingId === game.id;

          return (
            <div
              key={game.id}
              className="rounded-[16px] border transition-all"
              style={{
                backgroundColor: "white",
                borderColor: hasOverride
                  ? "rgba(201,168,76,0.4)"
                  : "rgba(27,67,50,0.08)",
              }}
            >
              {/* Game header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                {/* Game number badge */}
                <div
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "#1b433210", color: "#1b4332" }}
                >
                  {game.num}
                </div>

                {/* Teams and info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: "#1b4332" }}>
                      {eff.teamA}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#5a5a5a" }}>
                      vs
                    </span>
                    <span className="font-bold text-sm" style={{ color: "#1b4332" }}>
                      {eff.teamB}
                    </span>
                    {game.group && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#52b78818", color: "#2d6a4f" }}
                      >
                        Grupo {game.group}
                      </span>
                    )}
                    {!game.group && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#c9a84c18", color: "#8a6d1a" }}
                      >
                        {PHASE_LABELS[game.phase]}
                      </span>
                    )}
                    {hasOverride && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#c9a84c30", color: "#8a6d1a" }}
                      >
                        editado
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "#5a5a5a" }}>
                    {formatDateTime(eff.date)} · {eff.stadium}
                  </div>
                </div>

                {/* Edit button */}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(game)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-[8px] border transition-all hover:shadow-sm"
                    style={{
                      borderColor: "rgba(27,67,50,0.15)",
                      color: "#1b4332",
                      backgroundColor: "#f7f5ef",
                    }}
                  >
                    Editar
                  </button>
                )}
              </div>

              {/* Edit form */}
              {isEditing && editState && (
                <div
                  className="border-t px-5 py-4 space-y-4"
                  style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "#f7f5ef" }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Date/time */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1b4332" }}>
                        Data e Horário
                      </label>
                      <input
                        type="datetime-local"
                        value={editState.date}
                        onChange={(e) =>
                          setEditState((s) => s && { ...s, date: e.target.value })
                        }
                        className={inputBase}
                        style={inputStyle}
                      />
                    </div>

                    {/* Stadium */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1b4332" }}>
                        Estádio
                      </label>
                      <input
                        type="text"
                        value={editState.stadium}
                        onChange={(e) =>
                          setEditState((s) => s && { ...s, stadium: e.target.value })
                        }
                        placeholder="Nome do estádio"
                        className={inputBase}
                        style={inputStyle}
                      />
                    </div>

                    {/* Team A */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1b4332" }}>
                        Time A
                      </label>
                      {isGroupPhase(game.phase) ? (
                        <select
                          value={editState.teamA}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, teamA: e.target.value })
                          }
                          className={inputBase}
                          style={inputStyle}
                        >
                          {ALL_TEAMS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editState.teamA}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, teamA: e.target.value })
                          }
                          placeholder="Time A"
                          className={inputBase}
                          style={inputStyle}
                        />
                      )}
                    </div>

                    {/* Team B */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1b4332" }}>
                        Time B
                      </label>
                      {isGroupPhase(game.phase) ? (
                        <select
                          value={editState.teamB}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, teamB: e.target.value })
                          }
                          className={inputBase}
                          style={inputStyle}
                        >
                          {ALL_TEAMS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editState.teamB}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, teamB: e.target.value })
                          }
                          placeholder="Time B"
                          className={inputBase}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => saveEdit(game.id)}
                      disabled={saving}
                      className="text-sm font-semibold px-5 py-2 rounded-[10px] text-white transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: "#1b4332" }}
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-sm font-medium px-5 py-2 rounded-[10px] border transition-all"
                      style={{
                        borderColor: "rgba(27,67,50,0.15)",
                        color: "#5a5a5a",
                        backgroundColor: "white",
                      }}
                    >
                      Cancelar
                    </button>
                    {hasOverride && (
                      <button
                        onClick={() => resetGame(game.id)}
                        className="text-sm font-medium px-4 py-2 rounded-[10px] border transition-all ml-auto"
                        style={{
                          borderColor: "rgba(220,38,38,0.2)",
                          color: "#dc2626",
                          backgroundColor: "#fef2f2",
                        }}
                      >
                        Restaurar original
                      </button>
                    )}
                    {saveMsg && (
                      <span className="text-sm font-semibold" style={{ color: "#2d6a4f" }}>
                        {saveMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
