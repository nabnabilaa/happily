"use client";

import React, { useEffect, useState, useRef } from "react";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS } from "@/lib/constants";

export interface FontOption {
  id: string;
  name: string;
  subtitle: string;
  cssFamily: string;
  badge?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "nunito", name: "Nunito", subtitle: "Rounded & Friendly", cssFamily: "var(--font-nunito), sans-serif", badge: "Default" },
  { id: "manrope", name: "Manrope", subtitle: "Modern Geometric", cssFamily: "var(--font-manrope), sans-serif" },
  { id: "inter", name: "Inter", subtitle: "Clean Tech Standard", cssFamily: "var(--font-inter), sans-serif" },
  { id: "feather", name: "Feather Bold", subtitle: "Duolingo-style Bold", cssFamily: "'Feather', var(--font-nunito), sans-serif" },
  { id: "baloo2", name: "Baloo 2", subtitle: "Playful & Bold", cssFamily: "var(--font-baloo2), sans-serif" },
  { id: "fredoka", name: "Fredoka", subtitle: "Soft Curved Display", cssFamily: "var(--font-fredoka), sans-serif" },
  { id: "poppins", name: "Poppins ExtraBold", subtitle: "Geometric & Crisp", cssFamily: "var(--font-poppins), sans-serif" },
];

export default function FontSelector() {
  const [currentFont, setCurrentFont] = useState<string>("nunito");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedFont = localStorage.getItem("hp-font") || "nunito";
    setCurrentFont(savedFont);
    document.documentElement.setAttribute("data-font", savedFont);

    const handleFontChange = (e: any) => {
      if (e.detail?.font) {
        setCurrentFont(e.detail.font);
      }
    };
    window.addEventListener("hp_font_change", handleFontChange);
    return () => window.removeEventListener("hp_font_change", handleFontChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectFont = (fontId: string) => {
    setCurrentFont(fontId);
    localStorage.setItem("hp-font", fontId);
    document.documentElement.setAttribute("data-font", fontId);
    window.dispatchEvent(new CustomEvent("hp_font_change", { detail: { font: fontId } }));
    setIsOpen(false);
  };

  const activeOption = FONT_OPTIONS.find((f) => f.id === currentFont) || FONT_OPTIONS[0];

  return (
    // Fills whatever it is dropped into. In the sidebar footer it shares a row
    // with the 38px theme toggle, and an inline-block trigger left a dead gap
    // between the two instead of one aligned pair.
    <div ref={dropdownRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hp-tap"
        id="font-selector-btn"
        aria-label="Pilih Font Aplikasi"
        aria-expanded={isOpen}
        title="Pilih Font Aplikasi"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "0 10px",
          height: 38,
          borderRadius: "var(--hp-radius-pill)",
          border: "1px solid var(--hp-border)",
          background: "var(--hp-card)",
          color: "var(--hp-ink)",
          cursor: "pointer",
          transition: "border-color 180ms var(--hp-ease)",
          outline: "none",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: HP_TOKENS.radiusSm,
            background: "var(--hp-primary-soft)",
            color: "var(--hp-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: activeOption.cssFamily,
          }}
        >
          Aa
        </div>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--hp-ink)",
            fontFamily: activeOption.cssFamily,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activeOption.name}
        </span>
        {/* The glyph map keys this as "chevron-down"; "chevron_down" fell
            through to HPGlyph's unknown-icon fallback, which is why a faded
            info circle sat in the sidebar instead of a chevron. */}
        <HPGlyph name="chevron-down" size={14} color="var(--hp-ink-mute)" />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            width: 240,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--hp-card)",
            borderRadius: HP_TOKENS.radius,
            border: "1.5px solid var(--hp-border)",
            padding: 8,
            zIndex: 9999,
            animation: "hp-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div
            style={{
              padding: "6px 10px 8px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--hp-ink-mute)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              borderBottom: "1px solid var(--hp-line-soft)",
              marginBottom: 4,
            }}
          >
            Pilih Font Aplikasi
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {FONT_OPTIONS.map((opt) => {
              const isSelected = opt.id === currentFont;
              return (
                <button
                  key={opt.id}
                  onClick={() => selectFont(opt.id)}
                  className="hp-tap"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: HP_TOKENS.radiusSm,
                    border: "none",
                    background: isSelected ? "var(--hp-primary-soft)" : "transparent",
                    color: isSelected ? "var(--hp-primary)" : "var(--hp-ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontFamily: opt.cssFamily,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {opt.name}
                      </span>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--hp-primary)",
                            color: "#fff",
                            textTransform: "uppercase",
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isSelected ? "var(--hp-primary)" : "var(--hp-ink-mute)",
                        marginTop: 1,
                      }}
                    >
                      {opt.subtitle}
                    </span>
                  </div>

                  {isSelected && <HPGlyph name="check" size={16} color="var(--hp-primary)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
