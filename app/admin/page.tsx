import Link from "next/link";
import { getParticipants, getResults, getLiveScoreEnabled, getLiveAdminSettings, getLiveGameOverrides } from "@/lib/data";
import { GAMES } from "@/lib/games-data";
import { computeBudget } from "@/lib/api-football";
import SyncButton from "./SyncButton";
import LiveToggle from "./LiveToggle";
import LiveAdminControls from "./LiveAdminControls";

function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export default async function AdminPage() {
  const [participants, results, liveEnabled, adminSettings, gameOverrides] = await Promise.all([
    getParticipants(),
    getResults(),
    getLiveScoreEnabled(),
    getLiveAdminSettings(),
    getLiveGameOverrides(),
  ]);
  const gamesPlayed = Object.keys(results.groups).length + Object.keys(results.knockout).length;

  const today = todayBRT();
  const todayGames = GAMES
    .filter((g) => g.date.slice(0, 10) === today)
    .map((g) => ({
      id: g.id,
      teamA: g.teamA,
      teamB: g.teamB,
      time: g.date.slice(11, 16),
      liveEnabled: gameOverrides[g.id] ?? true,
    }));

  const budget = computeBudget(adminSettings.liveMaxReqPerGame);

  const cards = [
    {
      href: "/admin/participantes",
      icon: "👥",
      title: "Participantes",
      value: `${participants.length} cadastrado${participants.length !== 1 ? "s" : ""}`,
      desc: "Adicionar ou remover participantes do bolão",
      accent: "#52b788",
    },
    {
      href: "/admin/resultados",
      icon: "📋",
      title: "Resultados",
      value: `${gamesPlayed}/104 registrado${gamesPlayed !== 1 ? "s" : ""}`,
      desc: "Inserir placar real dos jogos para calcular a pontuação",
      accent: "#c9a84c",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
          Área restrita
        </p>
        <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Painel Admin
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#5a5a5a" }}>
          Gerencie participantes e insira os resultados dos jogos.
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}
            className="group rounded-[20px] border p-7 transition-all hover:shadow-lg hover:-translate-y-1"
            style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl mb-4 transition-all group-hover:scale-110"
              style={{ backgroundColor: `${c.accent}18` }}>
              {c.icon}
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
              {c.title}
            </h2>
            <p className="text-sm font-semibold mb-1" style={{ color: c.accent }}>
              {c.value}
            </p>
            <p className="text-sm" style={{ color: "#5a5a5a" }}>{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* Live score global toggle */}
      <LiveToggle initialEnabled={liveEnabled} />

      {/* Live admin controls */}
      <LiveAdminControls
        initialSettings={adminSettings}
        initialGameOverrides={gameOverrides}
        todayGames={todayGames}
        budget={budget}
      />

      {/* Sync */}
      <SyncButton />

      {/* Quick links */}
      {participants.length > 0 && (
        <div className="rounded-[20px] border p-6 space-y-4"
          style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
          <h2 className="font-bold text-lg" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Acesso rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {participants.map((p) => (
              <Link key={p.id} href={`/palpites/${p.id}`} target="_blank"
                className="flex items-center justify-between rounded-[12px] border px-4 py-3 text-sm transition-all hover:shadow-sm"
                style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "#f7f5ef" }}>
                <span className="font-medium" style={{ color: "#1b4332" }}>{p.name}</span>
                <span className="text-xs" style={{ color: "#52b788" }}>Abrir →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
