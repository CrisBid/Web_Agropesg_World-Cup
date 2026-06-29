import Link from "next/link";
import { getParticipants, getResults, getPredictions, getEffectiveGames } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";
import HomeTabs from "@/app/components/HomeTabs";
import type { BracketGame, UpcomingDay } from "@/app/components/HomeTabs";
import LivePodium from "@/app/components/LivePodium";

function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}


function densePosition(ranking: { total: number }[], i: number): number {
  return new Set(ranking.filter((p) => p.total > ranking[i].total).map((p) => p.total)).size + 1;
}

async function getRanking() {
  const [participants, results] = await Promise.all([getParticipants(), getResults()]);
  const gamesPhaseMap: Record<number, Phase> = {};
  for (const g of GAMES) gamesPhaseMap[g.id] = g.phase;

  const entries = await Promise.all(
    participants.map(async (p) => {
      const predictions = await getPredictions(p.id);
      const { total } = calcTotalPoints(predictions, results, gamesPhaseMap);
      return { id: p.id, name: p.name, total, champion: predictions.champion };
    })
  );
  return entries.sort((a, b) => b.total - a.total);
}

const PHASE_CONFIG: { phase: Phase; label: string; color: string }[] = [
  { phase: "grupos",   label: "Grupos",     color: "#52b788" },
  { phase: "fase32",   label: "Fase de 32", color: "#2d6a4f" },
  { phase: "oitavas",  label: "Oitavas",    color: "#1b4332" },
  { phase: "quartas",  label: "Quartas",    color: "#40916c" },
  { phase: "semis",    label: "Semifinais", color: "#b68e1e" },
  { phase: "terceiro", label: "3º Lugar",   color: "#c9a84c" },
  { phase: "final",    label: "Final",      color: "#e5b030" },
];

const SCORING_GROUPS = [
  { label: "Resultado correto (V/E/D)", pts: 3 },
  { label: "Gols do time A correto", pts: 1 },
  { label: "Gols do time B correto", pts: 1 },
  { label: "Diferença de gols exata", pts: 2 },
  { label: "Diferença de gols (invertida)", pts: 1 },
];

const SCORING_KNOCKOUT = [
  { label: "Time correto na Fase de 32", pts: 3 },
  { label: "Time correto nas Oitavas", pts: 4 },
  { label: "Time correto nas Quartas", pts: 5 },
  { label: "Time correto nas Semis", pts: 6 },
  { label: "Time correto no 3º lugar", pts: 7 },
  { label: "Time correto na Final", pts: 8 },
  { label: "Acertar o 3º colocado", pts: 10, gold: true },
  { label: "Acertar o campeão", pts: 15, gold: true },
];

