import { getParticipants, getResults, getPredictions } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import Link from "next/link";
import LiveRanking from "./LiveRanking";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const [participants, results] = await Promise.all([getParticipants(), getResults()]);

  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const ranking = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total, games, bonuses } = calcTotalPoints(predictions, results, gamesPhaseMap);

      const groupPts = games
        .filter((g) => gamesPhaseMap[g.gameId] === "grupos")
        .reduce((s, g) => s + g.points, 0);
      const knockoutPts = games
        .filter((g) => gamesPhaseMap[g.gameId] !== "grupos")
        .reduce((s, g) => s + g.points, 0);

      return {
        id: p.id, name: p.name, total, groupPts, knockoutPts,
        bonusPts: bonuses.champion + bonuses.thirdPlace,
        champion: predictions.champion,
        thirdPlace: predictions.thirdPlace,
      };
    })
  );
  ranking.sort((a, b) => b.total - a.total);

  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;
  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
            Classificação Geral
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Ranking
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a5a5a" }}>
            {gamesPlayed} de 104 jogos disputados
          </p>
        </div>
        <Link href="/" className="text-sm transition-colors hover:opacity-70" style={{ color: "#2d6a4f" }}>
          ← Início
        </Link>
      </div>

      {/* Live ranking replaces static when active */}
      <LiveRanking baseRanking={ranking.map((p) => ({ id: p.id, name: p.name, total: p.total }))} />

      {ranking.length === 0 ? (
        <div className="rounded-[20px] border border-dashed p-16 text-center"
          style={{ borderColor: "rgba(27,67,50,0.2)" }}>
          <div className="text-5xl mb-3">🏆</div>
          <p style={{ color: "#5a5a5a" }}>Nenhum participante cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-5 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "#5a5a5a" }}>
            <div className="col-span-1">#</div>
            <div className="col-span-4 sm:col-span-3">Participante</div>
            <div className="col-span-2 text-center hidden sm:block">Grupos</div>
            <div className="col-span-2 text-center hidden sm:block">Mata-mata</div>
            <div className="col-span-2 text-center hidden sm:block">Bônus</div>
            <div className="col-span-7 sm:col-span-2 text-right font-bold">Total</div>
          </div>

          {ranking.map((p, i) => (
            <Link key={p.id} href={`/palpites/${p.id}`}
              className="grid grid-cols-12 gap-2 items-center rounded-[16px] border px-5 py-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{
                backgroundColor: i === 0 ? "rgba(201,168,76,0.06)" : "white",
                borderColor: i === 0 ? "rgba(201,168,76,0.35)"
                  : i === 1 ? "rgba(160,160,170,0.25)"
                  : i === 2 ? "rgba(180,120,60,0.20)"
                  : "rgba(27,67,50,0.08)",
              }}>

              <div className="col-span-1 text-xl font-bold">
                {i < 3 ? MEDAL[i] : (
                  <span className="text-sm font-bold" style={{ color: "#5a5a5a" }}>{i + 1}º</span>
                )}
              </div>

              <div className="col-span-4 sm:col-span-3">
                <p className="font-bold text-sm leading-tight" style={{ color: "#1b4332" }}>{p.name}</p>
                {p.champion && (
                  <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                )}
              </div>

              <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#5a5a5a" }}>
                {p.groupPts}
              </div>
              <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#5a5a5a" }}>
                {p.knockoutPts}
              </div>
              <div className="col-span-2 text-center hidden sm:block text-sm font-semibold" style={{ color: "#c9a84c" }}>
                {p.bonusPts > 0 ? `+${p.bonusPts}` : "—"}
              </div>

              <div className="col-span-7 sm:col-span-2 text-right">
                <span className="text-2xl font-black" style={{ color: "#1b4332" }}>{p.total}</span>
                <span className="text-xs ml-1" style={{ color: "#5a5a5a" }}>pts</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="rounded-[16px] border p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        <div className="flex gap-3 items-start">
          <span className="text-xl shrink-0">⚽</span>
          <div>
            <p className="font-semibold" style={{ color: "#1b4332" }}>Grupos</p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Pontos dos 72 jogos da fase de grupos</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-xl shrink-0">🏅</span>
          <div>
            <p className="font-semibold" style={{ color: "#1b4332" }}>Mata-Mata</p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Pontos pelas fases eliminatórias</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-xl shrink-0">🏆</span>
          <div>
            <p className="font-semibold" style={{ color: "#c9a84c" }}>Bônus</p>
            <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>Campeão (15 pts) + 3º lugar (10 pts)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
