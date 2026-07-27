"use client";

import React, { useEffect, useState } from "react";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect theme on mount, defaulting to light instead of system preference
    const savedTheme = localStorage.getItem("hp-theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("hp-theme", nextTheme);

    // Broadcast custom event so that focusbuddy or other scripts can catch it instantly
    window.dispatchEvent(new CustomEvent("hp_theme_change", { detail: { theme: nextTheme } }));

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="hp-theme-toggle hp-tap"
      id="theme-switcher-btn"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        // `--hp-inkMute` is not a token — the real name is `--hp-ink-mute`, so
        // the colour was invalid and the icon fell back to inherited ink. The
        // glow and the tinted rgba fills went with it: this is chrome, and
        // chrome takes tokens.
        borderRadius: "var(--hp-radius-pill)",
        border: "1px solid var(--hp-border)",
        background: "var(--hp-card)",
        color: isDark ? "var(--hp-yellow-dark)" : "var(--hp-ink-mute)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "color 220ms var(--hp-ease), border-color 220ms var(--hp-ease)",
      }}
    >
      {/*
        Was a two-icon column translated by ±19px inside an `overflow: hidden`
        button. The column is 58px tall in a 38px button, so the maths landed
        the *moon* in the window during light mode and clipped it — the sidebar
        showed a cropped crescent that read as a stray swoosh. One icon for the
        mode you are in, no clipping, no sliding.
      */}
      {mounted && (isDark ? (
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ))}
    </button>
  );
}

