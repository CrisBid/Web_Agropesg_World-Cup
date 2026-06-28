"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GAMES, GROUPS, ALL_TEAMS, PHASE_LABELS } from "@/lib/games-data";
import type { Phase, Game } from "@/lib/games-data";

type GroupResult = { scoreA: number | ""; scoreB: number | "" };
type KnockoutResult = { winner: string; scoreA: number | ""; scoreB: number | "" };

interface ResultsState {
  groups: Record<number, GroupResult>;
  knockout: Record<number, KnockoutResult>;
  knockoutTeams: Record<number, { teamA: string; teamB: string }>;
  champion: string;
  thirdPlace: string;
}

const GROUP_GAMES = GAMES.filter((g) => g.phase === "grupos");
const KNOCKOUT_GAMES = GAMES.filter((g) => g.phase !== "grupos");
const PHASES_ORDER: Phase[] = ["fase32", "oitavas", "quartas", "semis", "terceiro", "final"];

const inputBase = "rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors";
const inputStyle = { backgroundColor: "#f7f5ef", borderColor: "rgba(27,67,50,0.15)", color: "#1a1a1a" };
const scoreInput = "w-12 text-center rounded-[8px] border py-1.5 text-sm outline-none transition-colors font-mono";

export default function ResultadosPage() {
  const [results, setResults] = useState<ResultsState>({
    groups: {}, knockout: {}, knockoutTeams: {}, champion: "", thirdPlace: "",
  });
  const [activeTab, setActiveTab] = useState<"grupos" | Phase>("grupos");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [populatingFase32, setPopulatingFase32] = useState(false);
  const [fase32Msg, setFase32Msg] = useState("");

  useEffect(() => {
    fetch("/api/resultados").then((r) => r.json()).then((data) => {
      setResults({
        groups: data.groups ?? {},
        knockout: data.knockout ?? {},
        knockoutTeams: data.knockoutTeams ?? {},
        champion: data.champion ?? "",
        thirdPlace: data.thirdPlace ?? "",
      });
    });
  }, []);

  const populateFase32 = useCallback(async () => {
    setPopulatingFase32(true);
    setFase32Msg("");
    try {
      const res = await fetch("/api/admin/populate-fase32", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        // Merge computed bracket into local state so the form reflects it immediately
        setResults((prev) => ({
          ...prev,
          knockoutTeams: {
            ...prev.knockoutTeams,
            ...Object.fromEntries(
              Object.entries(json.bracket as Record<string, { teamA: string; teamB: string }>).map(
                ([id, t]) => [id, t]
              )
            ),
          },
        }));
        setFase32Msg("Chaveamento montado ✓");
      } else {
        setFase32Msg("Erro ao montar chaveamento");
      }
    } catch {
      setFase32Msg("Erro de conexão");
    }
    setPopulatingFase32(false);
    setTimeout(() => setFase32Msg(""), 4000);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const payload = {
      groups: Object.fromEntries(
        Object.entries(results.groups)
          .filter(([, v]) => v.scoreA !== "" && v.scoreB !== "")
          .map(([k, v]) => [k, { scoreA: Number(v.scoreA), scoreB: Number(v.scoreB) }])
      ),
      knockout: Object.fromEntries(
        Object.entries(results.knockout)
          .filter(([, v]) => v.winner)
          .map(([k, v]) => [k, { winner: v.winner, scoreA: v.scoreA !== "" ? Number(v.scoreA) : undefined, scoreB: v.scoreB !== "" ? Number(v.scoreB) : undefined }])
      ),
      knockoutTeams: results.knockoutTeams,
      champion: results.champion || null,
      thirdPlace: results.thirdPlace || null,
    };
    await fetch("/api/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaveMsg("Salvo ✓");
    setTimeout(() => setSaveMsg(""), 2500);
  }, [results]);

  const groupsByGroup = GROUP_GAMES.reduce<Record<string, Game[]>>((acc, g) => {
    const gr = g.group!;
    if (!acc[gr]) acc[gr] = [];
    acc[gr].push(g);
    return acc;
  }, {});

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const tabs: { key: "grupos" | Phase; label: string }[] = [
    { key: "grupos", label: "Grupos" },
    ...PHASES_ORDER.map((ph) => ({ key: ph, label: PHASE_LABELS[ph] })),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
            Admin
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Resultados
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5a5a5a" }}>
            Insira os placares reais dos jogos para calcular a pontuação.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-sm font-semibold" style={{ color: "#2d6a4f" }}>{saveMsg}</span>}
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50"
            style={{ backgroundColor: "#1b4332" }}>
            {saving ? "Salvando..." : "💾 Salvar tudo"}
          </button>
          <Link href="/admin" className="text-sm transition-colors hover:opacity-70" style={{ color: "#2d6a4f" }}>
            ← Admin
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={activeTab === key
              ? { backgroundColor: "#1b4332", color: "white" }
              : { backgroundColor: "white", color: "#5a5a5a", border: "1px solid rgba(27,67,50,0.12)" }}>
            {label}
          </button>
        ))}
      </div>

      {/* GROUP STAGE */}
      {activeTab === "grupos" && (
        <div className="space-y-5">
          {Object.entries(groupsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, games]) => (
            <div key={group} className="rounded-[20px] border overflow-hidden"
              style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
              <div className="px-5 py-3 text-sm font-bold"
                style={{ backgroundColor: "rgba(27,67,50,0.04)", borderBottom: "1px solid rgba(27,67,50,0.06)", color: "#1b4332" }}>
                Grupo {group} · {GROUPS[group]?.join("  ·  ")}
              </div>
              <div>
                {games.map((game, gi) => {
                  const r = results.groups[game.id] ?? { scoreA: "", scoreB: "" };
                  return (
                    <div key={game.id}
                      style={{ borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.05)" : "none" }}
                      className="px-5 py-3 flex items-center gap-3 flex-wrap">
                      <span className="text-xs w-6 text-right shrink-0" style={{ color: "#5a5a5a" }}>
                        {game.num}
                      </span>
                      <span className="text-xs hidden sm:block w-28 shrink-0" style={{ color: "#5a5a5a" }}>
                        {formatDate(game.date)}
                      </span>
                      <span className="flex-1 text-right text-sm font-semibold" style={{ color: "#1b4332" }}>
                        {game.teamA}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input type="number" min={0} max={99} value={r.scoreA}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0);
                            setResults((p) => ({ ...p, groups: { ...p.groups, [game.id]: { ...p.groups[game.id], scoreA: val } } }));
                          }}
                          className={scoreInput} style={inputStyle} placeholder="—"
                        />
                        <span className="text-xs font-bold" style={{ color: "#5a5a5a" }}>×</span>
                        <input type="number" min={0} max={99} value={r.scoreB}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0);
                            setResults((p) => ({ ...p, groups: { ...p.groups, [game.id]: { ...p.groups[game.id], scoreB: val } } }));
                          }}
                          className={scoreInput} style={inputStyle} placeholder="—"
                        />
                      </div>
                      <span className="flex-1 text-sm font-semibold" style={{ color: "#1b4332" }}>
                        {game.teamB}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KNOCKOUT */}
      {PHASES_ORDER.includes(activeTab as Phase) && (
        <div className="space-y-4">
          {activeTab === "fase32" && (
            <div className="rounded-[16px] border px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
              style={{ backgroundColor: "rgba(82,183,136,0.06)", borderColor: "rgba(82,183,136,0.25)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1b4332" }}>
                  Montar chaveamento automaticamente
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
                  Calcula 1º/2º de cada grupo e os 8 melhores 3ºs classificados (Anexo C da FIFA) a partir dos resultados da fase de grupos.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {fase32Msg && (
                  <span className="text-sm font-semibold" style={{ color: "#2d6a4f" }}>{fase32Msg}</span>
                )}
                <button
                  onClick={populateFase32}
                  disabled={populatingFase32}
                  className="px-5 py-2 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#2d6a4f" }}>
                  {populatingFase32 ? "Calculando..." : "⚡ Auto-montar"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "final" && (
            <div className="rounded-[16px] border p-5"
              style={{ backgroundColor: "rgba(201,168,76,0.06)", borderColor: "rgba(201,168,76,0.30)" }}>
              <p className="text-sm font-semibold" style={{ color: "#8b7028" }}>
                🏆 Bônus: acertar o campeão vale 15 pts · acertar o 3º colocado vale 10 pts
              </p>
            </div>
          )}

          {KNOCKOUT_GAMES.filter((g) => g.phase === activeTab).map((game) => {
            const r = results.knockout[game.id] ?? { winner: "", scoreA: "", scoreB: "" };
            const custom = results.knockoutTeams[game.id];
            const teamA = custom?.teamA || game.teamA;
            const teamB = custom?.teamB || game.teamB;

            return (
              <div key={game.id} className="rounded-[20px] border p-6 space-y-4"
                style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "#5a5a5a" }}>
                    Jogo #{game.num} · {formatDate(game.date)}
                  </span>
                  <span className="text-xs" style={{ color: "#5a5a5a" }}>{game.stadium}</span>
                </div>

                {/* Team inputs */}
                <div className="grid grid-cols-2 gap-3">
                  {(["teamA", "teamB"] as const).map((field, fi) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>
                        Time {fi === 0 ? "A" : "B"}
                      </label>
                      <input list={`teams-${game.id}-${field}`}
                        value={(field === "teamA" ? teamA : teamB) === "TBD" ? "" : (field === "teamA" ? teamA : teamB)}
                        onChange={(e) => {
                          setResults((p) => ({
                            ...p,
                            knockoutTeams: {
                              ...p.knockoutTeams,
                              [game.id]: { ...p.knockoutTeams[game.id], [field]: e.target.value },
                            },
                          }));
                        }}
                        placeholder="Time (TBD)"
                        className={`w-full ${inputBase}`} style={inputStyle}
                      />
                      <datalist id={`teams-${game.id}-${field}`}>
                        {ALL_TEAMS.map((t) => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  ))}
                </div>

                {/* Score & winner */}
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>Placar</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={0} value={r.scoreA}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0);
                          setResults((p) => ({ ...p, knockout: { ...p.knockout, [game.id]: { ...p.knockout[game.id], scoreA: val } } }));
                        }}
                        className={scoreInput} style={inputStyle} placeholder="0"
                      />
                      <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>×</span>
                      <input type="number" min={0} value={r.scoreB}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0);
                          setResults((p) => ({ ...p, knockout: { ...p.knockout, [game.id]: { ...p.knockout[game.id], scoreB: val } } }));
                        }}
                        className={scoreInput} style={inputStyle} placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 flex-1 min-w-40">
                    <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>Vencedor</label>
                    <select value={r.winner}
                      onChange={(e) => setResults((p) => ({ ...p, knockout: { ...p.knockout, [game.id]: { ...p.knockout[game.id], winner: e.target.value } } }))}
                      className={`w-full ${inputBase}`} style={inputStyle}>
                      <option value="">— Selecionar vencedor —</option>
                      {[teamA, teamB].filter((t) => t && t !== "TBD").map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {(teamA === "TBD" || teamB === "TBD") && ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bonus */}
          {activeTab === "final" && (
            <div className="rounded-[20px] border p-6 space-y-4"
              style={{ backgroundColor: "white", borderColor: "rgba(201,168,76,0.25)" }}>
              <h3 className="font-bold" style={{ color: "#8b7028", fontFamily: "var(--font-playfair)" }}>
                🏆 Palpites Bônus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { field: "champion" as const, label: "Campeão (15 pts)", icon: "🥇" },
                  { field: "thirdPlace" as const, label: "3º Colocado (10 pts)", icon: "🥉" },
                ].map(({ field, label, icon }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "#8b7028" }}>{icon} {label}</label>
                    <select value={results[field]}
                      onChange={(e) => setResults((p) => ({ ...p, [field]: e.target.value }))}
                      className={`w-full ${inputBase}`} style={inputStyle}>
                      <option value="">— Selecionar —</option>
                      {ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating save */}
      <div className="flex justify-end pt-4 border-t" style={{ borderColor: "rgba(27,67,50,0.08)" }}>
        <button onClick={save} disabled={saving}
          className="px-8 py-3 rounded-full text-white font-bold transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50"
          style={{ backgroundColor: "#1b4332" }}>
          {saving ? "Salvando..." : "💾 Salvar resultados"}
        </button>
      </div>
    </div>
  );
}
