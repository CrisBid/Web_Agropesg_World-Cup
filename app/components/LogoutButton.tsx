"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 rounded-full text-xs border transition-colors hover:bg-red-50"
      style={{ color: "#5a5a5a", borderColor: "rgba(27,67,50,0.2)" }}
    >
      Sair
    </button>
  );
}
