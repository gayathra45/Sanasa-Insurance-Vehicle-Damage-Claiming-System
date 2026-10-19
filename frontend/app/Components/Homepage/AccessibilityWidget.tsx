"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────
   State
───────────────────────────────────────────────────────────── */
interface A11yState {
  textSize: 0 | 1 | 2 | 3;
  highContrast: boolean;
  grayscale: boolean;
  readingGuide: boolean;
  reduceMotion: boolean;
  brightness: number;        // 60 – 140
  darkMode: boolean;
}

const DEFAULT: A11yState = {
  textSize: 0,
  highContrast: false,
  grayscale: false,
  readingGuide: false,
  reduceMotion: false,
  brightness: 100,
  darkMode: false,
};

const STORAGE_KEY = "sanasa_a11y_v3";
const TEXT_SCALES  = ["100%", "115%", "130%", "150%"];
const TEXT_VALUES  = [1, 1.15, 1.3, 1.5];

/* ─────────────────────────────────────────────────────────────
   Apply state to DOM
───────────────────────────────────────────────────────────── */
function applyState(s: A11yState) {
  const root = document.documentElement;

  // Text size
  root.style.fontSize = s.textSize === 0 ? "" : `${TEXT_VALUES[s.textSize] * 100}%`;

  // Build combined filter string
  const filters: string[] = [];
  if (s.brightness !== 100) filters.push(`brightness(${s.brightness / 100})`);
  if (s.highContrast)       filters.push("contrast(1.45)");
  if (s.grayscale)          filters.push("grayscale(1)");
  root.style.filter = filters.length ? filters.join(" ") : "";

  // Reduce motion
  root.classList.toggle("a11y-no-motion", s.reduceMotion);

  // Dark mode
  root.classList.toggle("a11y-dark", s.darkMode);
}

