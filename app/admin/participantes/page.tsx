"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Participant {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lockedAt?: string | null;
  isAdmin?: boolean;
}

function formatPhone(digits: string | undefined) {
  if (!digits) return "—";
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ParticipantesPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { loadParticipants(); }, []);

  async function loadParticipants() {
    const res = await fetch("/api/participantes");
    if (res.ok) setParticipants(await res.json());
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let f = digits;
    if (digits.length > 2) f = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) f = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    setNewPhone(f);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/participantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), phone: newPhone }),
    });
    const data = await res.json();

    if (res.ok) {
      setParticipants((prev) => [...prev, data]);
      setNewName("");
      setNewPhone("");
      setSuccess(`"${data.name}" adicionado!`);
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(data.error ?? "Erro ao adicionar.");
    }
    setLoading(false);
  }

  async function handleToggleLock(id: string, currentlyLocked: boolean) {
    const res = await fetch("/api/participantes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, locked: !currentlyLocked }),
    });
    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, lockedAt: currentlyLocked ? null : new Date().toISOString() } : p
        )
      );
    }
  }

  async function handleToggleAdmin(id: string, currentlyAdmin: boolean) {
    const res = await fetch("/api/participantes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isAdmin: !currentlyAdmin }),
    });
    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, isAdmin: !currentlyAdmin } : p
        )
      );
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover "${name}"? Os palpites também serão apagados.`)) return;
    const res = await fetch("/api/participantes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  const canAdd = newName.trim().length > 0 && newPhone.replace(/\D/g, "").length >= 8;

  const inputStyle = {
    backgroundColor: "#f7f5ef",
    borderColor: "rgba(27,67,50,0.15)",
    color: "#1a1a1a",
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>
            Admin
          </p>
          <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
            Participantes
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5a5a5a" }}>
            {participants.length} participante{participants.length !== 1 ? "s" : ""} cadastrado{participants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin" className="text-sm transition-colors hover:opacity-70" style={{ color: "#2d6a4f" }}>
          ← Admin
        </Link>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd}
        className="rounded-[20px] border p-6 space-y-5"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        <h2 className="font-bold text-lg" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Adicionar participante
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>Nome</label>
            <input type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-[10px] border px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>
              Telefone <span style={{ color: "#5a5a5a", fontWeight: 400 }}>(para login)</span>
            </label>
            <input type="tel" inputMode="numeric" value={newPhone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              className="w-full rounded-[10px] border px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading || !canAdd}
            className="px-6 py-2.5 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1b4332" }}>
            {loading ? "Adicionando..." : "Adicionar"}
          </button>
          {error && <p className="text-sm" style={{ color: "#dc2626" }}>⚠ {error}</p>}
          {success && <p className="text-sm" style={{ color: "#2d6a4f" }}>✓ {success}</p>}
        </div>
      </form>

      {/* List */}
      {participants.length === 0 ? (
        <div className="rounded-[20px] border border-dashed p-12 text-center"
          style={{ borderColor: "rgba(27,67,50,0.2)" }}>
          <p style={{ color: "#5a5a5a" }}>Nenhum participante ainda. Adicione o primeiro acima.</p>
        </div>
      ) : (
        <div className="rounded-[20px] border overflow-hidden"
          style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
          {participants.map((p, i) => (
            <div key={p.id}
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: i > 0 ? "1px solid rgba(27,67,50,0.06)" : "none" }}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold" style={{ color: "#1b4332" }}>{p.name}</p>
                  {p.isAdmin && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(27,67,50,0.12)", color: "#1b4332" }}>
                      admin
                    </span>
                  )}
                  {p.lockedAt && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(220,38,38,0.10)", color: "#dc2626" }}>
                      🔒 bloqueado
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#5a5a5a" }}>
                  📱 {formatPhone(p.phone)} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link href={`/palpites/${p.id}`} target="_blank"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                  style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#1b4332" }}>
                  Ver palpites
                </Link>
                <button onClick={() => handleToggleAdmin(p.id, !!p.isAdmin)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                  style={p.isAdmin
                    ? { backgroundColor: "rgba(27,67,50,0.10)", color: "#1b4332" }
                    : { backgroundColor: "rgba(27,67,50,0.05)", color: "#5a5a5a" }}>
                  {p.isAdmin ? "★ Admin" : "☆ Admin"}
                </button>
                <button onClick={() => handleToggleLock(p.id, !!p.lockedAt)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                  style={p.lockedAt
                    ? { backgroundColor: "rgba(234,179,8,0.12)", color: "#a16207" }
                    : { backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                  {p.lockedAt ? "🔓 Desbloquear" : "🔒 Bloquear"}
                </button>
                <button onClick={() => handleRemove(p.id, p.name)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                  style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Login link */}
      {participants.length > 0 && (
        <div className="rounded-[20px] border p-6 space-y-3"
          style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
          <h2 className="font-bold" style={{ color: "#1b4332" }}>Link de acesso para participantes</h2>
          <p className="text-sm" style={{ color: "#5a5a5a" }}>
            Compartilhe o link abaixo. Cada um entra com seu número de telefone.
          </p>
          <div className="flex items-center gap-3 rounded-[10px] border px-4 py-3"
            style={{ backgroundColor: "#f7f5ef", borderColor: "rgba(27,67,50,0.12)" }}>
            <span className="text-sm flex-1 font-mono" style={{ color: "#1b4332" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
            </span>
            <button
              onClick={() => typeof window !== "undefined" && navigator.clipboard.writeText(`${window.location.origin}/login`)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 transition-all hover:opacity-80"
              style={{ backgroundColor: "rgba(27,67,50,0.10)", color: "#1b4332" }}>
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
