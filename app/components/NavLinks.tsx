"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

interface Session {
  id: string;
  name: string;
  isAdmin?: boolean;
}

interface Props {
  session: Session | null;
}

export default function NavLinks({ session }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function linkClass(href: string) {
    return isActive(href)
      ? "px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
      : "px-3 py-1.5 rounded-full text-sm transition-colors hover:bg-[#1b4332]/6";
  }

  function linkStyle(href: string): React.CSSProperties {
    return isActive(href)
      ? { backgroundColor: "#1b4332", color: "white" }
      : { color: "#5a5a5a" };
  }

  const onPalpites = session ? isActive(`/palpites/${session.id}`) : false;

  return (
    <nav className="flex items-center gap-2 ml-auto text-sm">
      <Link href="/" className={linkClass("/")} style={linkStyle("/")}>
        Início
      </Link>
      <Link href="/ranking" className={linkClass("/ranking")} style={linkStyle("/ranking")}>
        Ranking
      </Link>
      <Link href="/jogos" className={linkClass("/jogos")} style={linkStyle("/jogos")}>
        Jogos
      </Link>

      {session ? (
        <>
          <Link
            href={`/palpites/${session.id}`}
            className="ml-1 px-4 py-1.5 rounded-full font-semibold transition-all text-sm"
            style={
              onPalpites
                ? { backgroundColor: "#1b4332", color: "white" }
                : { backgroundColor: "transparent", color: "#1b4332", border: "1.5px solid #1b4332" }
            }
          >
            Meus Palpites
          </Link>
          <span className="hidden md:block text-xs ml-1" style={{ color: "#5a5a5a" }}>
            {session.name}
          </span>
          <LogoutButton />
        </>
      ) : (
        <Link
          href="/login"
          className="ml-1 px-4 py-1.5 rounded-full text-white font-semibold transition-all hover:opacity-90 text-sm"
          style={{ backgroundColor: "#1b4332" }}
        >
          Entrar
        </Link>
      )}

      {session?.isAdmin && (
        <Link
          href="/admin"
          className={linkClass("/admin")}
          style={isActive("/admin") ? linkStyle("/admin") : { color: "#5a5a5a", opacity: 0.55 }}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