export default async function Home() {
  const [participants, results, ranking, effectiveGames] = await Promise.all([
    getParticipants(),
    getResults(),
    getRanking(),
    getEffectiveGames(),
  ]);
  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;

  const podiumEntries = ranking.map((p) => ({ id: p.id, name: p.name, total: p.total, champion: p.champion }));

  // Participantes em ordem alfabética
  const sortedParticipants = [...participants].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );

  // Jogos: hoje + próximos 2 dias, agrupados por data
  const today = todayBRT();
  const playedIds = new Set([
    ...Object.keys(results.groups).map(Number),
    ...Object.keys(results.knockout).map(Number),
  ]);

  const distinctDates = [...new Set(
    effectiveGames
      .filter((g) => g.date.slice(0, 10) >= today && !playedIds.has(g.id))
      .map((g) => g.date.slice(0, 10))
  )].sort().slice(0, 3);

  function formatDateLabel(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${days[d.getUTCDay()]}, ${day} de ${months[month - 1]}`;
  }

  const upcomingDays: UpcomingDay[] = distinctDates.map((date) => ({
    date,
    isToday: date === today,
    label: formatDateLabel(date),
    games: effectiveGames
      .filter((g) => g.date.slice(0, 10) === date && !playedIds.has(g.id))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((g) => ({
        ...g,
        result: (g.phase === "grupos" ? results.groups[g.id] : results.knockout[g.id]) ?? undefined,
      })),
  }));

  // Bracket: todos os jogos eliminatórios com resultado quando disponível
  const bracketGames: BracketGame[] = effectiveGames
    .filter((g) => g.phase !== "grupos")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((g) => ({
      id: g.id,
      date: g.date,
      teamA: g.teamA,
      teamB: g.teamB,
      phase: g.phase,
      result: results.knockout[g.id],
    }));

  const phaseStats = PHASE_CONFIG.map((cfg) => {
    const total = GAMES.filter((g) => g.phase === cfg.phase).length;
    const played = GAMES.filter((g) => g.phase === cfg.phase && playedIds.has(g.id)).length;
    return { ...cfg, total, played };
  });
  const totalGames  = phaseStats.reduce((s, p) => s + p.total, 0);
  const totalPlayed = phaseStats.reduce((s, p) => s + p.played, 0);
  const overallPct  = totalGames > 0 ? Math.round((totalPlayed / totalGames) * 100) : 0;
  const _activePrimary = phaseStats.findIndex((p) => p.played > 0 && p.played < p.total);
  const activePhaseIdx = _activePrimary >= 0 ? _activePrimary : phaseStats.findIndex((p) => p.played < p.total);

  return (
    <div className="space-y-12">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden rounded-[28px] px-8 py-14 text-center"
        style={{ backgroundColor: "#1b4332" }}>
        <div className="blob w-64 h-64 -top-16 -left-16" style={{ backgroundColor: "rgba(82,183,136,0.25)" }} />
        <div className="blob w-48 h-48 -bottom-12 -right-12" style={{ backgroundColor: "rgba(201,168,76,0.20)" }} />

        <div className="relative z-10 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ backgroundColor: "rgba(82,183,136,0.20)", color: "#52b788" }}>
            AGROPESG · Uso Interno
          </span>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}>
            Bolão Copa do Mundo 2026
          </h1>

          <p className="text-lg" style={{ color: "rgba(255,255,255,0.65)" }}>
            EUA · Canadá · México &nbsp;|&nbsp; 11 jun — 19 jul 2026
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            <Stat value={participants.length} label="Participantes" />
            <div style={{ width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" }} />
            <Stat value={gamesPlayed} label="Jogos disputados" suffix={`/104`} />
            <div style={{ width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" }} />
            <Stat value={104} label="Jogos no total" />
          </div>

          {/* ── Barra de progresso ── */}
          <div className="pt-3 space-y-2.5 w-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-wide uppercase"
                style={{ color: "rgba(255,255,255,0.4)" }}>Progresso da Copa</span>
              <span className="text-[11px] font-semibold tabular-nums"
                style={{ color: "rgba(255,255,255,0.55)" }}>
                {totalPlayed} / {totalGames} jogos · {overallPct}%
              </span>
            </div>

            {/* bar */}
            <div className="flex w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}>
              {phaseStats.map((p) => {
                const segW   = (p.total / totalGames) * 100;
                const fillW  = p.total > 0 ? (p.played / p.total) * 100 : 0;
                const done   = p.played === p.total && p.total > 0;
                return (
                  <div key={p.phase} className="relative h-full" style={{ width: `${segW}%` }}>
                    <div className="absolute inset-y-0 left-0"
                      style={{ width: `${fillW}%`, backgroundColor: done ? "rgba(255,255,255,0.80)" : "#52b788" }} />
                  </div>
                );
              })}
            </div>

            {/* phase labels */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
              {phaseStats.map((p, i) => {
                const phasePct = Math.round((p.total / totalGames) * 100);
                const done   = p.played === p.total && p.total > 0;
                const active = i === activePhaseIdx;
                return (
                  <span key={p.phase} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                      backgroundColor: done ? "rgba(255,255,255,0.7)" : active ? "#52b788" : "rgba(255,255,255,0.18)",
                    }} />
                    <span className="text-[10px] font-medium" style={{
                      color: done ? "rgba(255,255,255,0.65)" : active ? "#74c69d" : "rgba(255,255,255,0.28)",
                    }}>
                      {p.label} · {phasePct}%
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {!participants.length && (
            <Link href="/login"
              className="inline-block mt-4 px-8 py-3 rounded-full font-semibold text-sm transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: "#52b788", color: "#fff" }}>
              Fazer meus palpites →
            </Link>
          )}
        </div>
      </section>

      {/* ── COPA / JOGOS / CHAVEAMENTO ── */}
      <HomeTabs bracketGames={bracketGames} upcomingDays={upcomingDays} />

      {/* ── PÓDIO ── */}
      {podiumEntries.length > 0 && <LivePodium baseEntries={podiumEntries} />}

      {/* ── PARTICIPANTES ── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <SectionTitle>Participantes</SectionTitle>
        </div>

        {sortedParticipants.length === 0 ? (
          <div className="rounded-[20px] border border-dashed p-12 text-center"
            style={{ borderColor: "rgba(27,67,50,0.2)" }}>
            <div className="text-5xl mb-3">👥</div>
            <p style={{ color: "#5a5a5a" }}>Nenhum participante cadastrado ainda.</p>
            <Link href="/admin/participantes"
              className="inline-block mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#1b4332" }}>
              Adicionar participantes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedParticipants.map((p) => {
              const rankIdx = ranking.findIndex((r) => r.id === p.id);
              const pts = ranking[rankIdx]?.total ?? 0;
              const champion = ranking[rankIdx]?.champion;
              const pos = rankIdx >= 0 ? densePosition(ranking, rankIdx) : null;
              const isTop = pos !== null && pos <= 3;
              return (
                <Link key={p.id} href={`/palpites/${p.id}`}
                  className="group flex items-center justify-between rounded-[16px] border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: isTop ? "#1b4332" : "#52b788" }}>
                      {pos ?? "—"}
                    </div>
                    <div>
                      <p className="font-semibold leading-tight" style={{ color: "#1b4332" }}>{p.name}</p>
                      {champion && <p className="text-xs" style={{ color: "#c9a84c" }}>🏆 {champion}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black" style={{ color: "#1b4332" }}>{pts}</p>
                    <p className="text-xs" style={{ color: "#5a5a5a" }}>pts</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── REGRAS ── */}
      <section className="space-y-4">
        <SectionTitle>Regras de Pontuação</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Grupos */}
          <div className="rounded-[20px] border p-6 space-y-4"
            style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: "rgba(82,183,136,0.15)", color: "#1b4332" }}>⚽</span>
              <h3 className="font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
                Fase de Grupos
              </h3>
            </div>
            <ul className="space-y-2.5">
              {SCORING_GROUPS.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                  <span style={{ color: "#5a5a5a" }}>{s.label}</span>
                  <span className="font-bold shrink-0 px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#1b4332" }}>
                    +{s.pts} pt{s.pts > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mata-mata */}
          <div className="rounded-[20px] border p-6 space-y-4"
            style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#8b7028" }}>🏆</span>
              <h3 className="font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
                Mata-Mata
              </h3>
            </div>
            <ul className="space-y-2.5">
              {SCORING_KNOCKOUT.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                  <span style={{ color: "#5a5a5a" }}>{s.label}</span>
                  <span className={`font-bold shrink-0 px-2 py-0.5 rounded-full text-xs`}
                    style={{
                      backgroundColor: s.gold ? "rgba(201,168,76,0.15)" : "rgba(82,183,136,0.12)",
                      color: s.gold ? "#8b7028" : "#1b4332",
                    }}>
                    +{s.pts} pt{s.pts > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black text-white">
        {value}{suffix && <span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.5)" }}>{suffix}</span>}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
      {children}
    </h2>
  );
}

