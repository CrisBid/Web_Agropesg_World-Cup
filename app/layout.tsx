import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { getParticipants } from "@/lib/data";
import NavLinks from "./components/NavLinks";
import LiveScoreBanner from "./components/LiveScoreBanner";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: "Bolão Copa 2026",
  description: "Sistema interno de bolão da Copa do Mundo 2026 — AGROPESG",
};

async function getSession() {
  const jar = await cookies();
  const uid = jar.get("bolao_uid")?.value;
  if (!uid) return null;
  const participants = await getParticipants();
  return participants.find((p) => p.id === uid) ?? null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  const navSession = session
    ? { id: session.id, name: session.name, isAdmin: !!session.isAdmin }
    : null;

  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#f7f5ef", color: "#1a1a1a", fontFamily: "var(--font-inter)" }}>

        {/* Nav */}
        <header className="sticky top-0 z-50 border-b border-[#1b4332]/8"
          style={{ backgroundColor: "rgba(247,245,239,0.90)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">

            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                style={{ backgroundColor: "#1b4332" }}>
                ⚽
              </div>
              <span className="hidden sm:block font-bold text-base leading-tight" style={{ color: "#1b4332" }}>
                Bolão<br />
                <span className="font-normal text-xs" style={{ color: "#52b788" }}>Copa 2026</span>
              </span>
            </Link>

            <NavLinks session={navSession} />
          </div>
        </header>

        <LiveScoreBanner />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">{children}</main>

        <footer className="border-t py-6 text-center text-sm" style={{ borderColor: "rgba(27,67,50,0.12)", color: "#5a5a5a" }}>
          <p>Bolão Copa do Mundo 2026 · AGROPESG · Uso Interno</p>
        </footer>
      </body>
    </html>
  );
}
