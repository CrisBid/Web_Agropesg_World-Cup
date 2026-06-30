"use client";

import { useState, useCallback, useRef } from "react";
import { GAMES, GROUPS, ALL_TEAMS, PHASE_LABELS, KNOCKOUT_GAME_PTS, BRACKET, FASE32_GROUPS } from "@/lib/games-data";
import { ANNEX_C } from "@/lib/annex-c";
import type { Phase, Game } from "@/lib/games-data";
import type { ParticipantPredictions, ActualResults } from "@/lib/scoring";

const GROUP_GAMES = GAMES.filter((g) => g.phase === "grupos");
const KNOCKOUT_GAMES = GAMES.filter((g) => g.phase !== "grupos");
const PHASES_ORDER: Phase[] = ["fase32", "oitavas", "quartas", "semis", "terceiro", "final"];

const PHASE_PTS = KNOCKOUT_GAME_PTS;

interface Standing { team: string; J: number; V: number; E: number; D: number; GP: number; GC: number; SG: number; Pts: number }
interface ThirdQ { team: string; group: string; Pts: number; SG: number; GP: number }

function calcGroupStandings(
  group: string,
  scores: Record<number, { scoreA: number | null; scoreB: number | null }>
): Standing[] {
  const teams = GROUPS[group] ?? [];
  const games = GROUP_GAMES.filter((g) => g.group === group);
  const s: Record<string, Standing> = Object.fromEntries(
    teams.map((t) => [t, { team: t, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, SG: 0, Pts: 0 }])
  );
  for (const game of games) {
    const r = scores[game.id];
    if (r == null || r.scoreA == null || r.scoreB == null) continue;
    const a = s[game.teamA]; const b = s[game.teamB];
    if (!a || !b) continue;
    a.J++; b.J++;
    a.GP += r.scoreA; a.GC += r.scoreB;
    b.GP += r.scoreB; b.GC += r.scoreA;
    if (r.scoreA > r.scoreB)      { a.V++; a.Pts += 3; b.D++; }
    else if (r.scoreA < r.scoreB) { b.V++; b.Pts += 3; a.D++; }
    else                           { a.E++; b.E++; a.Pts++; b.Pts++; }
  }
  return teams.map((t) => ({ ...s[t], SG: s[t].GP - s[t].GC }))
    .sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP);
}

