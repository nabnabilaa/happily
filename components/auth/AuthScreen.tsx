"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

interface AuthScreenProps {
  onLogin: (userData: any) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "DUMMY_CLIENT_ID.apps.googleusercontent.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        onLogin(data.user);
      } else {
        setError(data.error || "Terjadi kesalahan login Google");
      }
    } catch (err) {
      setError("Koneksi gagal saat login Google");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Gagal masuk dengan Google");
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
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
            Welcome Back
          </h1>
          <p style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, marginBottom: 32 }}>
            Masuk menggunakan akun Maxy LMS Anda.
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
              {loading ? "Processing..." : "Login"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: HP_TOKENS.line }}></div>
            <div style={{ fontSize: 13, color: HP_TOKENS.inkMute, fontWeight: 600 }}>OR</div>
            <div style={{ flex: 1, height: 1, background: HP_TOKENS.line }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              width="400"
              text="signin_with"
              shape="pill"
            />
          </div>

          <div style={{ marginTop: 32 }}>
            <a
              href="http://localhost/laravel-maxy-backendv2/public/laravel-maxy-frontendv2/register"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: HP_TOKENS.ink,
                fontFamily: HP_FONT,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Belum punya akun? Daftar di LMS Maxy
            </a>
          </div>

          <div style={{ marginTop: 24, ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
            Login terintegrasi dengan LMS Maxy Academy.
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
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
};
