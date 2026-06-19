"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Format email tidak valid");
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || "Registrasi berhasil! Mengalihkan ke login...");
        setTimeout(() => {
          router.push("/");
        }, 2000);
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
      height: "100dvh",
      width: "100%",
      overflowY: "auto",
      background: "#F4F7F9",
      fontFamily: HP_FONT,
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .hp-link { transition: all 0.2s ease; }
        .hp-link:hover { text-decoration: underline !important; filter: brightness(0.9); }
        .hp-btn-hover { transition: all 0.2s ease; }
        .hp-btn-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(255,107,53,0.4) !important; filter: brightness(1.05); }
        .hp-spin { animation: spin 1.5s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      ` }} />
      <div style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4vh 24px",
        position: "relative"
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.5 }}>
          <Image src="/bg-login.png" alt="Background" fill style={{ objectFit: 'cover', objectPosition: 'center bottom' }} priority quality={90} />
        </div>

        <div style={{
          background: "#fff",
          width: "100%",
          maxWidth: 440,
          borderRadius: 24,
          padding: "clamp(32px, 5vw, 48px)",
          boxShadow: "0 20px 60px rgba(255, 107, 53, 0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: HP_TOKENS.ink, marginBottom: 8, fontFamily: HP_FONT_DISPLAY, textAlign: "center" }}>
            Buat Akun Baru
          </h2>
          <p style={{ fontSize: 14, color: HP_TOKENS.inkMute, fontWeight: 500, textAlign: "center", marginBottom: 32 }}>
            Bergabunglah dan tingkatkan produktivitas tim Anda.
          </p>

          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            {error && (
              <div style={{ padding: "12px", borderRadius: 12, background: "#FFF0F0", color: "#F44", fontWeight: 700, textAlign: "center", fontSize: 13 }}>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{ padding: "12px", borderRadius: 12, background: "#E8F5E9", color: "#2E7D32", fontWeight: 700, textAlign: "center", fontSize: 13 }}>
                {success}
              </div>
            )}

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft }}>
                <HPGlyph name="user" size={18} />
              </div>
              <input
                type="text"
                placeholder="Nama Lengkap"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%", padding: "16px 22px 16px 46px", borderRadius: 100, border: `2px solid ${HP_TOKENS.line}`,
                  fontFamily: "var(--hp-font)", fontSize: 16, fontWeight: 600, color: "var(--hp-ink)", outline: "none",
                  transition: "border-color 0.2s", background: "var(--hp-card)", boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = HP_TOKENS.primary}
                onBlur={(e) => e.target.style.borderColor = HP_TOKENS.line}
              />
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft }}>
                <HPGlyph name="mail" size={18} />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%", padding: "16px 22px 16px 46px", borderRadius: 100, border: `2px solid ${HP_TOKENS.line}`,
                  fontFamily: "var(--hp-font)", fontSize: 16, fontWeight: 600, color: "var(--hp-ink)", outline: "none",
                  transition: "border-color 0.2s", background: "var(--hp-card)", boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = HP_TOKENS.primary}
                onBlur={(e) => e.target.style.borderColor = HP_TOKENS.line}
              />
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft }}>
                <HPGlyph name="lock" size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%", padding: "16px 46px", borderRadius: 100, border: `2px solid ${HP_TOKENS.line}`,
                  fontFamily: "var(--hp-font)", fontSize: 16, fontWeight: 600, color: "var(--hp-ink)", outline: "none",
                  transition: "border-color 0.2s", background: "var(--hp-card)", boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = HP_TOKENS.primary}
                onBlur={(e) => e.target.style.borderColor = HP_TOKENS.line}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", 
                  background: "none", border: "none", cursor: "pointer", color: HP_TOKENS.inkSoft, padding: 4 
                }}
              >
                <HPGlyph name={showPassword ? "eye-off" : "eye"} size={18} />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className={loading || !!success ? "" : "hp-btn-hover"}
              style={{
                width: '100%', padding: '16px', borderRadius: 100, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                background: loading || !!success ? HP_TOKENS.lineSoft : `linear-gradient(135deg, ${HP_TOKENS.primary}, #FF8C00)`,
                color: loading || !!success ? HP_TOKENS.inkMute : '#fff', cursor: loading || !!success ? 'not-allowed' : 'pointer',
                boxShadow: loading || !!success ? 'none' : `0 8px 24px rgba(255,107,53,0.3)`, transition: 'all 0.2s',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8
              }}
            >
              {loading ? (
                <>
                  <div className="hp-spin" style={{ display: 'flex', alignItems: 'center' }}>🔄</div> Mendaftar...
                </>
              ) : "Daftar Akun Baru"}
            </button>
            
            <div style={{ marginTop: 24, fontSize: 14, color: HP_TOKENS.inkSoft, fontWeight: 500, textAlign: "center" }}>
              Sudah punya akun?{" "}
              <Link href="/" className="hp-link" style={{ color: HP_TOKENS.primary, fontWeight: 700, textDecoration: "none" }}>
                Login di sini
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
