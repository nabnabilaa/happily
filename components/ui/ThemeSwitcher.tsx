"use client";

import React, { useEffect, useState } from "react";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect theme on mount
    const savedTheme = localStorage.getItem("hp-theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = savedTheme || systemTheme;
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
        borderRadius: "50%",
        border: `1.5px solid ${isDark ? "rgba(223, 184, 117, 0.25)" : "var(--hp-line)"}`,
        background: isDark ? "rgba(16, 22, 42, 0.65)" : "var(--hp-card)",
        color: "var(--hp-yellow)",
        boxShadow: isDark
          ? "0 0 12px rgba(255, 215, 0, 0.15), 0 2px 10px rgba(26,29,35,0.2)"
          : "0 2px 10px rgba(26,29,35,0.06)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isDark ? "translateY(14.5px)" : "translateY(-14.5px)",
        }}
      >
        {/* Sun Icon (Light Mode active icon) */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: isDark ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>

        {/* Moon Icon (Dark Mode active icon) */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: isDark ? "rotate(0deg)" : "rotate(90deg)",
          }}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </div>
    </button>
  );
}