interface Props {
  participantId: string;
  participantName: string;
  initialPredictions: ParticipantPredictions;
  results: ActualResults;
  pointsByGame: Record<number, number>;
  locked: boolean;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function hasResult(game: Game, results: ActualResults) {
  if (game.phase === "grupos") {
    const r = results.groups[game.id];
    return r !== undefined && r.scoreA !== undefined;
  }
  const r = results.knockout[game.id];
  return r !== undefined && !!r.winner;
}

export default function PalpitesForm({ participantId, initialPredictions, results, pointsByGame, locked }: Props) {
  const [predictions, setPredictions] = useState<ParticipantPredictions>(initialPredictions);
  const [activeTab, setActiveTab] = useState<"grupos" | "classificados" | Phase>("grupos");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (data: ParticipantPredictions) => {
    setSaving(true);
    await fetch(`/api/palpites/${participantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaveMsg("Salvo ✓");
    setTimeout(() => setSaveMsg(""), 2000);
  }, [participantId]);

  function scheduleSave(data: ParticipantPredictions) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(data), 800);
  }

  function setGroupScore(gameId: number, field: "scoreA" | "scoreB", val: string) {
    const num = val === "" ? null : Math.max(0, parseInt(val) || 0);
    setPredictions((prev) => {
      const next = { ...prev, groups: { ...prev.groups, [gameId]: { ...prev.groups[gameId], [field]: num } } };
      scheduleSave(next);
      return next;
    });
  }

  function setKnockoutWinner(gameId: number, winner: string) {
    setPredictions((prev) => {
      const next = { ...prev, knockout: { ...prev.knockout, [gameId]: { ...prev.knockout[gameId], winner: winner || null } } };
      scheduleSave(next);
      return next;
    });
  }

  function setKnockoutScore(gameId: number, field: "scoreA" | "scoreB", val: string, teamA: string, teamB: string) {
    const num = val === "" ? null : Math.max(0, parseInt(val) || 0);
    setPredictions((prev) => {
      const existing = prev.knockout[gameId] ?? { winner: null, scoreA: null, scoreB: null };
      const nextScoreA = field === "scoreA" ? num : (existing.scoreA ?? null);
      const nextScoreB = field === "scoreB" ? num : (existing.scoreB ?? null);
      // Auto-derive winner from score; keep existing if tied (penalty choice)
      let winner = existing.winner;
      if (nextScoreA !== null && nextScoreB !== null) {
        if (nextScoreA > nextScoreB) winner = teamA;
        else if (nextScoreB > nextScoreA) winner = teamB;
        // tied → keep stored penalty pick, but clear if it's stale
        else if (winner !== teamA && winner !== teamB) winner = null;
      }
      const next = {
        ...prev,
        knockout: { ...prev.knockout, [gameId]: { ...existing, scoreA: nextScoreA, scoreB: nextScoreB, winner } },
      };
      scheduleSave(next);
      return next;
    });
  }

  function setBonus(field: "champion" | "thirdPlace", val: string) {
    setPredictions((prev) => {
      const next = { ...prev, [field]: val || null };
      scheduleSave(next);
      return next;
    });
  }

  const gamesByDay = GROUP_GAMES.slice().sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ).reduce<Record<string, Game[]>>((acc, g) => {
    const day = g.date.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(g);
    return acc;
  }, {});

  // ── Bracket resolution ────────────────────────────────────────────────────
  // Standings for all groups computed from the user's own predictions
  const allGroupStandings: Record<string, Standing[]> = {};
  for (const g of Object.keys(GROUPS)) {
    allGroupStandings[g] = calcGroupStandings(g, predictions.groups);
  }

  // 8 best predicted 3rd-place finishers ranked by Pts → SG → GP, tracking their source group
  const predictedThirdQ: ThirdQ[] = Object.keys(GROUPS)
    .flatMap((g) => { const t = allGroupStandings[g][2]; return t && t.J > 0 ? [{ team: t.team, group: g, Pts: t.Pts, SG: t.SG, GP: t.GP }] : []; })
    .sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP)
    .slice(0, 8);

  function getWinnerOf(gameId: number): string {
    return results.knockout[gameId]?.winner ?? predictions.knockout[gameId]?.winner ?? "TBD";
  }

  function getTeamsForGame(gameId: number): { teamA: string; teamB: string } {
    // Fase de 32 (games 73-88): always derive from this user's own group predictions
    // (their stored winner was picked against their personal predicted bracket)
    const codes = FASE32_GROUPS[gameId];
    if (codes) {
      const resolve = (code: string, otherCode: string): string => {
        if (code === "3rd") {
          if (predictedThirdQ.length < 8) return "TBD";
          // Build Annex C key from the 8 qualifying group letters, sorted alphabetically
          const qualifyingKey = predictedThirdQ.map(q => q.group).sort().join("");
          const annexEntry = ANNEX_C[qualifyingKey];
          if (!annexEntry) return "TBD";
          // otherCode is e.g. "1E" → group winner letter is "E"
          const thirdPlaceGroup = annexEntry[otherCode[1]];
          return predictedThirdQ.find(q => q.group === thirdPlaceGroup)?.team ?? "TBD";
        }
        const pos = Number(code[0]) - 1;
        const grp = code[1];
        return allGroupStandings[grp]?.[pos]?.team ?? "TBD";
      };
      return { teamA: resolve(codes[0], codes[1]), teamB: resolve(codes[1], codes[0]) };
    }

    // 3rd-place match: losers of the two semis (game 103)
    if (gameId === 103) {
      const loser = (semiId: number) => {
        const w = getWinnerOf(semiId);
        if (w === "TBD") return "TBD";
        const t = getTeamsForGame(semiId);
        return w === t.teamA ? t.teamB : t.teamA;
      };
      return { teamA: loser(101), teamB: loser(102) };
    }

    // All other rounds: winners of feeder games
    const feeders = BRACKET[gameId];
    if (!feeders) return { teamA: "TBD", teamB: "TBD" };
    return { teamA: getWinnerOf(feeders[0]), teamB: getWinnerOf(feeders[1]) };
  }

  const filledGroups = Object.values(predictions.groups).filter((p) => p.scoreA !== null && p.scoreB !== null).length;
  const filledKnockout = Object.values(predictions.knockout).filter((p) => p.winner).length;

  // All teams that actually qualified to fase32 (global set used for classifying criterion)
  const allFase32Teams = new Set(
    Object.values(results.knockoutTeams ?? {}).flatMap((t) => [t.teamA, t.teamB]).filter((t) => t && t !== "TBD")
  );
  const fase32GamesOrdered = GAMES.filter((g) => g.phase === "fase32").sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const tabs = [
    { key: "grupos" as const, label: "Fase de Grupos" },
    { key: "classificados" as const, label: "Classificados F32" },
    ...PHASES_ORDER.map((ph) => ({ key: ph, label: PHASE_LABELS[ph] })),
  ];

  const inputStyle = {
    backgroundColor: "#f7f5ef",
    borderColor: "rgba(27,67,50,0.15)",
    color: "#1a1a1a",
  };

  return (
    <div className="space-y-6">

      {/* Lock banner */}
      {locked && (
        <div className="rounded-[16px] border px-5 py-4 flex items-center gap-3"
          style={{ backgroundColor: "rgba(220,38,38,0.05)", borderColor: "rgba(220,38,38,0.20)" }}>
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>
              Apostas bloqueadas
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
              Suas apostas foram enviadas e não podem mais ser alteradas. Entre em contato com o admin se precisar de ajustes.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar + save */}
      <div className="rounded-[16px] border px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        <div className="flex flex-wrap gap-5 text-sm">
          <div>
            <span style={{ color: "#5a5a5a" }}>Grupos: </span>
            <span className="font-bold" style={{ color: "#1b4332" }}>{filledGroups}/72</span>
            <div className="mt-1 h-1.5 w-24 rounded-full overflow-hidden" style={{ backgroundColor: "#d8f3dc" }}>
              <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#52b788", width: `${(filledGroups / 72) * 100}%` }} />
            </div>
          </div>
          <div>
            <span style={{ color: "#5a5a5a" }}>Mata-mata: </span>
            <span className="font-bold" style={{ color: "#1b4332" }}>{filledKnockout}/32</span>
            <div className="mt-1 h-1.5 w-24 rounded-full overflow-hidden" style={{ backgroundColor: "#d8f3dc" }}>
              <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#1b4332", width: `${(filledKnockout / 32) * 100}%` }} />
            </div>
          </div>
          {predictions.champion && (
            <div className="text-xs self-end" style={{ color: "#c9a84c" }}>
              🏆 {predictions.champion}
            </div>
          )}
        </div>

        {!locked && (
          <div className="flex items-center gap-3 text-sm">
            {saving && <span style={{ color: "#5a5a5a" }}>Salvando...</span>}
            {saveMsg && <span className="font-semibold" style={{ color: "#2d6a4f" }}>{saveMsg}</span>}
            <button onClick={() => save(predictions)}
              className="px-4 py-2 rounded-full text-white text-xs font-semibold transition-all hover:opacity-90 hover:shadow-md"
              style={{ backgroundColor: "#1b4332" }}>
              Salvar
            </button>
          </div>
        )}
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

      {/* GROUP STAGE — chronological list + group sidebar */}
      {activeTab === "grupos" && (
        <div className="flex gap-5 items-start">

          {/* ── Main: chronological game list ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {Object.entries(gamesByDay).map(([day, games]) => {
              const [y, m, d] = day.split("-").map(Number);
              const dateLabel = new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
                weekday: "long", day: "2-digit", month: "2-digit",
              });

              return (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold capitalize"
                      style={{ backgroundColor: "#1b4332", color: "white" }}>
                      {dateLabel}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.10)" }} />
                  </div>

                  {/* Games for this day */}
                  <div className="rounded-[16px] border overflow-hidden"
                    style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
                    {games.map((game, gi) => {
                      const pred = predictions.groups[game.id] ?? { scoreA: null, scoreB: null };
                      const result = results.groups[game.id];
                      const played = hasResult(game, results);
                      const pts = pointsByGame[game.id];
                      const timeStr = game.date.slice(11, 16); // "16:00"

                      return (
                        <div key={game.id}
                          style={{
                            borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.06)" : "none",
                            backgroundColor: played ? "rgba(27,67,50,0.018)" : "transparent",
                          }}
                          className="px-4 py-3">

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold font-mono w-10 shrink-0"
                              style={{ color: "#1b4332" }}>
                              {timeStr}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: "rgba(27,67,50,0.08)", color: "#1b4332" }}>
                              Gr. {game.group}
                            </span>
                            <span className="text-xs truncate hidden sm:block" style={{ color: "#8a8a8a" }}>
                              {game.stadium.split(",")[0]}
                            </span>
                            {played && pts !== undefined && (
                              <span className="ml-auto text-xs font-bold shrink-0"
                                style={{ color: pts > 0 ? "#2d6a4f" : "#8a8a8a" }}>
                                {pts > 0 ? `+${pts}` : "0"} pts
                              </span>
                            )}
                          </div>

                          {/* Score row */}
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-right text-sm font-semibold truncate"
                              style={{ color: "#1b4332" }}>
                              {game.teamA}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <input type="number" min={0} max={99}
                                disabled={played || locked}
                                value={pred.scoreA ?? ""}
                                onChange={(e) => setGroupScore(game.id, "scoreA", e.target.value)}
                                placeholder="—"
                                className="w-10 text-center rounded-[8px] border py-1.5 text-sm font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                style={inputStyle}
                              />
                              <span className="text-xs font-bold px-0.5" style={{ color: "#8a8a8a" }}>×</span>
                              <input type="number" min={0} max={99}
                                disabled={played || locked}
                                value={pred.scoreB ?? ""}
                                onChange={(e) => setGroupScore(game.id, "scoreB", e.target.value)}
                                placeholder="—"
                                className="w-10 text-center rounded-[8px] border py-1.5 text-sm font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                style={inputStyle}
                              />
                            </div>
                            <span className="flex-1 text-sm font-semibold truncate"
                              style={{ color: "#1b4332" }}>
                              {game.teamB}
                            </span>
                          </div>

                          {/* Actual result badge */}
                          {played && result && (
                            <div className="flex justify-center mt-1.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-full"
                                style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
                                Resultado: {result.scoreA} × {result.scoreB}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Sidebar: Group standings tables ── */}
          <div className="w-[440px] shrink-0 hidden lg:block">
            <p className="text-xs font-bold tracking-[0.18em] uppercase mb-3"
              style={{ color: "#52b788" }}>
              Classificação
            </p>
            <div className="grid grid-cols-2 gap-2">
            {Object.keys(GROUPS).sort().map((group) => {
              const rows = calcGroupStandings(group, predictions.groups);
              const gamesFilled = GROUP_GAMES.filter(
                (g) => g.group === group &&
                  predictions.groups[g.id]?.scoreA != null &&
                  predictions.groups[g.id]?.scoreB != null
              ).length;

              return (
                <div key={group} className="rounded-[12px] border overflow-hidden"
                  style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-1.5"
                    style={{ backgroundColor: "rgba(27,67,50,0.05)", borderBottom: "1px solid rgba(27,67,50,0.07)" }}>
                    <span className="text-xs font-bold" style={{ color: "#1b4332" }}>Grupo {group}</span>
                    <span className="text-xs" style={{ color: "#8a8a8a" }}>{gamesFilled}/6</span>
                  </div>

                  {/* Column headers */}
                  <div className="grid px-2 py-1"
                    style={{ gridTemplateColumns: "14px 1fr 18px 18px 18px 18px 22px", gap: "0 4px", borderBottom: "1px solid rgba(27,67,50,0.06)" }}>
                    {["", "Time", "J", "V", "E", "D", "Pts"].map((h) => (
                      <span key={h} className="text-center text-[10px] font-bold"
                        style={{ color: "#8a8a8a" }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Rows */}
                  {rows.map((row, i) => (
                    <div key={row.team}
                      className="grid items-center px-2 py-1"
                      style={{
                        gridTemplateColumns: "14px 1fr 18px 18px 18px 18px 22px",
                        gap: "0 4px",
                        borderTop: i > 0 ? "1px solid rgba(27,67,50,0.05)" : "none",
                        backgroundColor: i < 2 ? "rgba(82,183,136,0.05)" : "transparent",
                      }}>
                      <span className="text-[10px] font-bold text-center"
                        style={{ color: i < 2 ? "#2d6a4f" : "#aaa" }}>
                        {i + 1}
                      </span>
                      <span className="text-[11px] truncate font-medium" style={{ color: "#1b4332" }}>
                        {row.team}
                      </span>
                      {[row.J, row.V, row.E, row.D].map((val, ci) => (
                        <span key={ci} className="text-[11px] text-center" style={{ color: "#5a5a5a" }}>
                          {val}
                        </span>
                      ))}
                      <span className="text-[11px] text-center font-bold"
                        style={{ color: row.Pts > 0 ? "#1b4332" : "#8a8a8a" }}>
                        {row.Pts}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
            </div>
          </div>

        </div>
      )}

      {/* CLASSIFICADOS F32 — 32 teams: top 2 per group + 8 best thirds */}
      {activeTab === "classificados" && (() => {
        const hasData = allFase32Teams.size > 0;

        // Build: top 2 per group from user's group predictions
        const directRows: { group: string; pos: number; team: string }[] = [];
        const thirdRows: { group: string; team: string; Pts: number; SG: number; GP: number }[] = [];

        for (const grp of Object.keys(GROUPS).sort()) {
          const standings = allGroupStandings[grp] ?? [];
          if (standings[0]?.J > 0) directRows.push({ group: grp, pos: 1, team: standings[0].team });
          if (standings[1]?.J > 0) directRows.push({ group: grp, pos: 2, team: standings[1].team });
          const third = standings[2];
          if (third?.J > 0) thirdRows.push({ group: grp, team: third.team, Pts: third.Pts, SG: third.SG, GP: third.GP });
        }
        thirdRows.sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP);
        const top8Thirds = thirdRows.slice(0, 8);

        const allRows = [
          ...directRows.map((r) => ({ label: `${r.pos}º Grupo ${r.group}`, team: r.team })),
          ...top8Thirds.map((r) => ({ label: `3º Grupo ${r.group}`, team: r.team })),
        ];
        const totalClassified = allRows.filter((r) => allFase32Teams.has(r.team)).length;
        const totalPts = totalClassified * 3;

        return (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-2xl border px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
              <div>
                <p className="text-sm font-bold" style={{ color: "#1b4332" }}>
                  Classificados para a Fase de 32
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
                  {hasData
                    ? `${totalClassified} de 32 times acertados`
                    : "Aguardando resultado da fase de grupos"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: "#1b4332" }}>{totalPts}</p>
                <p className="text-xs" style={{ color: "#5a5a5a" }}>pts (+3 cada)</p>
              </div>
            </div>

            {/* Direct qualifiers: top 2 per group */}
            <div>
              <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "#52b788" }}>
                1º e 2º de cada grupo
              </p>
              <div className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
                {directRows.map((r, gi) => {
                  const ok = hasData && allFase32Teams.has(r.team);
                  return (
                    <div key={`${r.group}-${r.pos}`}
                      className="flex items-center justify-between px-4 py-2.5 gap-3"
                      style={{
                        borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.06)" : "none",
                        backgroundColor: ok ? "rgba(82,183,136,0.04)" : "transparent",
                      }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold shrink-0 w-16" style={{ color: "#8a8a8a" }}>
                          {r.pos}º Gr.{r.group}
                        </span>
                        <span className="text-sm font-semibold truncate" style={{ color: "#1b4332" }}>
                          {r.team || <span style={{ color: "#bbb" }}>—</span>}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {!hasData ? (
                          <span className="text-xs" style={{ color: "#bbb" }}>aguardando</span>
                        ) : (
                          <>
                            <span className="text-xs font-semibold" style={{ color: ok ? "#2d6a4f" : "#9a9a9a" }}>
                              {ok ? "✓ Classificou" : "✗ Não classificou"}
                            </span>
                            <span className="ml-2 text-xs font-bold" style={{ color: ok ? "#2d6a4f" : "#9a9a9a" }}>
                              {ok ? "+3 pts" : "0 pts"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3rd-place qualifiers */}
            <div>
              <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "#52b788" }}>
                Melhores 3ºs lugares (top 8)
              </p>
              <div className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
                {top8Thirds.length === 0 ? (
                  <p className="px-4 py-3 text-xs" style={{ color: "#bbb" }}>
                    {predictions.groups && Object.keys(predictions.groups).length < 12
                      ? "Preencha os palpites de grupos para ver os 3ºs qualificados"
                      : "Aguardando palpites de grupos"}
                  </p>
                ) : top8Thirds.map((r, gi) => {
                  const ok = hasData && allFase32Teams.has(r.team);
                  return (
                    <div key={r.group}
                      className="flex items-center justify-between px-4 py-2.5 gap-3"
                      style={{
                        borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.06)" : "none",
                        backgroundColor: ok ? "rgba(82,183,136,0.04)" : "transparent",
                      }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold shrink-0 w-16" style={{ color: "#8a8a8a" }}>
                          3º Gr.{r.group}
                        </span>
                        <span className="text-sm font-semibold truncate" style={{ color: "#1b4332" }}>
                          {r.team}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {!hasData ? (
                          <span className="text-xs" style={{ color: "#bbb" }}>aguardando</span>
                        ) : (
                          <>
                            <span className="text-xs font-semibold" style={{ color: ok ? "#2d6a4f" : "#9a9a9a" }}>
                              {ok ? "✓ Classificou" : "✗ Não classificou"}
                            </span>
                            <span className="ml-2 text-xs font-bold" style={{ color: ok ? "#2d6a4f" : "#9a9a9a" }}>
                              {ok ? "+3 pts" : "0 pts"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* KNOCKOUT — chronological list with score inputs */}
      {PHASES_ORDER.includes(activeTab as Phase) && (
        <div className="space-y-4">

          {/* Bonus section (Final tab only) */}
          {activeTab === "final" && (
            <div className="rounded-[20px] border p-6 space-y-4"
              style={{ backgroundColor: "rgba(201,168,76,0.06)", borderColor: "rgba(201,168,76,0.28)" }}>
              <h3 className="font-bold text-lg" style={{ color: "#8b7028", fontFamily: "var(--font-playfair)" }}>
                🏆 Palpites Bônus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { field: "champion" as const, label: "Campeão", pts: 15, icon: "🥇" },
                  { field: "thirdPlace" as const, label: "3º Colocado", pts: 10, icon: "🥉" },
                ] as const).map(({ field, label, pts, icon }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: "#8b7028" }}>
                      {icon} {label}
                      <span className="ml-1 px-1.5 py-0.5 rounded text-xs"
                        style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#8b7028" }}>
                        +{pts} pts
                      </span>
                    </label>
                    <select value={predictions[field] ?? ""}
                      onChange={(e) => setBonus(field, e.target.value)}
                      disabled={locked}
                      className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "white", borderColor: "rgba(201,168,76,0.3)", color: "#1a1a1a" }}>
                      <option value="">— Selecionar —</option>
                      {ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Games grouped by day */}
          {(() => {
            const phaseGames = KNOCKOUT_GAMES
              .filter((g) => g.phase === activeTab)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const byDay: Record<string, Game[]> = {};
            for (const g of phaseGames) {
              const day = g.date.slice(0, 10);
              if (!byDay[day]) byDay[day] = [];
              byDay[day].push(g);
            }

            return Object.entries(byDay).map(([day, games]) => {
              const [y, m, d] = day.split("-").map(Number);
              const dateLabel = new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
                weekday: "long", day: "2-digit", month: "2-digit",
              });

              return (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold capitalize"
                      style={{ backgroundColor: "#1b4332", color: "white" }}>
                      {dateLabel}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(27,67,50,0.10)" }} />
                  </div>

                  <div className="rounded-[16px] border overflow-hidden"
                    style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
                    {games.map((game, gi) => {
                      const { teamA, teamB } = getTeamsForGame(game.id);
                      const teamsKnown = teamA !== "TBD" && teamB !== "TBD";
                      const pred = predictions.knockout[game.id] ?? { winner: null, scoreA: null, scoreB: null };
                      const activeWinner = (pred.winner === teamA || pred.winner === teamB) ? pred.winner : null;
                      const result = results.knockout[game.id];
                      const played = hasResult(game, results);
                      const pts = pointsByGame[game.id];
                      const timeStr = game.date.slice(11, 16);
                      const isTied = pred.scoreA !== null && pred.scoreA !== undefined
                        && pred.scoreB !== null && pred.scoreB !== undefined
                        && pred.scoreA === pred.scoreB;

                      // Fase32 played: show real teams + advancing criterion only
                      const isFase32 = game.phase === "fase32";
                      const realBracket = isFase32 ? results.knockoutTeams?.[game.id] : null;
                      const showRealGame = played && isFase32 && !!realBracket?.teamA && realBracket.teamA !== "TBD";
                      // Phase-based: awarded if predicted team won ANY fase32 game (not just this slot)
                      const fase32Winners = isFase32
                        ? new Set(
                            GAMES
                              .filter(g => g.phase === "fase32")
                              .map(g => results.knockout[g.id]?.winner)
                              .filter((w): w is string => !!w)
                          )
                        : new Set<string>();
                      const advancedWinner = showRealGame && !!pred.winner && fase32Winners.has(pred.winner);

                      // Source context label
                      const feeders = BRACKET[game.id];
                      const fase32codes = FASE32_GROUPS[game.id];
                      const fmtCode = (c: string) =>
                        c === "3rd" ? "Melhor 3º" :
                        c[0] === "1" ? `1º Gr.${c[1]}` :
                        `2º Gr.${c[1]}`;
                      const sourceHint = fase32codes
                        ? `${fmtCode(fase32codes[0])} × ${fmtCode(fase32codes[1])}`
                        : game.id === 103
                        ? "Perdedores das semifinais"
                        : feeders
                        ? `Vencedores dos jogos #${feeders[0]} e #${feeders[1]}`
                        : "";

                      return (
                        <div key={game.id}
                          style={{
                            borderTop: gi > 0 ? "1px solid rgba(27,67,50,0.06)" : "none",
                            backgroundColor: played ? "rgba(27,67,50,0.018)" : "transparent",
                          }}
                          className="px-4 py-3">

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold font-mono w-10 shrink-0"
                              style={{ color: "#1b4332" }}>{timeStr}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#8b7028" }}>
                              +{PHASE_PTS[game.phase]} pts
                            </span>
                            <span className="text-xs truncate hidden sm:block" style={{ color: "#8a8a8a" }}>
                              {game.stadium.split(",")[0]}
                            </span>
                            {played && pts !== undefined && (
                              <span className="ml-auto text-xs font-bold shrink-0"
                                style={{ color: pts > 0 ? "#2d6a4f" : "#8a8a8a" }}>
                                {pts > 0 ? `+${pts}` : "0"} pts
                              </span>
                            )}
                          </div>

                          {showRealGame ? (
                            /* Played fase32: user's predicted matchup as main, real result below */
                            <div className="space-y-2">
                              {/* User's predicted matchup */}
                              <div className="flex items-center gap-2">
                                <span className="flex-1 text-right text-sm font-semibold truncate"
                                  style={{ color: pred.winner === teamA ? "#2d6a4f" : "#1b4332" }}>
                                  {teamA}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <div className="w-8 text-center rounded-lg border py-1.5 text-sm font-mono opacity-50"
                                    style={{ borderColor: "rgba(27,67,50,0.2)", color: "#1b4332" }}>
                                    {pred.scoreA ?? "—"}
                                  </div>
                                  <span className="text-xs font-bold px-0.5" style={{ color: "#8a8a8a" }}>×</span>
                                  <div className="w-8 text-center rounded-lg border py-1.5 text-sm font-mono opacity-50"
                                    style={{ borderColor: "rgba(27,67,50,0.2)", color: "#1b4332" }}>
                                    {pred.scoreB ?? "—"}
                                  </div>
                                </div>
                                <span className="flex-1 text-sm font-semibold truncate"
                                  style={{ color: pred.winner === teamB ? "#2d6a4f" : "#1b4332" }}>
                                  {teamB}
                                </span>
                              </div>
                              <div className="text-xs text-center" style={{ color: "#8a8a8a" }}>
                                Apostou em: <span className="font-semibold" style={{ color: "#1b4332" }}>{pred.winner ?? "—"}</span>
                              </div>

                              {/* Real game result */}
                              <div className="rounded-lg px-3 py-2 space-y-1"
                                style={{ backgroundColor: "rgba(27,67,50,0.04)", borderTop: "1px solid rgba(27,67,50,0.08)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#8a8a8a" }}>
                                  Resultado real
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="flex-1 text-right text-xs font-semibold truncate"
                                    style={{ color: result?.winner === realBracket!.teamA ? "#2d6a4f" : "#5a5a5a" }}>
                                    {realBracket!.teamA}
                                  </span>
                                  <span className="text-xs font-mono font-bold shrink-0 px-1"
                                    style={{ color: "#8a8a8a" }}>
                                    {result?.scoreA} × {result?.scoreB}
                                  </span>
                                  <span className="flex-1 text-xs font-semibold truncate"
                                    style={{ color: result?.winner === realBracket!.teamB ? "#2d6a4f" : "#5a5a5a" }}>
                                    {realBracket!.teamB}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1">
                                  <span style={{ color: advancedWinner ? "#2d6a4f" : "#9a9a9a" }}>
                                    {advancedWinner ? "✓" : "✗"} Acertou quem avançou para as Oitavas
                                  </span>
                                  <span className="font-bold" style={{ color: advancedWinner ? "#2d6a4f" : "#9a9a9a" }}>
                                    {advancedWinner ? `+${PHASE_PTS.fase32} pts` : "0 pts"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : !teamsKnown ? (
                            <p className="text-xs py-1.5 text-center" style={{ color: "#aaa" }}>
                              ⏳ {sourceHint ? `${sourceHint} — ` : ""}preencha a fase anterior
                            </p>
                          ) : (
                            <>
                              {/* Score row */}
                              <div className="flex items-center gap-2">
                                <span className="flex-1 text-right text-sm font-semibold truncate"
                                  style={{ color: "#1b4332" }}>{teamA}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <input type="number" min={0} max={99}
                                    disabled={played || locked}
                                    value={pred.scoreA ?? ""}
                                    onChange={(e) => setKnockoutScore(game.id, "scoreA", e.target.value, teamA, teamB)}
                                    placeholder="—"
                                    className="w-10 text-center rounded-lg border py-1.5 text-sm font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={inputStyle}
                                  />
                                  <span className="text-xs font-bold px-0.5" style={{ color: "#8a8a8a" }}>×</span>
                                  <input type="number" min={0} max={99}
                                    disabled={played || locked}
                                    value={pred.scoreB ?? ""}
                                    onChange={(e) => setKnockoutScore(game.id, "scoreB", e.target.value, teamA, teamB)}
                                    placeholder="—"
                                    className="w-10 text-center rounded-lg border py-1.5 text-sm font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={inputStyle}
                                  />
                                </div>
                                <span className="flex-1 text-sm font-semibold truncate"
                                  style={{ color: "#1b4332" }}>{teamB}</span>
                              </div>

                              {/* Penalty picker — only when tied and both scores filled */}
                              {isTied && !played && !locked && (
                                <div className="mt-2 pt-2"
                                  style={{ borderTop: "1px dashed rgba(27,67,50,0.12)" }}>
                                  <p className="text-[11px] text-center mb-1.5" style={{ color: "#8a8a8a" }}>
                                    Empate — quem passa nos pênaltis?
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[teamA, teamB].map((team) => (
                                      <button key={team}
                                        onClick={() => setKnockoutWinner(game.id, activeWinner === team ? "" : team)}
                                        className="py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all"
                                        style={{
                                          backgroundColor: activeWinner === team ? "#1b4332" : "rgba(27,67,50,0.04)",
                                          borderColor: activeWinner === team ? "#1b4332" : "rgba(27,67,50,0.15)",
                                          color: activeWinner === team ? "white" : "#1b4332",
                                        }}>
                                        {team}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Actual result badge */}
                              {played && result && (
                                <div className="flex justify-center mt-1.5">
                                  <span className="text-xs px-2.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#2d6a4f" }}>
                                    {result.scoreA !== undefined
                                      ? `Resultado: ${result.scoreA} × ${result.scoreB} · `
                                      : ""}
                                    {result.winner} avançou
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
