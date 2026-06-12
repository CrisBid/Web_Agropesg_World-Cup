"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Digite um número de telefone válido.");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Número não encontrado.");
      setLoading(false);
      inputRef.current?.focus();
      return;
    }

    router.push(`/palpites/${data.id}`);
    router.refresh();
  }

  const ready = phone.replace(/\D/g, "").length >= 8;

  return (
    <div className="flex items-center justify-center min-h-[65vh]">
      {/* background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="blob w-80 h-80 top-0 right-0" style={{ backgroundColor: "rgba(82,183,136,0.18)" }} />
        <div className="blob w-64 h-64 bottom-0 left-0" style={{ backgroundColor: "rgba(201,168,76,0.14)" }} />
      </div>

      <div className="w-full max-w-sm relative z-10 space-y-8">

        {/* Brand mark */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl shadow-lg"
            style={{ backgroundColor: "#1b4332" }}>
            ⚽
          </div>
          <div>
            <h1 className="text-3xl font-black" style={{ color: "#1b4332", fontFamily: "var(--font-playfair)" }}>
              Bolão Copa 2026
            </h1>
            <p className="text-sm mt-1" style={{ color: "#5a5a5a" }}>
              Entre com seu número de telefone para acessar seus palpites.
            </p>
          </div>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit}
          className="rounded-[24px] border p-8 shadow-sm space-y-5"
          style={{ backgroundColor: "white", borderColor: "rgba(27,67,50,0.10)" }}>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-sm font-semibold" style={{ color: "#1b4332" }}>
              Número de telefone
            </label>
            <input
              ref={inputRef}
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              value={phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
              className="w-full rounded-[12px] border px-4 py-3.5 text-lg tracking-widest transition-colors outline-none"
              style={{
                backgroundColor: "#f7f5ef",
                borderColor: error ? "#dc2626" : "rgba(27,67,50,0.15)",
                color: "#1a1a1a",
                fontFamily: "var(--font-inter)",
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = "#52b788";
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = "rgba(27,67,50,0.15)";
              }}
            />
            {error && (
              <p className="text-sm flex items-center gap-1.5" style={{ color: "#dc2626" }}>
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-full py-3.5 font-bold text-white transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1b4332" }}>
            {loading ? "Entrando..." : "Entrar →"}
          </button>

          <p className="text-center text-xs" style={{ color: "#5a5a5a" }}>
            Não está cadastrado?{" "}
            <span style={{ color: "#1b4332" }}>Fale com o admin do bolão.</span>
          </p>
        </form>
      </div>
    </div>
  );
}
