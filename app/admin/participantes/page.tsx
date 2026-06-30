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
  if (digits.startsWith("000000")) return `⚠ placeholder`;
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isPlaceholder(phone: string) {
  return phone.startsWith("000000");
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const text = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: "#1b4332" }}
    >
      {text.toUpperCase()}
    </div>
  );
}

function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let f = digits;
    if (digits.length > 2) f = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) f = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    onChange(f);
  }
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={handle}
      placeholder="(34) 99999-9999"
      className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
      style={{ backgroundColor: "#f7f5ef", borderColor: "rgba(27,67,50,0.2)", color: "#1a1a1a" }}
    />
  );
}

export default function ParticipantesPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/participantes");
    if (res.ok) setParticipants(await res.json());
  }

  // ── Add ──────────────────────────────────────────────────────────────────
  function handleNewPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let f = digits;
    if (digits.length > 2) f = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) f = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    setNewPhone(f);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    setAddSuccess("");
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
      setAddSuccess(`"${data.name}" adicionado!`);
      setTimeout(() => setAddSuccess(""), 3000);
    } else {
      setAddError(data.error ?? "Erro ao adicionar.");
    }
    setAdding(false);
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function startEdit(p: Participant) {
    setEditingId(p.id);
    setEditName(p.name);
    const digits = p.phone;
    let f = digits;
    if (!isPlaceholder(digits)) {
      if (digits.length > 2) f = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length > 7) f = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else {
      f = "";
    }
    setEditPhone(f);
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError("");
    const phone = editPhone.replace(/\D/g, "");
    if (!editName.trim()) { setEditError("Nome não pode ser vazio"); setEditSaving(false); return; }
    if (phone.length < 8) { setEditError("Telefone inválido (mín. 8 dígitos)"); setEditSaving(false); return; }

    const res = await fetch("/api/participantes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName.trim(), phone }),
    });
    const data = await res.json();
    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) => p.id === id ? { ...p, name: editName.trim(), phone } : p)
      );
      setEditingId(null);
    } else {
      setEditError(data.error ?? "Erro ao salvar.");
    }
    setEditSaving(false);
  }

  // ── Lock / Admin / Remove ────────────────────────────────────────────────
  async function patch(id: string, payload: object) {
    const res = await fetch("/api/participantes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    return res.ok;
  }

  async function handleToggleLock(id: string, locked: boolean) {
    if (await patch(id, { locked: !locked }))
      setParticipants((prev) =>
        prev.map((p) => p.id === id ? { ...p, lockedAt: locked ? null : new Date().toISOString() } : p)
      );
  }

  async function handleToggleAdmin(id: string, admin: boolean) {
    if (await patch(id, { isAdmin: !admin }))
      setParticipants((prev) =>
        prev.map((p) => p.id === id ? { ...p, isAdmin: !admin } : p)
      );
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

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search.replace(/\D/g, ""))
  );
  const placeholderCount = participants.filter((p) => isPlaceholder(p.phone)).length;
  const canAdd = newName.trim().length > 0 && newPhone.replace(/\D/g, "").length >= 8;

  const inputStyle = {
    backgroundColor: "#f7f5ef",
    borderColor: "rgba(27,67,50,0.15)",
    color: "#1a1a1a",
  };

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "#52b788" }}>Admin</p>
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

      {/* Alerta de placeholders */}
      {placeholderCount > 0 && (
        <div className="rounded-[16px] border px-5 py-4 flex items-start gap-3"
          style={{ backgroundColor: "rgba(234,179,8,0.08)", borderColor: "rgba(234,179,8,0.35)" }}>
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#92400e" }}>
              {placeholderCount} participante{placeholderCount !== 1 ? "s" : ""} sem telefone real
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
              Esses participantes não conseguem fazer login. Clique em "Editar" para cadastrar o telefone.
            </p>
          </div>
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd}
        className="rounded-[20px] border p-6 space-y-4"
        style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
        <h2 className="font-bold text-lg" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
          Adicionar participante
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>Nome completo</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full rounded-[10px] border px-3.5 py-2.5 text-sm outline-none"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>
              Telefone <span style={{ color: "#5a5a5a", fontWeight: 400 }}>(usado para login)</span>
            </label>
            <input type="tel" inputMode="numeric" value={newPhone} onChange={handleNewPhoneChange}
              placeholder="(34) 99999-9999"
              className="w-full rounded-[10px] border px-3.5 py-2.5 text-sm outline-none"
              style={inputStyle} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={adding || !canAdd}
            className="px-6 py-2.5 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1b4332" }}>
            {adding ? "Adicionando..." : "+ Adicionar"}
          </button>
          {addError && <p className="text-sm" style={{ color: "#dc2626" }}>⚠ {addError}</p>}
          {addSuccess && <p className="text-sm font-medium" style={{ color: "#16a34a" }}>✓ {addSuccess}</p>}
        </div>
      </form>

      {/* Search */}
      {participants.length > 4 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Buscar por nome ou telefone..."
          className="w-full rounded-[12px] border px-4 py-3 text-sm outline-none"
          style={inputStyle}
        />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-[20px] border border-dashed p-12 text-center"
          style={{ borderColor: "rgba(27,67,50,0.2)" }}>
          <p style={{ color: "#5a5a5a" }}>
            {search ? "Nenhum resultado encontrado." : "Nenhum participante ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const isEditing = editingId === p.id;
            const placeholder = isPlaceholder(p.phone);

            return (
              <div key={p.id}
                className="rounded-[16px] border overflow-hidden transition-all"
                style={{
                  backgroundColor: "white",
                  borderColor: isEditing
                    ? "rgba(27,67,50,0.35)"
                    : placeholder
                    ? "rgba(234,179,8,0.30)"
                    : "rgba(27,67,50,0.08)",
                }}>

                {/* Main row */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <Initials name={p.name} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: "#1b4332" }}>{p.name}</span>
                      {p.isAdmin && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(27,67,50,0.12)", color: "#1b4332" }}>admin</span>
                      )}
                      {p.lockedAt && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(220,38,38,0.10)", color: "#dc2626" }}>🔒 bloqueado</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: placeholder ? "#a16207" : "#5a5a5a" }}>
                      {placeholder ? "⚠ Telefone não cadastrado" : `📱 ${formatPhone(p.phone)}`}
                      <span style={{ color: "#c4c4c4" }}>·</span>
                      <span>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/palpites/${p.id}`} target="_blank"
                      className="text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80 hidden sm:block"
                      style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "#1b4332" }}>
                      Palpites
                    </Link>
                    <Link href={`/admin/palpites/${p.id}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80 hidden sm:block"
                      style={{ backgroundColor: "rgba(74,144,217,0.12)", color: "#1d4ed8" }}>
                      Bracket
                    </Link>
                    <button onClick={() => isEditing ? cancelEdit() : startEdit(p)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                      style={isEditing
                        ? { backgroundColor: "rgba(27,67,50,0.12)", color: "#1b4332" }
                        : { backgroundColor: "rgba(27,67,50,0.06)", color: "#1b4332" }}>
                      {isEditing ? "Cancelar" : "✏ Editar"}
                    </button>
                    <button onClick={() => handleToggleAdmin(p.id, !!p.isAdmin)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-full transition-all hover:opacity-80 hidden sm:block"
                      style={p.isAdmin
                        ? { backgroundColor: "rgba(27,67,50,0.10)", color: "#1b4332" }
                        : { backgroundColor: "rgba(27,67,50,0.04)", color: "#9a9a9a" }}>
                      {p.isAdmin ? "★" : "☆"}
                    </button>
                    <button onClick={() => handleToggleLock(p.id, !!p.lockedAt)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-full transition-all hover:opacity-80"
                      style={p.lockedAt
                        ? { backgroundColor: "rgba(234,179,8,0.12)", color: "#a16207" }
                        : { backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}>
                      {p.lockedAt ? "🔓" : "🔒"}
                    </button>
                    <button onClick={() => handleRemove(p.id, p.name)}
                      className="text-xs px-2.5 py-1.5 rounded-full transition-all hover:opacity-80"
                      style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}>
                      ✕
                    </button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="px-5 pb-5 pt-1 border-t space-y-4"
                    style={{ borderColor: "rgba(27,67,50,0.08)", backgroundColor: "rgba(27,67,50,0.02)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5a5a5a" }}>
                      Editar cadastro
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>Nome completo</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
                          style={inputStyle}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold" style={{ color: "#1b4332" }}>
                          Telefone <span style={{ color: "#5a5a5a", fontWeight: 400 }}>(para login)</span>
                        </label>
                        <PhoneInput value={editPhone} onChange={setEditPhone} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveEdit(p.id)}
                        disabled={editSaving}
                        className="px-5 py-2 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: "#1b4332" }}>
                        {editSaving ? "Salvando..." : "Salvar"}
                      </button>
                      <button onClick={cancelEdit}
                        className="px-5 py-2 rounded-full text-sm transition-all hover:opacity-70"
                        style={{ color: "#5a5a5a" }}>
                        Cancelar
                      </button>
                      {editError && (
                        <p className="text-sm" style={{ color: "#dc2626" }}>⚠ {editError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link de acesso */}
      {participants.length > 0 && (
        <div className="rounded-[20px] border p-6 space-y-3"
          style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.08)" }}>
          <h2 className="font-bold" style={{ color: "#1b4332" }}>Link de acesso</h2>
          <p className="text-sm" style={{ color: "#5a5a5a" }}>
            Compartilhe com os participantes. Cada um entra com o seu número de telefone.
          </p>
          <div className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
            style={{ backgroundColor: "#f7f5ef", borderColor: "rgba(27,67,50,0.12)" }}>
            <span className="text-sm flex-1 font-mono truncate" style={{ color: "#1b4332" }}>
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
