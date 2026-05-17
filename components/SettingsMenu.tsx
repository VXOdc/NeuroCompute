"use client";

import { useTheme } from "next-themes";
import { useState, useRef, useEffect, useCallback } from "react";

// Icons as inline SVGs — no external dependency needed
function GearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="7.5" r="2" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.6 2.6l1.1 1.1M11.3 11.3l1.1 1.1M11.3 3.7l-1.1 1.1M3.8 11.3l-1.1 1.1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // useTheme is safe here — next-themes handles SSR via suppressHydrationWarning
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  const select = useCallback(
    (value: string) => {
      setTheme(value);
      setOpen(false);
    },
    [setTheme]
  );

  const options: { value: string; label: string }[] = [
    { value: "system", label: "System" },
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open settings"
        aria-expanded={open}
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-md)",
          background: open ? "var(--bg-subtle)" : "var(--bg-elevated)",
          border: "1px solid",
          borderColor: open ? "var(--border-default)" : "var(--border-subtle)",
          color: open ? "var(--text-primary)" : "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all var(--transition-fast)",
          flexShrink: 0,
        }}
      >
        <GearIcon />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-2)",
            width: 188,
            boxShadow: "var(--shadow-lg)",
            zIndex: 200,
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "var(--space-2) var(--space-3)",
              marginBottom: "var(--space-1)",
            }}
          >
            Appearance
          </div>

          {options.map((opt) => {
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                role="menuitem"
                onClick={() => select(opt.value)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  border: "1px solid",
                  borderColor: isActive
                    ? "var(--border-subtle)"
                    : "transparent",
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all var(--transition-fast)",
                  marginBottom: "var(--space-1)",
                }}
              >
                <span>{opt.label}</span>
                {/* Show active checkmark OR resolved theme indicator for System */}
                {isActive && (
                  <span style={{ color: "var(--accent-blue)" }}>
                    <CheckIcon />
                  </span>
                )}
                {opt.value === "system" && !isActive && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {resolvedTheme ?? "—"}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider + hint */}
          <div
            style={{
              marginTop: "var(--space-2)",
              paddingTop: "var(--space-2)",
              borderTop: "1px solid var(--border-subtle)",
              padding: "var(--space-2) var(--space-3) var(--space-1)",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
              letterSpacing: "0.02em",
            }}
          >
            System follows OS preference
          </div>
        </div>
      )}
    </div>
  );
}
