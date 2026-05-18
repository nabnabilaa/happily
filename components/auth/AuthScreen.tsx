"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface AuthScreenProps {
  onLogin: (userData: any) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        onLogin(data.user);
      } else {
        setError(data.error || "Terjadi kesalahan");
      }
    } catch (err) {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: HP_TOKENS.paper,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: HP_FONT
    }}>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: 20,
          background: HP_TOKENS.yellow,
          marginBottom: 24,
          boxShadow: `0 8px 24px ${HP_TOKENS.yellow}40`
        }}>
          <HPGlyph name="sparkle" size={32} color={HP_TOKENS.ink} />
        </div>

        <h1 style={{ ...HP_TEXT.display, fontSize: 32, marginBottom: 8 }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>
        <p style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, marginBottom: 32 }}>
          {isLogin 
            ? "Masuk untuk melanjutkan produktivitasmu." 
            : "Daftar sebagai Employee dan mulai perjalananmu."}
        </p>

        {error && (
          <div style={{
            padding: "12px",
            borderRadius: 12,
            background: HP_TOKENS.coral + "15",
            color: HP_TOKENS.coral,
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 20,
            border: `1px solid ${HP_TOKENS.coral}30`
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: loading ? HP_TOKENS.line : HP_TOKENS.ink,
              color: loading ? HP_TOKENS.inkFade : HP_TOKENS.yellow,
              cursor: loading ? "not-allowed" : "pointer"
            }}
            className="hp-tap"
          >
            {loading ? "Processing..." : (isLogin ? "Login" : "Register")}
          </button>
        </form>

        <div style={{ marginTop: 24, ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
          Butuh akses? Hubungi tim HR untuk pembuatan akun.
        </div>

        {!isLogin && (
          <div style={{ marginTop: 20, padding: 12, background: HP_TOKENS.blueWash, borderRadius: 12, fontSize: 11, color: HP_TOKENS.blue, fontWeight: 600 }}>
            Note: Pendaftaran baru otomatis menjadi <b>Employee</b>. Role HR/Manager hanya dapat diubah oleh HR.
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  borderRadius: 14,
  border: `1.5px solid ${HP_TOKENS.line}`,
  fontFamily: HP_FONT,
  fontSize: 15,
  outline: "none",
  transition: "border-color 0.2s",
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  borderRadius: 16,
  border: "none",
  fontFamily: HP_FONT,
  fontWeight: 800,
  fontSize: 16,
  transition: "all 0.2s",
  marginTop: 8
};
