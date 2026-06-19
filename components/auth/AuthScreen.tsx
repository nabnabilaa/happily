"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import Link from "next/link";

// Intercept and suppress Google Sign-In / FedCM AbortErrors immediately on module load
if (typeof window !== "undefined") {
  const methods: (keyof Console)[] = ["error", "warn", "log", "info", "debug"];
  methods.forEach((method) => {
    const original = console[method] as Function;
    if (typeof original === "function") {
      (console as any)[method] = (...args: any[]) => {
        const isGsiAbortError = args.some((arg) => {
          if (typeof arg === "string") {
            return arg.includes("[GSI_LOGGER]") || arg.includes("AbortError");
          }
          if (arg && typeof arg === "object" && "message" in arg) {
            const msg = (arg as any).message;
            return typeof msg === "string" && (msg.includes("[GSI_LOGGER]") || msg.includes("AbortError"));
          }
          return false;
        });

        if (isGsiAbortError) return;
        original.apply(console, args);
      };
    }
  });

  // Prevent GSI AbortError unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = reason?.message || (typeof reason === "string" ? reason : "");
    if (msg.includes("[GSI_LOGGER]") || msg.includes("AbortError")) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Catch generic window errors related to GSI
  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (msg.includes("[GSI_LOGGER]") || msg.includes("AbortError")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

interface AuthScreenProps {
  onLogin: (userData: any) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "DUMMY_CLIENT_ID.apps.googleusercontent.com";

  // Cancel any pending Google FedCM / One Tap requests when this component unmounts
  useEffect(() => {
    return () => {
      try {
        const g = (window as any).google;
        if (g?.accounts?.id) {
          g.accounts.id.cancel();
          g.accounts.id.disableAutoSelect();
        }
      } catch (_) { /* GSI not loaded — safe to ignore */ }
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Format email tidak valid");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rememberMe }),
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
        height: "100dvh",
        width: "100%",
        overflowY: "auto",
        background: "#F4F7F9",
        fontFamily: HP_FONT,
      }}>
        <div style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4vh 24px",
        }}>
          <div className="hp-auth-wrapper" style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            width: "100%",
            maxWidth: 960,
            background: `linear-gradient(160deg, ${HP_TOKENS.primaryWash} 0%, ${HP_TOKENS.primarySoft} 100%)`,
            borderRadius: 32,
            boxShadow: "0 20px 60px rgba(59, 130, 246, 0.15)",
            overflow: "hidden",
            position: "relative"
          }}>
          {/* LEFT SIDE: Hero */}
          <div className="hp-auth-hero" style={{
            flex: "1 1 400px",
            padding: "48px 40px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 1,
            overflow: "hidden"
          }}>
            {/* Background Image Optimized */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 1 }}>
              <Image src="/bg-login.png" alt="Background" fill style={{ objectFit: 'cover', objectPosition: 'center bottom' }} priority quality={90} />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontFamily: HP_FONT_DISPLAY, fontSize: 36, fontWeight: 700, color: HP_TOKENS.ink, letterSpacing: -1,
              }}>
                Flow<span style={{ color: HP_TOKENS.primary }}>buddy</span><span style={{ fontSize: 16, fontWeight: 800, color: HP_TOKENS.inkMute, marginLeft: 6 }}>by Maxy</span> ✨
              </div>
              <div style={{ fontSize: 13, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 4, letterSpacing: 0.5 }}>
                Flowbuddy by Maxy — Kerja Lebih Cerdas
              </div>

              <div style={{ marginTop: 60 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: HP_TOKENS.ink, margin: 0 }}>Selamat datang kembali!</h1>
                <div style={{ width: 40, height: 4, background: HP_TOKENS.primary, borderRadius: 2, marginTop: 12, marginBottom: 16 }} />
                <p style={{ fontSize: 15, color: HP_TOKENS.inkMute, lineHeight: 1.6, fontWeight: 500 }}>
                  Masuk ke akunmu dan lanjutkan<br/>perjalanan produktifmu bersama Flowbuddy ✨
                </p>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 200, zIndex: 1 }}>
              {/* Mascot */}
              <div style={{ animation: 'hpFloat 3s ease-in-out infinite', zIndex: 2, marginTop: 20 }}>
                <BeeMascot mood="happy" size={140} showSpeech="" />
              </div>
            </div>

            {/* Install App small widget */}
            <div 
              onClick={() => {
                const btn = document.getElementById('install-button');
                if (btn) btn.click();
              }}
              className="hp-tap"
              style={{
                display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.6)",
                padding: "12px 16px", borderRadius: 16, width: "max-content", marginTop: 20, position: 'relative', zIndex: 1,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: 32, height: 32, background: "#111", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                N
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.primary }}>Install App</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: HP_TOKENS.inkMute }}>Nikmati pengalaman<br/>Flowbuddy di desktop</div>
              </div>
              <HPGlyph name="download" size={16} color={HP_TOKENS.primary} />
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            .hp-install-btn { display: none !important; }
            .hp-link { transition: all 0.2s ease; }
            .hp-link:hover { text-decoration: underline !important; filter: brightness(0.9); }
            .hp-btn-hover { transition: all 0.2s ease; }
            .hp-btn-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(59,130,246,0.4) !important; filter: brightness(1.05); }
            .hp-google-btn-wrapper { transition: all 0.2s ease; }
            .hp-google-btn-wrapper:hover { transform: translateY(-2px); }
            .hp-spin { animation: spin 1.5s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
            @media (max-width: 768px) {
              .hp-auth-wrapper {
                background: transparent !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .hp-auth-form-wrapper {
                padding: 0 !important;
              }
              .hp-auth-form-card {
                border-radius: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
                padding-top: 6vh !important;
              }
            }
          ` }} />

          {/* RIGHT SIDE: Form Card */}
          <div className="hp-auth-form-wrapper" style={{
            flex: "1 1 300px",
            padding: "clamp(16px, 5vw, 32px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            boxSizing: "border-box",
            width: "100%",
          }}>
            <div className="hp-auth-form-card" style={{
              background: "#fff",
              width: "100%",
              maxWidth: 400,
              borderRadius: 24,
              padding: "clamp(24px, 5vw, 40px) clamp(20px, 5vw, 32px)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxSizing: "border-box",
            }}>
              <div style={{ marginBottom: 16 }}>
              </div>
              
              <h2 style={{ fontSize: 20, fontWeight: 800, color: HP_TOKENS.ink, marginBottom: 32 }}>
                Masuk ke akun kamu
              </h2>

              <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
                {error && (
                  <div style={{ padding: "12px", borderRadius: 12, background: "#FFF0F0", color: "#F44", fontWeight: 700, textAlign: "center", fontSize: 13 }}>
                    {error}
                  </div>
                )}
                
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft }}>
                    <HPGlyph name="mail" size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{ ...inputStyle, paddingLeft: 46, textAlign: "left" }}
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
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    style={{ ...inputStyle, paddingLeft: 46, textAlign: "left" }}
                  />
                  <div 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft, cursor: "pointer", opacity: showPassword ? 0.6 : 1 }}
                  >
                    <HPGlyph name="eye" size={18} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: HP_TOKENS.inkMute, marginTop: 4, marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      style={{ accentColor: HP_TOKENS.primary, width: 16, height: 16 }} 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                    Ingat saya
                  </label>
                  <Link href="/forgot-password" className="hp-link" style={{ color: HP_TOKENS.primary, textDecoration: "none" }}>Lupa password?</Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={loading ? "" : "hp-btn-hover"}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 100, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                    background: loading ? HP_TOKENS.lineSoft : `linear-gradient(135deg, ${HP_TOKENS.primary}, #60A5FA)`,
                    color: loading ? HP_TOKENS.inkMute : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : `0 8px 24px rgba(59,130,246,0.3)`, transition: 'all 0.2s',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                  }}
                >
                  {loading ? (
                    <>
                      <div className="hp-spin" style={{ display: 'flex', alignItems: 'center' }}>🚀</div> Memproses...
                    </>
                  ) : "Login 🚀"}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, marginBottom: 24, width: "100%" }}>
                <div style={{ flex: 1, height: 1, background: HP_TOKENS.line }} />
                <div style={{ fontSize: 10, color: HP_TOKENS.inkMute, fontWeight: 700, letterSpacing: 1 }}>ATAU</div>
                <div style={{ flex: 1, height: 1, background: HP_TOKENS.line }} />
              </div>

              <div className="hp-google-btn-wrapper" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={process.env.NODE_ENV !== "development"}
                  auto_select={false}
                  cancel_on_tap_outside={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="pill"
                />
              </div>

              <div style={{ marginTop: 32, fontSize: 14, color: HP_TOKENS.inkSoft, fontWeight: 500, textAlign: "center" }}>
                Belum punya akun? <Link href="/register" className="hp-link" style={{ color: HP_TOKENS.primary, fontWeight: 700, textDecoration: "none" }}>Daftar di sini</Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}


const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px 22px",
  borderRadius: 100,
  border: `2px solid ${HP_TOKENS.line}`,
  fontFamily: "var(--hp-font)",
  fontSize: 16,
  fontWeight: 600,
  color: "var(--hp-ink)",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  background: "var(--hp-card)",
  textAlign: "center",
  boxShadow: 'inset 0 2px 6px rgba(26,29,35,0.02)'
};