function loadState(): A11yState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/* ─────────────────────────────────────────────────────────────
   Reading Guide
───────────────────────────────────────────────────────────── */
function ReadingGuide({ active }: { active: boolean }) {
  const [y, setY] = useState(-200);
  useEffect(() => {
    if (!active) return;
    const fn = (e: MouseEvent) => setY(e.clientY);
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, [active]);
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0, right: 0,
        top: y - 16,
        height: 32,
        pointerEvents: "none",
        zIndex: 9997,
        background: "rgba(2,132,199,0.13)",
        borderTop: "2px solid rgba(2,132,199,0.45)",
        borderBottom: "2px solid rgba(2,132,199,0.45)",
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   Toggle Tile
───────────────────────────────────────────────────────────── */
function Tile({
  id, icon, label, active, onClick,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "14px 8px 10px",
        borderRadius: 14,
        border: `2px solid ${active ? "#0284c7" : "#e2e8f0"}`,
        background: active ? "#e0f2fe" : "#f8fafc",
        cursor: "pointer",
        width: "100%",
        transition: "all 0.15s",
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          background: active ? "#0284c7" : "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#0c4a6e" : "#475569", textAlign: "center", lineHeight: 1.3 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: active ? "#0284c7" : "#94a3b8",
          background: active ? "#bae6fd" : "#f1f5f9",
          borderRadius: 999,
          padding: "2px 10px",
        }}
      >
        {active ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main widget
───────────────────────────────────────────────────────────── */
export default function AccessibilityWidget() {
  const [open, setOpen]   = useState(false);
  const [state, setState] = useState<A11yState>(DEFAULT);
  const panelRef          = useRef<HTMLDivElement>(null);

  // Mount
  useEffect(() => {
    const s = loadState();
    setState(s);
    applyState(s);
  }, []);

  // Apply & save on change
  useEffect(() => {
    applyState(state);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open]);

  const toggle = useCallback((key: keyof A11yState) => {
    setState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetAll = () => {
    setState(DEFAULT);
    applyState(DEFAULT);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  };

  const anyActive =
    state.textSize !== 0 ||
    state.highContrast ||
    state.grayscale ||
    state.readingGuide ||
    state.reduceMotion ||
    state.brightness !== 100 ||
    state.darkMode;

  const activeCount = [
    state.textSize !== 0,
    state.highContrast,
    state.grayscale,
    state.readingGuide,
    state.reduceMotion,
    state.brightness !== 100,
    state.darkMode,
  ].filter(Boolean).length;

  // Icon colours
  const ic = (active: boolean) => active ? "white" : "#94a3b8";

  return (
    <>
      {/* ── Global CSS ── */}
      <style>{`
        /* Reduce Motion */
        .a11y-no-motion *, .a11y-no-motion *::before, .a11y-no-motion *::after {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }

        /* Dark mode overlay */
        .a11y-dark body {
          background: #0f172a !important;
          color: #e2e8f0 !important;
        }
        .a11y-dark nav,
        .a11y-dark header,
        .a11y-dark footer,
        .a11y-dark section,
        .a11y-dark main,
        .a11y-dark div:not([id^="a11y"]) {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .a11y-dark img { opacity: 0.88; }
        .a11y-dark a { color: #38bdf8 !important; }
        .a11y-dark button:not([id^="a11y"]) {
          background-color: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }

        /* Brightness slider thumb */
        .a11y-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(to right, #0284c7 var(--pct, 50%), #e2e8f0 var(--pct, 50%));
          outline: none;
          cursor: pointer;
        }
        .a11y-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0284c7;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(2,132,199,0.4);
          border: 2px solid white;
        }
        .a11y-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0284c7;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(2,132,199,0.4);
          border: 2px solid white;
        }
      `}</style>

      <ReadingGuide active={state.readingGuide} />

      {/* ── Zero-size anchor ── */}
      <div ref={panelRef} style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, zIndex: 9998 }}>

        {/* ── Floating tab button ── */}
        <button
          id="a11y-open-btn"
          aria-label={open ? "Close Accessibility Options" : "Open Accessibility Options"}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          style={{
            position: "fixed",
            right: open ? 340 : 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 46,
            minHeight: 110,
            background: "#0284c7",
            borderRadius: "12px 0 0 12px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "16px 0",
            boxShadow: "-4px 0 20px rgba(2,132,199,0.35)",
            transition: "right 0.3s cubic-bezier(0.4,0,0.2,1), background 0.2s",
            zIndex: 9999,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#0369a1"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#0284c7"; }}
        >
          {/* Universal access person icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="4.5" r="2.5" fill="white" />
            <path d="M5 11c0-3.5 3-5 7-5s7 1.5 7 5v1H5v-1z" fill="white" fillOpacity="0.9" />
            <path d="M9.5 12.5v7h5v-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>

          {/* Active count badge */}
          {anyActive && (
            <span style={{
              background: "#dcfce7",
              color: "#15803d",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 999,
              minWidth: 18,
              textAlign: "center",
            }}>
              {activeCount}
            </span>
          )}

          {/* Vertical label */}
          <span style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 9,
            fontWeight: 700,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            letterSpacing: 2,
            marginTop: 2,
          }}>
            ACCESS
          </span>
        </button>

        {/* ── Slide-in panel ── */}
        <div
          id="a11y-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Accessibility Options"
          style={{
            position: "fixed",
            top: 0, right: 0,
            width: 340,
            height: "100dvh",
            background: "#ffffff",
            boxShadow: "-6px 0 40px rgba(0,0,0,0.12)",
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
          }}
        >
          {/* ── Header ── */}
          <div style={{
            background: "#0284c7",
            padding: "18px 20px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                width: 40, height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="4.5" r="2.5" fill="white" />
                  <path d="M5 11c0-3.5 3-5 7-5s7 1.5 7 5v1H5v-1z" fill="white" fillOpacity="0.9" />
                  <path d="M9.5 12.5v7h5v-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <div>
                <h2 style={{ color: "white", fontWeight: 800, fontSize: 16, margin: 0, lineHeight: 1.2 }}>
                  Accessibility
                </h2>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "2px 0 0" }}>
                  Customize your experience
                </p>
              </div>
            </div>
            <button
              id="a11y-close-btn"
              aria-label="Close accessibility options"
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
                width: 36, height: 36, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* TEXT SIZE */}
            <div>
              <SectionLabel>Text Size</SectionLabel>
              <div style={{ display: "flex", gap: 8 }}>
                {TEXT_SCALES.map((label, i) => (
                  <button
                    key={label}
                    id={`a11y-text-${label}`}
                    onClick={() => setState(prev => ({ ...prev, textSize: i as 0|1|2|3 }))}
                    aria-pressed={state.textSize === i}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      border: `2px solid ${state.textSize === i ? "#0284c7" : "#e2e8f0"}`,
                      background: state.textSize === i ? "#e0f2fe" : "#f8fafc",
                      color: state.textSize === i ? "#0c4a6e" : "#64748b",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* BRIGHTNESS */}
            <div>
              <SectionLabel>Brightness</SectionLabel>
              <div style={{
                background: "#f8fafc",
                border: "2px solid #e2e8f0",
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                {/* Icon row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Sun icon */}
                    <span style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: state.brightness !== 100 ? "#fef3c7" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={state.brightness !== 100 ? "#d97706" : "#94a3b8"} strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Brightness</span>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    color: state.brightness !== 100 ? "#0284c7" : "#94a3b8",
                    background: state.brightness !== 100 ? "#e0f2fe" : "#f1f5f9",
                    padding: "3px 10px",
                    borderRadius: 999,
                  }}>
                    {state.brightness}%
                  </span>
                </div>

                {/* Slider */}
                <input
                  id="a11y-brightness-slider"
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={state.brightness}
                  onChange={e => setState(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="a11y-slider"
                  style={{ "--pct": `${((state.brightness - 50) / 100) * 100}%` } as React.CSSProperties}
                  aria-label="Adjust page brightness"
                />

                {/* Labels */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Dim</span>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Default</span>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Bright</span>
                </div>
              </div>
            </div>

            {/* VISUAL TILES */}
            <div>
              <SectionLabel>Display</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                {/* Dark / Light Mode */}
                <Tile
                  id="a11y-tile-darkmode"
                  active={state.darkMode}
                  onClick={() => toggle("darkMode")}
                  label={state.darkMode ? "Dark Mode" : "Light Mode"}
                  icon={
                    state.darkMode ? (
                      // Moon icon — dark mode active
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="white" />
                      </svg>
                    ) : (
                      // Sun icon — light mode
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ic(false)} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    )
                  }
                />

                {/* High Contrast */}
                <Tile
                  id="a11y-tile-contrast"
                  active={state.highContrast}
                  onClick={() => toggle("highContrast")}
                  label="High Contrast"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke={ic(state.highContrast)} strokeWidth="2" />
                      <path d="M12 3a9 9 0 010 18V3z" fill={ic(state.highContrast)} />
                    </svg>
                  }
                />

                {/* Grayscale */}
                <Tile
                  id="a11y-tile-grayscale"
                  active={state.grayscale}
                  onClick={() => toggle("grayscale")}
                  label="Grayscale"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="gs-grad" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="50%" stopColor={ic(state.grayscale)} />
                          <stop offset="50%" stopColor={state.grayscale ? "rgba(255,255,255,0.4)" : "#e2e8f0"} />
                        </linearGradient>
                      </defs>
                      <circle cx="12" cy="12" r="9" fill="url(#gs-grad)" stroke={ic(state.grayscale)} strokeWidth="1.5" />
                    </svg>
                  }
                />

                {/* Reading Guide */}
                <Tile
                  id="a11y-tile-reading"
                  active={state.readingGuide}
                  onClick={() => toggle("readingGuide")}
                  label="Reading Guide"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="2" rx="1" fill={ic(state.readingGuide)} />
                      <rect x="3" y="7"  width="14" height="2" rx="1" fill={state.readingGuide ? "rgba(255,255,255,0.5)" : "#cbd5e1"} />
                      <rect x="3" y="15" width="11" height="2" rx="1" fill={state.readingGuide ? "rgba(255,255,255,0.5)" : "#cbd5e1"} />
                    </svg>
                  }
                />

                {/* Reduce Motion */}
                <Tile
                  id="a11y-tile-motion"
                  active={state.reduceMotion}
                  onClick={() => toggle("reduceMotion")}
                  label="Reduce Motion"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" fill={ic(state.reduceMotion)} />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"
                        stroke={ic(state.reduceMotion)} strokeWidth="2" strokeLinecap="round" />
                      <path d="M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"
                        stroke={state.reduceMotion ? "rgba(255,255,255,0.55)" : "#cbd5e1"} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  }
                />

              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: "14px 16px",
            borderTop: "1px solid #f1f5f9",
            background: "#fafafa",
            flexShrink: 0,
          }}>
            {anyActive && (
              <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginBottom: 10 }}>
                <span style={{ color: "#0284c7", fontWeight: 700 }}>{activeCount} enhancement{activeCount !== 1 ? "s" : ""}</span> active
              </p>
            )}
            <button
              id="a11y-reset-btn"
              onClick={resetAll}
              disabled={!anyActive}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: anyActive ? "#0284c7" : "#e2e8f0",
                color: anyActive ? "white" : "#94a3b8",
                fontWeight: 700,
                fontSize: 14,
                cursor: anyActive ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => { if (anyActive) e.currentTarget.style.background = "#0369a1"; }}
              onMouseLeave={e => { if (anyActive) e.currentTarget.style.background = "#0284c7"; }}
            >
              ↺  Reset All Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
