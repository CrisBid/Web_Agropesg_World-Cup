import Link from "next/link";
import { getParticipants, getResults, getPredictions } from "@/lib/data";
import { calcTotalPoints } from "@/lib/scoring";
import { GAMES } from "@/lib/games-data";
import type { Phase } from "@/lib/games-data";

const PRIZES_CENTS = [220000, 80000, 50000, 20000, 10000];

function densePosition(ranking: { total: number }[], i: number): number {
  const distinctHigher = new Set(
    ranking.filter((p) => p.total > ranking[i].total).map((p) => p.total)
  ).size;
  return distinctHigher + 1;
}

function calcPrizes(ranking: { total: number }[]): (number | null)[] {
  const prizes: (number | null)[] = new Array(ranking.length).fill(null);
  for (let i = 0; i < ranking.length; i++) {
    const pos = densePosition(ranking, i);
    if (pos > PRIZES_CENTS.length) continue;
    const tiedCount = ranking.filter((p) => p.total === ranking[i].total).length;
    prizes[i] = Math.round(PRIZES_CENTS[pos - 1] / tiedCount);
  }
  return prizes;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉", 4: "4️⃣", 5: "5️⃣" };

const PODIUM_STYLE: Record<number, { bg: string; border: string }> = {
  1: { bg: "rgba(201,168,76,0.10)", border: "rgba(201,168,76,0.30)" },
  2: { bg: "rgba(160,160,170,0.10)", border: "rgba(160,160,170,0.30)" },
  3: { bg: "rgba(180,120,60,0.10)", border: "rgba(180,120,60,0.30)" },
  4: { bg: "rgba(27,67,50,0.04)", border: "rgba(27,67,50,0.12)" },
  5: { bg: "rgba(27,67,50,0.04)", border: "rgba(27,67,50,0.12)" },
};

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
  const [participants, results, ranking] = await Promise.all([
    getParticipants(),
    getResults(),
    getRanking(),
  ]);
  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;

  // Agrupar top 5 por posição densa
  const prizes = calcPrizes(ranking);
  type RankEntry = (typeof ranking)[0];
  const positionGroups: { pos: number; pts: number; prize: number | null; people: RankEntry[] }[] = [];
  for (const pos of [1, 2, 3, 4, 5]) {
    const group = ranking.filter((_, i) => densePosition(ranking, i) === pos);
    if (group.length === 0) break;
    const rankIdx = ranking.indexOf(group[0]);
    positionGroups.push({ pos, pts: group[0].total, prize: prizes[rankIdx], people: group });
  }
  const top3Groups = positionGroups.filter((g) => g.pos <= 3);
  const bottom2Groups = positionGroups.filter((g) => g.pos >= 4);

  // Participantes em ordem alfabética
  const sortedParticipants = [...participants].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );

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

          {!participants.length && (
            <Link href="/login"
              className="inline-block mt-4 px-8 py-3 rounded-full font-semibold text-sm transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: "#52b788", color: "#fff" }}>
              Fazer meus palpites →
            </Link>
          )}
        </div>
      </section>

      {/* ── PÓDIO ── */}
      {positionGroups.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Pódio Atual</SectionTitle>

          {/* Top 3: um bloco por posição */}
          {top3Groups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3Groups.map(({ pos, pts, prize, people }) => {
                const style = PODIUM_STYLE[pos];
                const tied = people.length > 1;
                return (
                  <div key={pos} className="rounded-[20px] p-6 border"
                    style={{ backgroundColor: style.bg, borderColor: style.border }}>
                    {/* cabeçalho da posição */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">{MEDAL[pos]}</span>
                      <div className="text-right">
                        <p className="text-3xl font-black" style={{ color: "#1b4332" }}>{pts}</p>
                        <p className="text-xs" style={{ color: "#5a5a5a" }}>pontos</p>
                      </div>
                    </div>
                    {/* participantes dessa posição */}
                    <div className="space-y-2">
                      {people.map((p) => (
                        <Link key={p.id} href={`/palpites/${p.id}`}
                          className="block rounded-[12px] px-3 py-2 transition-all hover:opacity-70"
                          style={{ backgroundColor: "rgba(255,255,255,0.55)" }}>
                          <p className="font-bold text-sm leading-snug" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
                            {p.name}
                          </p>
                          {p.champion && (
                            <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                          )}
                        </Link>
                      ))}
                    </div>
                    {/* prêmio */}
                    {prize !== null && (
                      <div className="flex items-center gap-1.5 mt-4 pt-3" style={{ borderTop: `1px solid ${style.border}` }}>
                        <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{formatBRL(prize)}</span>
                        {tied && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                            cada (dividido)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 4º e 5º lugar */}
          {bottom2Groups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bottom2Groups.map(({ pos, pts, prize, people }) => {
                const style = PODIUM_STYLE[pos];
                const tied = people.length > 1;
                return (
                  <div key={pos} className="rounded-[20px] p-5 border"
                    style={{ backgroundColor: style.bg, borderColor: style.border }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{MEDAL[pos]}</span>
                      <div className="text-right">
                        <p className="text-xl font-black" style={{ color: "#1b4332" }}>{pts}</p>
                        <p className="text-xs" style={{ color: "#5a5a5a" }}>pontos</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {people.map((p) => (
                        <Link key={p.id} href={`/palpites/${p.id}`}
                          className="block rounded-[10px] px-3 py-2 transition-all hover:opacity-70"
                          style={{ backgroundColor: "rgba(255,255,255,0.55)" }}>
                          <p className="font-semibold text-sm leading-snug" style={{ color: "#1b4332" }}>
                            {p.name}
                          </p>
                          {p.champion && (
                            <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>🏆 {p.champion}</p>
                          )}
                        </Link>
                      ))}
                    </div>
                    {prize !== null && (
                      <div className="flex items-center gap-1.5 mt-3 pt-2.5" style={{ borderTop: `1px solid ${style.border}` }}>
                        <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{formatBRL(prize)}</span>
                        {tied && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(234,179,8,0.15)", color: "#a16207" }}>
                            cada (dividido)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-right">
            <Link href="/ranking" className="text-sm font-semibold transition-colors hover:opacity-70"
              style={{ color: "#2d6a4f" }}>
              Ver ranking completo →
            </Link>
          </div>
        </section>
      )}

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
