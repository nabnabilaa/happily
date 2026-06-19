"use client";

import React, { useState, useEffect, Suspense } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!email || !token) {
      setError("Link tidak valid. Pastikan Anda membuka link dari email secara utuh.");
    }
  }, [email, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) return;

    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || "Password berhasil diubah!");
        setTimeout(() => {
          router.push("/");
        }, 3000);
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
        .hp-btn-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(59,130,246,0.4) !important; filter: brightness(1.05); }
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
          boxShadow: "0 20px 60px rgba(59, 130, 246, 0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1
        }}>
          <div style={{ marginBottom: 24, width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${HP_TOKENS.primary}20, ${HP_TOKENS.primary}40)`, display: "flex", alignItems: "center", justifyContent: "center", color: HP_TOKENS.primary }}>
            <HPGlyph name="lock" size={32} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: HP_TOKENS.ink, marginBottom: 8, fontFamily: HP_FONT_DISPLAY, textAlign: "center" }}>
            Buat Password Baru
          </h2>
          <p style={{ fontSize: 14, color: HP_TOKENS.inkMute, fontWeight: 500, textAlign: "center", marginBottom: 32, lineHeight: 1.6 }}>
            Masukkan password baru Anda di bawah ini untuk akun {email || ""}.
          </p>

          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            {error && (
              <div style={{ padding: "12px", borderRadius: 12, background: "#FFF0F0", color: "#F44", fontWeight: 700, textAlign: "center", fontSize: 13 }}>
                {error}
              </div>
            )}
            
            {success ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ padding: "16px", width: "100%", borderRadius: 16, background: "#E8F5E9", color: "#2E7D32", fontWeight: 600, textAlign: "center", fontSize: 14, marginBottom: 24, border: "1px solid #C8E6C9" }}>
                  {success}
                </div>
                <Link href="/" className="hp-btn-hover" style={{
                  width: '100%', padding: '16px', borderRadius: 100, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                  background: HP_TOKENS.card, color: HP_TOKENS.ink, cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
                  boxShadow: `inset 0 0 0 2px ${HP_TOKENS.line}`, display: 'block'
                }}>
                  Ke Halaman Login
                </Link>
              </div>
            ) : (
              <>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft }}>
                    <HPGlyph name="lock" size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password Baru"
                    required
                    disabled={!email || !token}
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

                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: HP_TOKENS.inkSoft }}>
                    <HPGlyph name="check-circle" size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Konfirmasi Password Baru"
                    required
                    disabled={!email || !token}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: "100%", padding: "16px 46px", borderRadius: 100, border: `2px solid ${HP_TOKENS.line}`,
                      fontFamily: "var(--hp-font)", fontSize: 16, fontWeight: 600, color: "var(--hp-ink)", outline: "none",
                      transition: "border-color 0.2s", background: "var(--hp-card)", boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = HP_TOKENS.primary}
                    onBlur={(e) => e.target.style.borderColor = HP_TOKENS.line}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !token}
                  className={loading || !email || !token ? "" : "hp-btn-hover"}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 100, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                    background: loading || !email || !token ? HP_TOKENS.lineSoft : `linear-gradient(135deg, ${HP_TOKENS.primary}, #60A5FA)`,
                    color: loading || !email || !token ? HP_TOKENS.inkMute : '#fff', cursor: loading || !email || !token ? 'not-allowed' : 'pointer',
                    boxShadow: loading || !email || !token ? 'none' : `0 8px 24px rgba(59,130,246,0.3)`, transition: 'all 0.2s',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8
                  }}
                >
                  {loading ? (
                    <>
                      <div className="hp-spin" style={{ display: 'flex', alignItems: 'center' }}>🔄</div> Menyimpan...
                    </>
                  ) : "Simpan Password Baru"}
                </button>
              </>
            )}
            
            <div style={{ marginTop: 24, fontSize: 14, color: HP_TOKENS.inkSoft, fontWeight: 500, textAlign: "center" }}>
              <Link href="/" className="hp-link" style={{ color: HP_TOKENS.inkSoft, fontWeight: 600, textDecoration: "none" }}>
                Batal dan kembali ke Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F7F9" }}>
        Loading...
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
