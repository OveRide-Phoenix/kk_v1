"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-v2-playfair",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-v2-plus-jakarta",
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-auto rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all"
      style={{
        background: copied ? "#1b4332" : "rgba(0,0,0,0.06)",
        color: copied ? "#fff" : "#8D4925",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[#8D4925]/50">
      {children}
    </p>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="mb-10 mt-20 flex items-center gap-4">
      <div className="h-px flex-1 bg-[#8D4925]/10" />
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D4925]/40">
        {title}
      </span>
      <div className="h-px flex-1 bg-[#8D4925]/10" />
    </div>
  );
}

// ─── Color data ─────────────────────────────────────────────────────────────

const colorTokens = [
  {
    group: "Brand",
    colors: [
      {
        name: "Primary Brown",
        hex: "#8D4925",
        cssVar: "--primary",
        role: "CTAs, headings, highlights",
      },
      {
        name: "Dark Espresso",
        hex: "#3A2618",
        cssVar: "--foreground",
        role: "Body text, dark surfaces",
      },
      { name: "Forest Green", hex: "#1b4332", cssVar: "—", role: "Active badges, success accents" },
      { name: "Amber Gold", hex: "#ffc06a", cssVar: "—", role: "Warm highlights, footer accent" },
    ],
  },
  {
    group: "Backgrounds",
    colors: [
      { name: "Parchment", hex: "#fdfaf1", cssVar: "—", role: "App shell, nav, card surface" },
      { name: "Cream", hex: "#faf7f2", cssVar: "--background", role: "Page background" },
      { name: "Soft White", hex: "#fff8f2", cssVar: "--card", role: "Card backgrounds" },
      { name: "Modal Beige", hex: "#FDFAF1", cssVar: "—", role: "Modal / overlay background" },
    ],
  },
  {
    group: "Text",
    colors: [
      { name: "Dark Brown", hex: "#463028", cssVar: "--foreground", role: "Primary body text" },
      {
        name: "Medium Brown",
        hex: "#6B5344",
        cssVar: "--muted-foreground",
        role: "Secondary text",
      },
      { name: "Slate", hex: "#64748b", cssVar: "—", role: "Tertiary / helper text" },
      { name: "Gray 500", hex: "#6b7280", cssVar: "—", role: "Captions, placeholders" },
    ],
  },
  {
    group: "Semantic",
    colors: [
      {
        name: "Error Red",
        hex: "#dc2626",
        cssVar: "--destructive",
        role: "Errors, destructive actions",
      },
      { name: "Error Surface", hex: "#fef2f2", cssVar: "—", role: "Error banners background" },
      { name: "Success Surface", hex: "#f0fdf4", cssVar: "—", role: "Success banners background" },
      { name: "Warning Amber", hex: "#f59e0b", cssVar: "—", role: "Warnings, caution states" },
    ],
  },
  {
    group: "Dark Footer",
    colors: [
      { name: "Footer Base", hex: "#3A1A08", cssVar: "—", role: "Footer background" },
      { name: "Footer Text", hex: "#fdfaf1", cssVar: "—", role: "Footer headings" },
      {
        name: "Footer Muted",
        hex: "rgba(253,250,241,0.55)",
        cssVar: "—",
        role: "Footer body copy",
      },
      {
        name: "Footer Divider",
        hex: "rgba(255,255,255,0.08)",
        cssVar: "—",
        role: "Footer borders",
      },
    ],
  },
];

// ─── Typography data ─────────────────────────────────────────────────────────

const typeScale = [
  {
    label: "Display",
    size: "text-5xl",
    px: "48px",
    weight: "font-bold",
    sample: "Home-cooked meals",
    font: "playfair",
  },
  {
    label: "H1",
    size: "text-4xl",
    px: "36px",
    weight: "font-bold",
    sample: "Good Morning, Shashank!",
    font: "playfair",
  },
  {
    label: "H2",
    size: "text-3xl",
    px: "30px",
    weight: "font-bold",
    sample: "Today's Lunch Menu",
    font: "playfair",
  },
  {
    label: "H3",
    size: "text-2xl",
    px: "24px",
    weight: "font-bold",
    sample: "Order Summary",
    font: "playfair",
  },
  {
    label: "H4",
    size: "text-xl",
    px: "20px",
    weight: "font-bold",
    sample: "Delivery Details",
    font: "jakarta",
  },
  {
    label: "Body Large",
    size: "text-base",
    px: "16px",
    weight: "font-normal",
    sample: "Freshly prepared, authentic home-cooked meals delivered to your doorstep.",
    font: "jakarta",
  },
  {
    label: "Body",
    size: "text-sm",
    px: "13.5px",
    weight: "font-normal",
    sample: "Your healthy meals are ready for the day. Order before 10 AM for guaranteed delivery.",
    font: "jakarta",
  },
  {
    label: "Caption",
    size: "text-xs",
    px: "12px",
    weight: "font-medium",
    sample: "ORDER · TODAY · 2 ITEMS",
    font: "jakarta",
  },
  {
    label: "Overline",
    size: "text-xs",
    px: "12px",
    weight: "font-bold",
    sample: "TODAY'S BOOKING",
    font: "jakarta",
    extra: "uppercase tracking-widest",
  },
];

// ─── Icon data ───────────────────────────────────────────────────────────────

const iconNames = [
  "schedule",
  "receipt_long",
  "eco",
  "arrow_forward",
  "shopping_cart",
  "notifications",
  "logout",
  "restaurant",
  "home",
  "person",
  "calendar_today",
  "local_shipping",
  "check_circle",
  "error",
  "info",
  "close",
  "menu",
  "search",
  "favorite",
  "star",
  "payment",
  "location_on",
  "phone",
  "email",
  "edit",
  "delete",
  "add",
  "remove",
  "expand_more",
  "chevron_right",
];

// ─── Animation data ──────────────────────────────────────────────────────────

const animations = [
  {
    name: "animate-fade-in",
    description: "Opacity 0→1, 0.8s ease-in-out",
    usecase: "Page sections, modals appearing",
  },
  {
    name: "animate-slide-up",
    description: "translateY(30px)→0 + fade, 0.8s ease-out",
    usecase: "Cards, content blocks on scroll",
  },
  {
    name: "animate-slide-in-right",
    description: "translateX(50px)→0 + fade, 0.8s ease-out",
    usecase: "Sidebars, panels entering from right",
  },
  {
    name: "animate-slide-in-left",
    description: "translateX(-50px)→0 + fade, 0.8s ease-out",
    usecase: "Nav drawers, left-side panels",
  },
  {
    name: "animate-scale",
    description: "scale(0.9)→1 + fade, 0.5s ease-out",
    usecase: "Modals, dialogs, pop-ups",
  },
  {
    name: "hover-scale",
    description: "scale(1.05) on hover, 0.3s ease",
    usecase: "Product images, feature cards",
  },
  {
    name: "hover-lift",
    description: "translateY(-4px) + shadow-lg on hover",
    usecase: "Clickable cards, CTA blocks",
  },
];

// ─── Component previews ──────────────────────────────────────────────────────

const orderStatuses = [
  { status: "Confirmed", bg: "bg-green-100", text: "text-green-800" },
  { status: "Preparing", bg: "bg-orange-100", text: "text-orange-700" },
  { status: "Out for Delivery", bg: "bg-blue-100", text: "text-blue-700" },
  { status: "Delivered", bg: "bg-gray-100", text: "text-gray-600" },
  { status: "Cancelled", bg: "bg-red-100", text: "text-red-700" },
  { status: "Pending", bg: "bg-yellow-100", text: "text-yellow-700" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BrandKitPage() {
  const [activeTab, setActiveTab] = useState<"colors" | "type" | "components" | "icons" | "motion">(
    "colors",
  );

  // ── Presentation mode ──────────────────────────────────────────────────────
  const [presentMode, setPresentMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setSlideDir] = useState<"next" | "prev">("next");
  const TOTAL_SLIDES = 9;

  const slideBgs = [
    "#8D4925",
    "#fdfaf1",
    "#faf7f2",
    "#fdfaf1",
    "#faf7f2",
    "#fdfaf1",
    "#3A2618",
    "#faf7f2",
    "#8D4925",
  ];
  const slideDark = [true, false, false, false, false, false, true, false, true];
  const isDark = slideDark[currentSlide];

  const goNext = useCallback(() => {
    setSlideDir("next");
    setCurrentSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  }, []);
  const goPrev = useCallback(() => {
    setSlideDir("prev");
    setCurrentSlide((s) => Math.max(s - 1, 0));
  }, []);
  const exitPresent = useCallback(() => {
    setPresentMode(false);
    setCurrentSlide(0);
  }, []);

  useEffect(() => {
    if (!presentMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      else if (e.key === "Escape") exitPresent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode, goNext, goPrev, exitPresent]);

  const ani = (delay: number = 0) => ({
    animation: `presentIn 0.4s ease-out ${delay}ms both`,
  });

  const tabs = [
    { id: "colors", label: "Colors" },
    { id: "type", label: "Typography" },
    { id: "components", label: "Components" },
    { id: "icons", label: "Iconography" },
    { id: "motion", label: "Motion" },
  ] as const;

  return (
    <div
      className={`${playfair.variable} ${plusJakarta.variable} min-h-screen`}
      style={{
        background: "#faf7f2",
        fontFamily: "var(--font-v2-plus-jakarta), sans-serif",
        color: "#463028",
      }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
        .material-symbols-outlined {
          font-family: "Material Symbols Outlined";
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }
        .hero-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .swatch-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .swatch-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .tab-active { border-bottom: 2px solid #8D4925; color: #8D4925; font-weight: 700; }
        .tab-inactive { border-bottom: 2px solid transparent; color: #6b7280; }
        .tab-inactive:hover { color: #8D4925; }
      `}</style>

      {/* ── Top nav ── */}
      <nav
        className="sticky top-0 z-50 border-b border-[#8D4925]/10"
        style={{ background: "rgba(253,250,241,0.97)", backdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo/kk-brown.svg"
              alt="Kuteera Kitchen"
              width={28}
              height={28}
              style={{ height: 28, width: "auto" }}
            />
            <span
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: 17,
                color: "#3A2618",
                letterSpacing: "-0.2px",
              }}
            >
              Kuteera Kitchen
            </span>
            <span className="ml-2 rounded-full bg-[#8D4925]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-[#8D4925]">
              Brand Kit
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPresentMode(true);
                setCurrentSlide(0);
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-[#7a3f20] active:scale-95"
              style={{ background: "#8D4925" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                slideshow
              </span>
              Present
            </button>
            <a
              href="/customer-v2/home"
              className="flex items-center gap-1.5 rounded-lg border border-[#8D4925]/20 px-3 py-1.5 text-xs font-bold text-[#8D4925] transition-colors hover:bg-[#8D4925]/5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                arrow_back
              </span>
              Back to App
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="hero-pattern relative overflow-hidden" style={{ background: "#8D4925" }}>
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="relative z-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
              Design Language
            </p>
            <h1
              className="mb-4 text-6xl font-bold text-white"
              style={{ fontFamily: "var(--font-v2-playfair), serif", lineHeight: 1.1 }}
            >
              Kuteera Kitchen
              <br />
              Brand Kit
            </h1>
            <p className="mb-8 max-w-xl text-lg text-orange-100/80" style={{ lineHeight: 1.7 }}>
              The complete design language for Kuteera Kitchen — colors, typography, components,
              icons, and motion patterns that power the customer-v2 experience.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Warm & Authentic", "Home-cooked", "Accessible", "Mobile-first"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -bottom-16 -right-16 opacity-10">
          <span
            className="material-symbols-outlined select-none"
            style={{ fontSize: 300, color: "#fff" }}
          >
            restaurant
          </span>
        </div>
      </div>

      {/* ── Brand identity ── */}
      <div className="mx-auto max-w-7xl px-6 pt-16">
        <SectionLabel>Brand Identity</SectionLabel>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Logo on light */}
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-10">
            <Image src="/images/logo/kk-brown.svg" alt="Logo on light" width={96} height={96} />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
                On Light
              </p>
              <p className="mt-1 text-xs text-[#8D4925]/60">kk-brown.svg</p>
            </div>
          </div>
          {/* Logo on dark */}
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-2xl p-10"
            style={{ background: "#3A2618" }}
          >
            <Image src="/images/logo/kk-white.svg" alt="Logo on dark" width={96} height={96} />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                On Dark
              </p>
              <p className="mt-1 text-xs text-white/40">kk-white.svg</p>
            </div>
          </div>
          {/* Wordmark */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
                Wordmark
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: "#ffc06a" }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: "#3A1A08" }}
                  >
                    restaurant
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#3A2618",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Kuteera Kitchen
                </span>
              </div>
            </div>
            <div className="mt-8 border-t border-[#8D4925]/8 pt-6">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
                Tagline
              </p>
              <p className="text-sm font-medium text-[#8D4925]">
                &ldquo;Homely, Tasty, Healthy.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="mx-auto max-w-7xl px-6">
        <SectionDivider title="Design Tokens & Components" />
        <div className="mb-10 flex gap-0 border-b border-[#8D4925]/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`mr-8 pb-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? "tab-active" : "tab-inactive"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Colors tab ── */}
        {activeTab === "colors" && (
          <div className="space-y-12">
            {colorTokens.map((group) => (
              <div key={group.group}>
                <SectionLabel>{group.group}</SectionLabel>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.colors.map((color) => {
                    return (
                      <div
                        key={color.name}
                        className="swatch-hover overflow-hidden rounded-2xl border border-[#8D4925]/8 bg-white shadow-sm"
                      >
                        <div className="h-28 w-full" style={{ background: color.hex }} />
                        <div className="p-4">
                          <p className="mb-0.5 text-sm font-bold text-[#3A2618]">{color.name}</p>
                          <p className="mb-2 text-xs text-[#8D4925]/60">{color.role}</p>
                          <div className="flex items-center gap-1 rounded-md bg-[#faf7f2] px-2 py-1">
                            <code className="flex-1 text-[11px] font-mono text-[#8D4925]">
                              {color.hex}
                            </code>
                            <CopyButton value={color.hex} />
                          </div>
                          {color.cssVar !== "—" && (
                            <div className="mt-1.5 flex items-center gap-1 rounded-md bg-[#faf7f2] px-2 py-1">
                              <code className="flex-1 text-[11px] font-mono text-[#8D4925]/60">
                                {color.cssVar}
                              </code>
                              <CopyButton value={color.cssVar} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* CSS variable reference */}
            <div>
              <SectionLabel>CSS Variable Reference</SectionLabel>
              <div className="overflow-hidden rounded-2xl border border-[#8D4925]/10 bg-[#3A2618]">
                <div className="border-b border-white/8 px-5 py-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-[11px] text-white/30 font-mono">
                    globals.css — :root
                  </span>
                </div>
                <pre
                  className="overflow-x-auto p-5 text-[12px] leading-7"
                  style={{ fontFamily: "monospace", color: "rgba(253,250,241,0.7)" }}
                >
                  {`:root {
  --background:   36 40% 95%;   /* #faf7f2 — page bg */
  --foreground:   27 50% 16%;   /* #463028 — body text */
  --card:         36 100% 98%;  /* #fff8f2 — card bg */
  --primary:      25 75% 31%;   /* #8D4925 — brand brown */
  --primary-foreground: 36 100% 98%;
  --secondary:    36 100% 95%;  /* soft cream */
  --accent:       35 80% 45%;   /* muted gold */
  --muted:        36 30% 90%;   /* light gray-brown */
  --destructive:  0 85% 60%;    /* #dc2626 — error red */
  --border:       36 30% 85%;
  --ring:         25 75% 31%;
  --radius:       0.75rem;      /* 12px base */
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── Typography tab ── */}
        {activeTab === "type" && (
          <div className="space-y-12">
            {/* Font families */}
            <div>
              <SectionLabel>Font Families</SectionLabel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
                    Primary — Headings
                  </p>
                  <p
                    className="mb-3 text-4xl font-bold text-[#3A2618]"
                    style={{ fontFamily: "var(--font-v2-playfair), serif" }}
                  >
                    Playfair Display
                  </p>
                  <p className="mb-4 text-sm text-[#8D4925]/60">
                    Used for all headings (h1–h4), hero text, card titles, and modal headers.
                    Weights used: 600, 700.
                  </p>
                  <p
                    className="text-lg text-[#3A2618]/70"
                    style={{ fontFamily: "var(--font-v2-playfair), serif" }}
                  >
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    <br />
                    abcdefghijklmnopqrstuvwxyz
                    <br />
                    0123456789 !@#₹&*()
                  </p>
                </div>
                <div className="rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
                    Secondary — Body
                  </p>
                  <p
                    className="mb-3 text-4xl font-bold text-[#3A2618]"
                    style={{ fontFamily: "var(--font-v2-plus-jakarta), sans-serif" }}
                  >
                    Plus Jakarta Sans
                  </p>
                  <p className="mb-4 text-sm text-[#8D4925]/60">
                    Used for all body copy, labels, navigation, buttons, and captions. Weights used:
                    400, 500, 600, 700.
                  </p>
                  <p
                    className="text-lg text-[#3A2618]/70"
                    style={{ fontFamily: "var(--font-v2-plus-jakarta), sans-serif" }}
                  >
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    <br />
                    abcdefghijklmnopqrstuvwxyz
                    <br />
                    0123456789 !@#₹&*()
                  </p>
                </div>
              </div>
            </div>

            {/* Type scale */}
            <div>
              <SectionLabel>Type Scale</SectionLabel>
              <div className="overflow-hidden rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1]">
                {typeScale.map((item, i) => (
                  <div
                    key={item.label}
                    className={`flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-baseline sm:gap-6 ${i < typeScale.length - 1 ? "border-b border-[#8D4925]/6" : ""}`}
                  >
                    <div className="flex w-28 shrink-0 gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40 pt-1">
                        {item.label}
                      </span>
                    </div>
                    <div className="w-20 shrink-0 text-[11px] font-mono text-[#8D4925]/40">
                      {item.px}
                    </div>
                    <p
                      className={`${item.size} ${item.weight} text-[#3A2618] ${item.extra ?? ""} flex-1 leading-tight`}
                      style={{
                        fontFamily:
                          item.font === "playfair"
                            ? "var(--font-v2-playfair), serif"
                            : "var(--font-v2-plus-jakarta), sans-serif",
                      }}
                    >
                      {item.sample}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div>
              <SectionLabel>Border Radius Scale</SectionLabel>
              <div className="flex flex-wrap items-end gap-6">
                {[
                  { name: "rounded-full", px: "9999px", label: "Pills & badges" },
                  { name: "rounded-3xl", px: "36px", label: "Hero modals" },
                  { name: "rounded-2xl", px: "24px", label: "Cards, images" },
                  { name: "rounded-xl", px: "12px", label: "Buttons, inputs" },
                  { name: "rounded-lg", px: "8px", label: "Small elements" },
                  { name: "rounded-md", px: "6px", label: "Tags, chips" },
                ].map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-2">
                    <div
                      className={`h-16 w-16 bg-[#8D4925]/15 border-2 border-[#8D4925]/25 ${r.name}`}
                    />
                    <p className="text-center text-[10px] font-mono text-[#8D4925]">{r.px}</p>
                    <p className="text-center text-[10px] text-[#8D4925]/50">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Components tab ── */}
        {activeTab === "components" && (
          <div className="space-y-14">
            {/* Buttons */}
            <div>
              <SectionLabel>Buttons</SectionLabel>
              <div className="rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                <div className="flex flex-wrap gap-4">
                  <button className="rounded-xl bg-[#8D4925] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#7a3f20] active:scale-95">
                    Primary Action
                  </button>
                  <button className="rounded-xl bg-[#1b4332] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0d3327] active:scale-95">
                    Success / Active
                  </button>
                  <button className="rounded-xl border-2 border-[#8D4925] px-6 py-3 text-sm font-bold text-[#8D4925] transition-all hover:bg-[#8D4925]/5 active:scale-95">
                    Outline
                  </button>
                  <button className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#8D4925] shadow-lg transition-all hover:bg-orange-50 active:scale-95">
                    On Dark (White)
                  </button>
                  <button className="rounded-xl border border-[#8D4925]/20 px-6 py-3 text-sm font-semibold text-[#8D4925] transition-all hover:bg-orange-50">
                    Secondary
                  </button>
                  <button className="rounded-xl bg-[#dc2626] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-95">
                    Destructive
                  </button>
                  <button className="rounded-xl px-6 py-3 text-sm font-bold text-[#8D4925] transition-all hover:bg-[#8D4925]/5 active:scale-95">
                    Ghost
                  </button>
                  <button
                    disabled
                    className="cursor-not-allowed rounded-xl bg-[#8D4925]/30 px-6 py-3 text-sm font-bold text-white/60"
                  >
                    Disabled
                  </button>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#1b4332] transition-colors hover:text-[#0d3327]">
                    View All Menu
                    <span className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </button>
                  <button className="flex items-center gap-2 rounded-full border border-[#8D4925]/20 bg-white px-5 py-2.5 text-sm font-bold text-[#8D4925] shadow-sm transition-all hover:shadow-md">
                    <span className="material-symbols-outlined text-base">add</span>
                    Add Item
                  </button>
                  <div className="flex items-center gap-0 overflow-hidden rounded-full bg-[#8D4925]/8 text-sm">
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8D4925] text-white transition hover:bg-[#7a3f20]">
                      <span className="material-symbols-outlined text-base">remove</span>
                    </button>
                    <span className="w-10 text-center font-bold text-[#3A2618]">2</span>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8D4925] text-white transition hover:bg-[#7a3f20]">
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Card */}
            <div>
              <SectionLabel>Hero Card (Primary Surface)</SectionLabel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="hero-pattern relative overflow-hidden rounded-2xl bg-[#8D4925] p-8 text-white shadow-xl">
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Today&apos;s Booking
                        </p>
                        <h2
                          className="text-4xl font-bold"
                          style={{ fontFamily: "var(--font-v2-playfair), serif" }}
                        >
                          Order #1042
                        </h2>
                      </div>
                      <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                        Today
                      </span>
                    </div>
                    <div className="mt-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Order Snapshot
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-3xl">schedule</span>
                          <span className="text-2xl font-bold italic">Mon, 9:15 AM</span>
                        </div>
                        <p className="mt-2 text-xs text-orange-100">3 items · ₹240 · Confirmed</p>
                      </div>
                      <button className="rounded-xl bg-white px-8 py-3 font-bold text-[#8D4925] shadow-lg transition-all hover:bg-orange-50 active:scale-95">
                        View Order
                      </button>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-20">
                    <span className="material-symbols-outlined select-none text-[200px]">
                      receipt_long
                    </span>
                  </div>
                </div>

                {/* Subscription card */}
                <div className="hero-pattern relative overflow-hidden rounded-2xl bg-[#8D4925] p-8 text-white shadow-xl">
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Subscription Status
                        </p>
                        <h2
                          className="text-4xl font-bold"
                          style={{ fontFamily: "var(--font-v2-playfair), serif" }}
                        >
                          Monthly Veg Plan
                        </h2>
                      </div>
                      <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <div className="mt-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Next Delivery
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-3xl">schedule</span>
                          <span className="text-2xl font-bold italic">Tomorrow, 8 AM</span>
                        </div>
                        <p className="mt-2 text-xs text-orange-100">8 deliveries this month</p>
                      </div>
                      <button className="rounded-xl bg-white px-8 py-3 font-bold text-[#8D4925] shadow-lg transition-all hover:bg-orange-50 active:scale-95">
                        Manage Plan
                      </button>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-20">
                    <span className="material-symbols-outlined select-none text-[200px]">eco</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meal cards */}
            <div>
              <SectionLabel>Meal / Product Cards</SectionLabel>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    name: "Masala Dosa",
                    desc: "Crispy rice crepe with spiced potato filling, served with sambar and chutneys.",
                    meal: "Breakfast",
                    price: "₹80",
                  },
                  {
                    name: "Sambar Rice",
                    desc: "Slow-cooked lentil sambar with fluffy steamed rice — a complete comfort meal.",
                    meal: "Lunch",
                    price: "₹120",
                  },
                  {
                    name: "Bisi Bele Bath",
                    desc: "Karnataka's hearty rice-lentil-vegetable dish in a tamarind-spiced gravy.",
                    meal: "Dinner",
                    price: "₹130",
                  },
                  {
                    name: "Coconut Chutney",
                    desc: "Fresh ground coconut with green chilli and a tempering of curry leaves.",
                    meal: "Condiment",
                    price: "₹30",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="group overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-44 overflow-hidden bg-[#8D4925]/8">
                      <div className="flex h-full items-center justify-center">
                        <span className="material-symbols-outlined text-[80px] text-[#8D4925]/20">
                          restaurant
                        </span>
                      </div>
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8D4925] shadow-sm backdrop-blur-sm">
                        {item.meal}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3
                          className="text-base font-bold text-gray-800"
                          style={{ fontFamily: "var(--font-v2-playfair), serif" }}
                        >
                          {item.name}
                        </h3>
                        <span className="shrink-0 text-sm font-bold text-[#8D4925]">
                          {item.price}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status pills */}
            <div>
              <SectionLabel>Order Status Badges</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {orderStatuses.map(({ status, bg, text }) => (
                  <span
                    key={status}
                    className={`rounded-full ${bg} ${text} px-4 py-1.5 text-xs font-bold uppercase tracking-wider`}
                  >
                    {status}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-full bg-[#8D4925] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                  Primary
                </span>
                <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                  Active
                </span>
                <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#8D4925] px-1.5 text-[11px] font-bold leading-5 text-white">
                  3
                </span>
                <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                  !
                </span>
              </div>
            </div>

            {/* Form elements */}
            <div>
              <SectionLabel>Form Elements</SectionLabel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                  <div className="space-y-5">
                    <div>
                      <label className="customer-form-label mb-1.5 block text-sm font-medium text-[#3A2618]">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Shashank Rao"
                        defaultValue=""
                        className="customer-form-field w-full rounded-xl border border-[#8D4925]/20 bg-white px-4 py-3 text-sm text-[#3A2618] placeholder-gray-400 outline-none transition focus:border-[#8D4925] focus:ring-2 focus:ring-[#8D4925]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#3A2618]">
                        Phone Number
                      </label>
                      <div className="flex gap-2">
                        <span className="flex items-center rounded-xl border border-[#8D4925]/20 bg-white px-3 text-sm text-[#8D4925]/60">
                          +91
                        </span>
                        <input
                          type="tel"
                          placeholder="98765 43210"
                          className="customer-form-field flex-1 rounded-xl border border-[#8D4925]/20 bg-white px-4 py-3 text-sm text-[#3A2618] placeholder-gray-400 outline-none transition focus:border-[#8D4925] focus:ring-2 focus:ring-[#8D4925]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#3A2618]">
                        Coupon Code
                      </label>
                      <input
                        type="text"
                        placeholder="WELCOME20"
                        className="customer-form-field w-full rounded-xl border border-[#1b4332]/30 bg-white px-4 py-3 text-sm text-[#3A2618] placeholder-gray-400 outline-none transition focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20"
                      />
                      <p className="mt-1.5 text-xs text-[#1b4332]">
                        Apply your discount code at checkout.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#3A2618]">
                        Error State
                      </label>
                      <input
                        type="email"
                        defaultValue="bad-email"
                        className="customer-form-field w-full rounded-xl border-2 border-red-400 bg-white px-4 py-3 text-sm text-[#3A2618] outline-none"
                      />
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        Please enter a valid email address.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order detail modal preview */}
                <div className="rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
                    Modal Preview
                  </p>
                  <div className="rounded-2xl bg-[#FDFAF1] px-5 pb-6 pt-5 shadow-2xl ring-1 ring-[#8D4925]/10">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                          Order ID
                        </p>
                        <h3 className="text-xl font-bold text-[#8D4925]">#1042</h3>
                      </div>
                      <span className="rounded-full bg-green-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-green-800">
                        Confirmed
                      </span>
                    </div>
                    <div className="space-y-2.5 rounded-xl border border-[#8D4925]/10 bg-white p-4 text-sm">
                      {[
                        ["Date", "25 Apr 2026 • 09:15 AM"],
                        ["Order type", "One-time"],
                        ["Payment", "UPI"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-[#64748b]">{k}</span>
                          <span className="font-semibold text-[#1e293b]">{v}</span>
                        </div>
                      ))}
                    </div>
                    <button className="mt-4 w-full rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav bar */}
            <div>
              <SectionLabel>Navigation Bar</SectionLabel>
              <div className="overflow-hidden rounded-2xl border border-[#8D4925]/10 shadow-sm">
                <nav className="border-b border-orange-100 bg-[#fdfaf1]/95">
                  <div className="flex h-20 items-center justify-between px-8">
                    <div className="flex items-center gap-2.5">
                      <Image src="/images/logo/kk-brown.svg" alt="" width={28} height={28} />
                      <span
                        style={{
                          fontFamily: "var(--font-v2-playfair), serif",
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#3A2618",
                        }}
                      >
                        Kuteera Kitchen
                      </span>
                    </div>
                    <div className="flex items-center gap-7">
                      {[
                        { label: "Home", active: true },
                        { label: "Order", active: false },
                        { label: "Subscription", active: false },
                      ].map(({ label, active }) => (
                        <span
                          key={label}
                          className={`text-sm ${active ? "border-b-2 border-[#8D4925] pb-1 font-bold text-[#8D4925]" : "font-medium text-gray-600"}`}
                        >
                          {label}
                        </span>
                      ))}
                      <div className="relative">
                        <span className="material-symbols-outlined text-2xl text-gray-600">
                          shopping_cart
                        </span>
                        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#8D4925] text-[9px] font-bold text-white">
                          2
                        </span>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#8D4925]/20 bg-[#8D4925]/10">
                        <span className="text-sm font-bold text-[#8D4925]">SR</span>
                      </div>
                    </div>
                  </div>
                </nav>
                <div className="bg-[#faf7f2] px-8 py-3 text-xs text-[#8D4925]/40 font-mono">
                  sticky top-0 z-50 · bg-[#fdfaf1]/95 backdrop-blur-md · h-20
                </div>
              </div>
            </div>

            {/* Table */}
            <div>
              <SectionLabel>Data Table</SectionLabel>
              <div className="overflow-hidden rounded-2xl border border-[#8D4925]/10">
                <table className="customer-table w-full">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        id: "#1042",
                        date: "25 Apr 2026",
                        items: "Masala Dosa × 2",
                        total: "₹160",
                        status: "Confirmed",
                        sClass: "bg-green-100 text-green-800",
                      },
                      {
                        id: "#1041",
                        date: "24 Apr 2026",
                        items: "Sambar Rice, Rasam",
                        total: "₹200",
                        status: "Delivered",
                        sClass: "bg-gray-100 text-gray-600",
                      },
                      {
                        id: "#1040",
                        date: "23 Apr 2026",
                        items: "Bisi Bele Bath × 1",
                        total: "₹130",
                        status: "Delivered",
                        sClass: "bg-gray-100 text-gray-600",
                      },
                    ].map((row) => (
                      <tr key={row.id}>
                        <td className="font-bold text-[#8D4925]">{row.id}</td>
                        <td>{row.date}</td>
                        <td>{row.items}</td>
                        <td className="font-semibold">{row.total}</td>
                        <td>
                          <span
                            className={`rounded-full ${row.sClass} px-3 py-0.5 text-xs font-bold uppercase tracking-wider`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <SectionLabel>Payment Method Cards</SectionLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { icon: "payments", label: "UPI", sub: "GPay · PhonePe · Paytm", active: true },
                  {
                    icon: "credit_card",
                    label: "Card",
                    sub: "Debit & Credit Cards",
                    active: false,
                  },
                  {
                    icon: "account_balance",
                    label: "Net Banking",
                    sub: "All major banks",
                    active: false,
                  },
                ].map((pm) => (
                  <div
                    key={pm.label}
                    className={`flex items-center gap-4 rounded-2xl border-2 bg-white p-5 transition-all ${pm.active ? "border-[#8D4925] shadow-md" : "border-[#8D4925]/15 hover:border-[#8D4925]/30"}`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pm.active ? "bg-[#8D4925]" : "bg-[#8D4925]/8"}`}
                    >
                      <span
                        className={`material-symbols-outlined text-xl ${pm.active ? "text-white" : "text-[#8D4925]"}`}
                      >
                        {pm.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[#3A2618]">{pm.label}</p>
                      <p className="text-xs text-gray-500">{pm.sub}</p>
                    </div>
                    {pm.active && (
                      <span
                        className="material-symbols-outlined ml-auto text-xl text-[#8D4925]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error & empty states */}
            <div>
              <SectionLabel>Feedback & Empty States</SectionLabel>
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  <span className="font-bold">Error:</span> We couldn&apos;t load your recent
                  orders. Please try again.
                </div>
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 py-10 text-center text-sm text-[#8D4925]">
                  <span
                    className="material-symbols-outlined text-[#8D4925]/30"
                    style={{ fontSize: 40, lineHeight: 1 }}
                  >
                    restaurant
                  </span>
                  No items available in today&apos;s menu. Check back after the menu is released.
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
                  <span className="font-bold">Success:</span> Your order has been placed!
                  You&apos;ll receive a confirmation shortly.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Icons tab ── */}
        {activeTab === "icons" && (
          <div className="space-y-10">
            <div>
              <SectionLabel>Material Symbols Outlined</SectionLabel>
              <p className="mb-6 max-w-xl text-sm text-[#8D4925]/60">
                All icons in customer-v2 use Material Symbols Outlined via Google Fonts. Loaded via
                CSS import in the shell. Usage:{" "}
                <code className="rounded bg-[#8D4925]/8 px-1.5 py-0.5 text-xs font-mono text-[#8D4925]">
                  &lt;span className=&quot;material-symbols-outlined&quot;&gt;icon_name&lt;/span&gt;
                </code>
              </p>
              <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
                {iconNames.map((icon) => (
                  <div
                    key={icon}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[#8D4925]/8 bg-[#fdfaf1] p-4 transition-all hover:border-[#8D4925]/30 hover:shadow-md"
                  >
                    <span className="material-symbols-outlined text-[28px] text-[#8D4925] transition-transform duration-200 group-hover:scale-110">
                      {icon}
                    </span>
                    <p className="text-center text-[9px] font-mono text-[#8D4925]/50 leading-tight break-all">
                      {icon}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Icon Sizes</SectionLabel>
              <div className="flex flex-wrap items-end gap-8 rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                {[
                  { size: "text-base", px: "16px", label: "Inline / small" },
                  { size: "text-lg", px: "18px", label: "Buttons" },
                  { size: "text-2xl", px: "24px", label: "Nav / default" },
                  { size: "text-3xl", px: "30px", label: "Hero labels" },
                  { size: "text-[48px]", px: "48px", label: "Section icons" },
                  { size: "text-[80px]", px: "80px", label: "Empty state" },
                  { size: "text-[200px]", px: "200px", label: "Hero watermark" },
                ].map((s) => (
                  <div key={s.px} className="flex flex-col items-center gap-2">
                    <span className={`material-symbols-outlined ${s.size} text-[#8D4925]/60`}>
                      restaurant
                    </span>
                    <p className="text-[10px] font-mono text-[#8D4925]/50">{s.px}</p>
                    <p className="text-[10px] text-[#8D4925]/40">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Icon Variation Settings (FILL)</SectionLabel>
              <div className="flex gap-10 rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[40px] text-[#8D4925]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    favorite
                  </span>
                  <p className="text-xs font-mono text-[#8D4925]/50">{`'FILL' 0`}</p>
                  <p className="text-xs text-[#8D4925]/40">Outline</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[40px] text-[#8D4925]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    favorite
                  </span>
                  <p className="text-xs font-mono text-[#8D4925]/50">{`'FILL' 1`}</p>
                  <p className="text-xs text-[#8D4925]/40">Filled</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[40px] text-[#8D4925]"
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
                  >
                    check_circle
                  </span>
                  <p className="text-xs font-mono text-[#8D4925]/50">{`wght 200`}</p>
                  <p className="text-xs text-[#8D4925]/40">Thin</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[40px] text-[#8D4925]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                  >
                    check_circle
                  </span>
                  <p className="text-xs font-mono text-[#8D4925]/50">{`wght 700`}</p>
                  <p className="text-xs text-[#8D4925]/40">Bold filled</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Motion tab ── */}
        {activeTab === "motion" && (
          <div className="space-y-12">
            <div>
              <SectionLabel>Animation Utilities</SectionLabel>
              <div className="space-y-3">
                {animations.map((anim) => (
                  <div
                    key={anim.name}
                    className="flex flex-col gap-1 rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] px-6 py-5 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <code className="w-52 shrink-0 text-sm font-mono font-bold text-[#8D4925]">
                      .{anim.name}
                    </code>
                    <div className="flex-1">
                      <p className="text-sm text-[#3A2618]">{anim.description}</p>
                      <p className="mt-0.5 text-xs text-[#8D4925]/50">Use for: {anim.usecase}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Transition Principles</SectionLabel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  {
                    title: "Duration",
                    body: "Micro-interactions: 150–200ms\nPage elements: 300–500ms\nSlow reveals: 800ms\nScale pulse: 500ms",
                    icon: "timer",
                  },
                  {
                    title: "Easing",
                    body: "Enter → ease-out\nExit → ease-in\nState changes → ease-in-out\nNever linear for UI transitions",
                    icon: "show_chart",
                  },
                  {
                    title: "Properties",
                    body: "Animate only: transform, opacity\nAvoid: width, height, top, left\nHover scale: 1.05×\nHover lift: translateY(-4px)",
                    icon: "tune",
                  },
                ].map((p) => (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-6"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8D4925]/10">
                        <span className="material-symbols-outlined text-xl text-[#8D4925]">
                          {p.icon}
                        </span>
                      </div>
                      <p className="font-bold text-[#3A2618]">{p.title}</p>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-7 text-[#8D4925]/70">
                      {p.body}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Interactive Hover States</SectionLabel>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <div
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-orange-50 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
                >
                  <span className="material-symbols-outlined text-3xl text-[#8D4925]">
                    restaurant
                  </span>
                  <p className="text-center text-xs font-medium text-gray-600">Lift on hover</p>
                  <p className="text-center text-[10px] font-mono text-[#8D4925]/40">
                    translateY(-4px)
                  </p>
                </div>
                <div
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-orange-50 bg-white p-6 shadow-sm"
                  style={{ transition: "transform 0.3s ease" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <span className="material-symbols-outlined text-3xl text-[#8D4925]">
                    local_shipping
                  </span>
                  <p className="text-center text-xs font-medium text-gray-600">Scale on hover</p>
                  <p className="text-center text-[10px] font-mono text-[#8D4925]/40">scale(1.05)</p>
                </div>
                <button className="flex flex-col items-center gap-3 rounded-2xl bg-[#8D4925] p-6 shadow-md transition-all duration-150 hover:bg-[#7a3f20] active:scale-95">
                  <span className="material-symbols-outlined text-3xl text-white">
                    check_circle
                  </span>
                  <p className="text-center text-xs font-medium text-white/80">Press scale</p>
                  <p className="text-center text-[10px] font-mono text-white/40">active:scale-95</p>
                </button>
                <div className="group flex flex-col items-center gap-3 rounded-2xl border border-orange-50 bg-white p-6 shadow-sm transition-all duration-200 hover:border-[#8D4925]/30">
                  <span className="material-symbols-outlined text-3xl text-[#8D4925]/30 transition-colors duration-200 group-hover:text-[#8D4925]">
                    favorite
                  </span>
                  <p className="text-center text-xs font-medium text-gray-400 transition-colors duration-200 group-hover:text-gray-700">
                    Color on hover
                  </p>
                  <p className="text-center text-[10px] font-mono text-[#8D4925]/40">
                    group-hover:text-
                  </p>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Background Patterns</SectionLabel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div
                  className="hero-pattern h-40 overflow-hidden rounded-2xl"
                  style={{ background: "#8D4925" }}
                >
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-white/60">
                      .hero-pattern overlay
                    </p>
                  </div>
                </div>
                <div
                  className="h-40 overflow-hidden rounded-2xl"
                  style={{
                    background: "rgba(141,73,37,0.06)",
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, #8D4925 1px, transparent 0)",
                    backgroundSize: "28px 28px",
                  }}
                >
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-[#8D4925]/40">
                      Dot grid variant
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Spacing reference ── */}
      <div className="mx-auto max-w-7xl px-6">
        <SectionDivider title="Spacing Reference" />
        <div className="mb-16 rounded-2xl border border-[#8D4925]/10 bg-[#fdfaf1] p-8">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-[#8D4925]/40">
            4pt / 8dp Spacing Scale
          </p>
          <div className="flex flex-wrap items-end gap-3">
            {[
              { t: "0.5", px: "2px" },
              { t: "1", px: "4px" },
              { t: "2", px: "8px" },
              { t: "3", px: "12px" },
              { t: "4", px: "16px" },
              { t: "5", px: "20px" },
              { t: "6", px: "24px" },
              { t: "8", px: "32px" },
              { t: "10", px: "40px" },
              { t: "12", px: "48px" },
              { t: "16", px: "64px" },
              { t: "20", px: "80px" },
            ].map(({ t, px }) => (
              <div key={t} className="flex flex-col items-center gap-1.5">
                <div
                  className="bg-[#8D4925]/20 border border-[#8D4925]/10"
                  style={{ width: px, height: px, minWidth: "2px", minHeight: "2px" }}
                />
                <p className="text-[9px] font-mono text-[#8D4925]/50">{px}</p>
                <p className="text-[9px] text-[#8D4925]/30">p-{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: "#3A1A08", padding: "56px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="flex flex-col items-center gap-4 pb-8 text-center">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "#ffc06a",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, color: "#3A1A08" }}
                >
                  restaurant
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-v2-playfair), serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#fdfaf1",
                }}
              >
                Kuteera Kitchen Brand Kit
              </span>
            </div>
            <p style={{ color: "rgba(253,250,241,0.4)", fontSize: 13, maxWidth: 480 }}>
              These tokens and components define the customer-v2 design language. All values map
              directly to the codebase.
            </p>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span style={{ color: "rgba(253,250,241,0.3)", fontSize: 12 }}>
              © 2026 Kuteera Kitchen
            </span>
            <span style={{ color: "rgba(253,250,241,0.3)", fontSize: 12 }}>
              Version: customer-v2 · Fonts: Playfair Display + Plus Jakarta Sans · Icons: Material
              Symbols
            </span>
          </div>
        </div>
      </footer>

      {/* ── Presentation Mode ── */}
      {presentMode && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
          style={{
            background: slideBgs[currentSlide],
            fontFamily: "var(--font-v2-plus-jakarta), sans-serif",
            transition: "background 0.5s ease",
          }}
        >
          <style>{`
            @keyframes presentIn {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes floatY {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-14px); }
            }
            @keyframes breatheGlow {
              0%, 100% { opacity: 0.06; transform: scale(1); }
              50%       { opacity: 0.16; transform: scale(1.08); }
            }
          `}</style>

          {/* Ambient glows */}
          {isDark && (
            <>
              <div
                style={{
                  position: "absolute",
                  top: -80,
                  left: -80,
                  width: 380,
                  height: 380,
                  borderRadius: "50%",
                  background: "rgba(255,192,106,0.13)",
                  filter: "blur(90px)",
                  animation: "breatheGlow 5s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -80,
                  right: -80,
                  width: 420,
                  height: 420,
                  borderRadius: "50%",
                  background: "rgba(141,73,37,0.22)",
                  filter: "blur(110px)",
                  animation: "breatheGlow 6s ease-in-out infinite 1.5s",
                  pointerEvents: "none",
                }}
              />
              {(currentSlide === 0 || currentSlide === 8) && (
                <div
                  className="hero-pattern absolute inset-0"
                  style={{ opacity: 0.35, pointerEvents: "none" }}
                />
              )}
            </>
          )}

          {/* ── Top bar ── */}
          <div
            className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-8 py-4"
            style={{
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(141,73,37,0.07)"}`,
            }}
          >
            <div className="flex items-center gap-2">
              <Image
                src={isDark ? "/images/logo/kk-white.svg" : "/images/logo/kk-brown.svg"}
                alt=""
                width={18}
                height={18}
                style={{ height: 18, width: "auto", opacity: 0.6 }}
              />
              <span
                style={{
                  fontFamily: "var(--font-v2-playfair), serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: isDark ? "rgba(253,250,241,0.5)" : "rgba(58,38,24,0.45)",
                  letterSpacing: "-0.2px",
                }}
              >
                Kuteera Kitchen
              </span>
              <span
                style={{
                  color: isDark ? "rgba(255,255,255,0.15)" : "rgba(141,73,37,0.2)",
                  fontSize: 10,
                  margin: "0 4px",
                }}
              >
                ·
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: isDark ? "rgba(253,250,241,0.3)" : "rgba(141,73,37,0.3)",
                }}
              >
                Brand Kit
              </span>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSlideDir(i > currentSlide ? "next" : "prev");
                      setCurrentSlide(i);
                    }}
                    style={{
                      width: i === currentSlide ? 18 : 5,
                      height: 5,
                      borderRadius: 3,
                      border: "none",
                      cursor: "pointer",
                      transition: "width 0.3s ease-out, background 0.2s",
                      background: isDark
                        ? i === currentSlide
                          ? "rgba(253,250,241,0.85)"
                          : "rgba(253,250,241,0.18)"
                        : i === currentSlide
                          ? "#8D4925"
                          : "rgba(141,73,37,0.18)",
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isDark ? "rgba(253,250,241,0.3)" : "rgba(141,73,37,0.3)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {currentSlide + 1} / {TOTAL_SLIDES}
              </span>
              <button
                type="button"
                onClick={exitPresent}
                className="flex items-center gap-1 rounded-lg transition-all"
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(141,73,37,0.07)",
                  color: isDark ? "rgba(253,250,241,0.65)" : "#8D4925",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(141,73,37,0.12)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  close
                </span>
                Exit
              </button>
            </div>
          </div>

          {/* ── Slide content ── */}
          <div
            key={currentSlide}
            className="absolute inset-0 flex items-center justify-center overflow-hidden px-12 pb-20 pt-20"
            style={{ animation: "presentIn 0.35s ease-out both" }}
          >
            {/* Slide 0 — Cover */}
            {currentSlide === 0 && (
              <div className="mx-auto w-full max-w-3xl text-center">
                <div
                  style={{
                    animation: "floatY 5s ease-in-out infinite",
                    display: "inline-block",
                    marginBottom: 36,
                  }}
                >
                  <Image
                    src="/images/logo/kk-white.svg"
                    alt="Kuteera Kitchen"
                    width={100}
                    height={100}
                    style={{ opacity: 0.95 }}
                  />
                </div>
                <p
                  style={{
                    ...ani(80),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "rgba(255,192,106,0.85)",
                    marginBottom: 18,
                  }}
                >
                  Design Language · 2026
                </p>
                <h1
                  style={{
                    ...ani(160),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: "clamp(56px,8vw,88px)",
                    fontWeight: 700,
                    color: "white",
                    lineHeight: 1.05,
                    letterSpacing: "-2px",
                    marginBottom: 20,
                  }}
                >
                  Kuteera Kitchen
                </h1>
                <p
                  style={{
                    ...ani(260),
                    fontSize: 20,
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: 52,
                  }}
                >
                  Brand Kit
                </p>
                <p
                  style={{
                    ...ani(360),
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 18,
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    margin: 0,
                  }}
                >
                  Homely, Tasty, Healthy
                </p>
              </div>
            )}

            {/* Slide 1 — Brand Identity */}
            {currentSlide === 1 && (
              <div className="w-full max-w-5xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(141,73,37,0.4)",
                    marginBottom: 8,
                  }}
                >
                  01 · Identity
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#3A2618",
                    marginBottom: 36,
                    lineHeight: 1.1,
                  }}
                >
                  Brand Identity
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <div
                    style={{
                      ...ani(120),
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 24,
                      borderRadius: 20,
                      border: "1px solid rgba(141,73,37,0.1)",
                      background: "#fdfaf1",
                      padding: "52px 24px",
                    }}
                  >
                    <Image src="/images/logo/kk-brown.svg" alt="" width={92} height={92} />
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(141,73,37,0.35)",
                          marginBottom: 4,
                        }}
                      >
                        On Light
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "rgba(141,73,37,0.45)",
                        }}
                      >
                        kk-brown.svg
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      ...ani(190),
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 24,
                      borderRadius: 20,
                      background: "#3A2618",
                      padding: "52px 24px",
                    }}
                  >
                    <Image src="/images/logo/kk-white.svg" alt="" width={92} height={92} />
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.25)",
                          marginBottom: 4,
                        }}
                      >
                        On Dark
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "rgba(255,255,255,0.35)",
                        }}
                      >
                        kk-white.svg
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      ...ani(260),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      borderRadius: 20,
                      border: "1px solid rgba(141,73,37,0.1)",
                      background: "#fdfaf1",
                      padding: "40px 32px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(141,73,37,0.35)",
                          marginBottom: 20,
                        }}
                      >
                        Wordmark
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            background: "#ffc06a",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 20, color: "#3A1A08" }}
                          >
                            restaurant
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-v2-playfair), serif",
                            fontWeight: 700,
                            fontSize: 18,
                            color: "#3A2618",
                          }}
                        >
                          Kuteera Kitchen
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid rgba(141,73,37,0.08)",
                        paddingTop: 24,
                        marginTop: 40,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(141,73,37,0.35)",
                          marginBottom: 10,
                        }}
                      >
                        Tagline
                      </p>
                      <p
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: "#8D4925",
                          fontStyle: "italic",
                          lineHeight: 1.4,
                        }}
                      >
                        &ldquo;Homely, Tasty, Healthy.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide 2 — Colors */}
            {currentSlide === 2 && (
              <div className="w-full max-w-5xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(141,73,37,0.4)",
                    marginBottom: 8,
                  }}
                >
                  02 · Colors
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#3A2618",
                    marginBottom: 36,
                    lineHeight: 1.1,
                  }}
                >
                  Color System
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
                  {[
                    { name: "Primary Brown", hex: "#8D4925", role: "CTAs & headings" },
                    { name: "Dark Espresso", hex: "#3A2618", role: "Body text" },
                    { name: "Forest Green", hex: "#1b4332", role: "Active states" },
                    { name: "Amber Gold", hex: "#ffc06a", role: "Warm accents" },
                    { name: "Parchment", hex: "#fdfaf1", role: "App surface", border: true },
                  ].map((c, i) => (
                    <div
                      key={c.name}
                      style={{
                        ...ani(110 + i * 65),
                        borderRadius: 18,
                        overflow: "hidden",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.09)",
                        border: c.border ? "1px solid rgba(141,73,37,0.15)" : "none",
                      }}
                    >
                      <div style={{ height: 190, background: c.hex }} />
                      <div style={{ padding: "14px 16px", background: "white" }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#3A2618",
                            marginBottom: 3,
                          }}
                        >
                          {c.name}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#8D4925",
                            marginBottom: 4,
                            fontFamily: "monospace",
                          }}
                        >
                          {c.hex}
                        </p>
                        <p style={{ fontSize: 10, color: "rgba(141,73,37,0.45)" }}>{c.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 3 — Typography */}
            {currentSlide === 3 && (
              <div className="w-full max-w-5xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(141,73,37,0.4)",
                    marginBottom: 8,
                  }}
                >
                  03 · Typography
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#3A2618",
                    marginBottom: 36,
                    lineHeight: 1.1,
                  }}
                >
                  Type System
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      ...ani(120),
                      padding: "32px",
                      borderRadius: 20,
                      border: "1px solid rgba(141,73,37,0.1)",
                      background: "#fdfaf1",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(141,73,37,0.4)",
                        marginBottom: 12,
                      }}
                    >
                      Primary — Headings
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-v2-playfair), serif",
                        fontSize: 38,
                        fontWeight: 700,
                        color: "#3A2618",
                        lineHeight: 1.1,
                        marginBottom: 10,
                      }}
                    >
                      Playfair Display
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-v2-playfair), serif",
                        fontSize: 17,
                        color: "rgba(58,38,24,0.5)",
                        lineHeight: 1.5,
                      }}
                    >
                      ABCDEFGHIJ abcdefghij 0–9
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(141,73,37,0.4)", marginTop: 12 }}>
                      Weights 600, 700 · h1–h4, hero, modals
                    </p>
                  </div>
                  <div
                    style={{
                      ...ani(190),
                      padding: "32px",
                      borderRadius: 20,
                      border: "1px solid rgba(141,73,37,0.1)",
                      background: "#fdfaf1",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(141,73,37,0.4)",
                        marginBottom: 12,
                      }}
                    >
                      Secondary — Body
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-v2-plus-jakarta), sans-serif",
                        fontSize: 38,
                        fontWeight: 700,
                        color: "#3A2618",
                        lineHeight: 1.1,
                        marginBottom: 10,
                      }}
                    >
                      Plus Jakarta Sans
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-v2-plus-jakarta), sans-serif",
                        fontSize: 17,
                        color: "rgba(58,38,24,0.5)",
                        lineHeight: 1.5,
                      }}
                    >
                      ABCDEFGHIJ abcdefghij 0–9
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(141,73,37,0.4)", marginTop: 12 }}>
                      Weights 400, 500, 600, 700 · body, labels, nav
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    ...ani(270),
                    borderRadius: 20,
                    border: "1px solid rgba(141,73,37,0.1)",
                    background: "#fdfaf1",
                    overflow: "hidden",
                  }}
                >
                  {[
                    {
                      label: "Display",
                      px: "48px",
                      font: "playfair",
                      sample: "Home-cooked meals",
                      size: 28,
                    },
                    {
                      label: "H1",
                      px: "36px",
                      font: "playfair",
                      sample: "Good Morning, Shashank!",
                      size: 22,
                    },
                    {
                      label: "Body",
                      px: "13.5px",
                      font: "jakarta",
                      sample:
                        "Freshly prepared, authentic home-cooked meals delivered to your doorstep.",
                      size: 13,
                    },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 20,
                        padding: "14px 24px",
                        borderTop: i > 0 ? "1px solid rgba(141,73,37,0.06)" : "none",
                      }}
                    >
                      <span
                        style={{
                          width: 56,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "rgba(141,73,37,0.35)",
                          flexShrink: 0,
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          width: 44,
                          fontSize: 9,
                          fontFamily: "monospace",
                          color: "rgba(141,73,37,0.3)",
                          flexShrink: 0,
                        }}
                      >
                        {row.px}
                      </span>
                      <span
                        style={{
                          fontSize: row.size,
                          fontFamily:
                            row.font === "playfair"
                              ? "var(--font-v2-playfair), serif"
                              : "var(--font-v2-plus-jakarta), sans-serif",
                          fontWeight: row.size > 16 ? 700 : 400,
                          color: "#3A2618",
                          lineHeight: 1.2,
                        }}
                      >
                        {row.sample}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 4 — Hero Cards */}
            {currentSlide === 4 && (
              <div className="w-full max-w-5xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(141,73,37,0.4)",
                    marginBottom: 8,
                  }}
                >
                  04 · Components
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#3A2618",
                    marginBottom: 36,
                    lineHeight: 1.1,
                  }}
                >
                  Primary Surface
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {[
                    {
                      label: "TODAY'S BOOKING",
                      title: "Order #1042",
                      badge: "Today",
                      icon: "receipt_long",
                      time: "Mon, 9:15 AM",
                      sub: "3 items · ₹240 · Confirmed",
                      action: "View Order",
                    },
                    {
                      label: "SUBSCRIPTION STATUS",
                      title: "Monthly Veg Plan",
                      badge: "Active",
                      icon: "eco",
                      time: "Tomorrow, 8 AM",
                      sub: "8 deliveries this month",
                      action: "Manage Plan",
                    },
                  ].map((card, i) => (
                    <div
                      key={card.label}
                      style={{
                        ...ani(130 + i * 90),
                        borderRadius: 22,
                        background: "#8D4925",
                        padding: 36,
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 24px 48px rgba(141,73,37,0.35)",
                      }}
                    >
                      <div className="hero-pattern absolute inset-0" />
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 36,
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                color: "rgba(255,192,106,0.9)",
                                marginBottom: 8,
                              }}
                            >
                              {card.label}
                            </p>
                            <h3
                              style={{
                                fontFamily: "var(--font-v2-playfair), serif",
                                fontSize: 30,
                                fontWeight: 700,
                                color: "white",
                                lineHeight: 1.1,
                              }}
                            >
                              {card.title}
                            </h3>
                          </div>
                          <span
                            style={{
                              background: "#1b4332",
                              color: "white",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              padding: "6px 16px",
                              borderRadius: 100,
                            }}
                          >
                            {card.badge}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 24, color: "white" }}
                              >
                                schedule
                              </span>
                              <span
                                style={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  fontStyle: "italic",
                                  color: "white",
                                }}
                              >
                                {card.time}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: "rgba(255,220,180,0.8)" }}>
                              {card.sub}
                            </p>
                          </div>
                          <button
                            style={{
                              background: "white",
                              color: "#8D4925",
                              padding: "11px 22px",
                              borderRadius: 12,
                              fontSize: 13,
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {card.action}
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: -24,
                          right: -24,
                          opacity: 0.15,
                          pointerEvents: "none",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 180, color: "white" }}
                        >
                          {card.icon}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 5 — UI Elements */}
            {currentSlide === 5 && (
              <div className="w-full max-w-5xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(141,73,37,0.4)",
                    marginBottom: 8,
                  }}
                >
                  05 · UI Elements
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#3A2618",
                    marginBottom: 32,
                    lineHeight: 1.1,
                  }}
                >
                  Components
                </h2>
                <div
                  style={{
                    ...ani(120),
                    marginBottom: 22,
                    padding: "22px 28px",
                    borderRadius: 18,
                    border: "1px solid rgba(141,73,37,0.09)",
                    background: "#fdfaf1",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(141,73,37,0.4)",
                      marginBottom: 14,
                    }}
                  >
                    Buttons
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {[
                      { label: "Primary", bg: "#8D4925", color: "white", border: "none" },
                      { label: "Success", bg: "#1b4332", color: "white", border: "none" },
                      {
                        label: "Outline",
                        bg: "transparent",
                        color: "#8D4925",
                        border: "2px solid #8D4925",
                      },
                      { label: "Ghost", bg: "transparent", color: "#8D4925", border: "none" },
                      { label: "Destructive", bg: "#dc2626", color: "white", border: "none" },
                      {
                        label: "Disabled",
                        bg: "rgba(141,73,37,0.2)",
                        color: "rgba(200,160,140,0.7)",
                        border: "none",
                      },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        style={{
                          padding: "9px 20px",
                          borderRadius: 11,
                          background: btn.bg,
                          color: btn.color,
                          border: btn.border,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    ...ani(190),
                    marginBottom: 22,
                    padding: "22px 28px",
                    borderRadius: 18,
                    border: "1px solid rgba(141,73,37,0.09)",
                    background: "#fdfaf1",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(141,73,37,0.4)",
                      marginBottom: 14,
                    }}
                  >
                    Status Badges
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {[
                      { label: "Confirmed", bg: "#dcfce7", color: "#166534" },
                      { label: "Preparing", bg: "#ffedd5", color: "#c2410c" },
                      { label: "Out for Delivery", bg: "#dbeafe", color: "#1d4ed8" },
                      { label: "Delivered", bg: "#f3f4f6", color: "#374151" },
                      { label: "Cancelled", bg: "#fee2e2", color: "#991b1b" },
                    ].map((b) => (
                      <span
                        key={b.label}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 100,
                          background: b.bg,
                          color: b.color,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                        }}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    ...ani(260),
                    padding: "22px 28px",
                    borderRadius: 18,
                    border: "1px solid rgba(141,73,37,0.09)",
                    background: "#fdfaf1",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(141,73,37,0.4)",
                      marginBottom: 14,
                    }}
                  >
                    Meal Cards
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {[
                      { name: "Masala Dosa", price: "₹80" },
                      { name: "Sambar Rice", price: "₹120" },
                      { name: "Bisi Bele Bath", price: "₹130" },
                      { name: "Coconut Chutney", price: "₹30" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        style={{
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid rgba(255,200,150,0.3)",
                          background: "white",
                        }}
                      >
                        <div
                          style={{
                            height: 72,
                            background: "rgba(141,73,37,0.07)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 32, color: "rgba(141,73,37,0.2)" }}
                          >
                            restaurant
                          </span>
                        </div>
                        <div style={{ padding: "10px 12px" }}>
                          <p
                            style={{
                              fontFamily: "var(--font-v2-playfair), serif",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#3A2618",
                              marginBottom: 2,
                            }}
                          >
                            {item.name}
                          </p>
                          <p style={{ fontSize: 11, color: "#8D4925", fontWeight: 700 }}>
                            {item.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Slide 6 — Iconography */}
            {currentSlide === 6 && (
              <div className="w-full max-w-4xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(253,250,241,0.28)",
                    marginBottom: 8,
                  }}
                >
                  06 · Icons
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#fdfaf1",
                    marginBottom: 6,
                    lineHeight: 1.1,
                  }}
                >
                  Iconography
                </h2>
                <p
                  style={{
                    ...ani(100),
                    fontSize: 13,
                    color: "rgba(253,250,241,0.4)",
                    marginBottom: 36,
                  }}
                >
                  Material Symbols Outlined · Google Fonts
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 12 }}>
                  {[
                    "schedule",
                    "receipt_long",
                    "eco",
                    "arrow_forward",
                    "shopping_cart",
                    "notifications",
                    "restaurant",
                    "home",
                    "person",
                    "calendar_today",
                    "local_shipping",
                    "check_circle",
                    "error",
                    "info",
                    "close",
                    "menu",
                    "search",
                    "favorite",
                    "star",
                    "payment",
                    "location_on",
                    "phone",
                    "edit",
                    "delete",
                  ].map((icon, i) => (
                    <div
                      key={icon}
                      style={{
                        ...ani(140 + i * 22),
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        padding: "16px 6px",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.055)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 26, color: "rgba(253,250,241,0.8)" }}
                      >
                        {icon}
                      </span>
                      <span
                        style={{
                          fontSize: 7.5,
                          fontFamily: "monospace",
                          color: "rgba(253,250,241,0.28)",
                          textAlign: "center",
                          lineHeight: 1.3,
                        }}
                      >
                        {icon}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 7 — Motion */}
            {currentSlide === 7 && (
              <div className="w-full max-w-5xl">
                <p
                  style={{
                    ...ani(0),
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(141,73,37,0.4)",
                    marginBottom: 8,
                  }}
                >
                  07 · Motion
                </p>
                <h2
                  style={{
                    ...ani(60),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#3A2618",
                    marginBottom: 36,
                    lineHeight: 1.1,
                  }}
                >
                  Motion & Animation
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 18,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      icon: "timer",
                      title: "Duration",
                      lines: [
                        "Micro-interactions: 150–200ms",
                        "Page elements: 300–500ms",
                        "Slow reveals: 800ms",
                      ],
                    },
                    {
                      icon: "show_chart",
                      title: "Easing",
                      lines: ["Enter → ease-out", "Exit → ease-in", "State changes → ease-in-out"],
                    },
                    {
                      icon: "tune",
                      title: "Properties",
                      lines: [
                        "Animate: transform, opacity",
                        "Avoid: width, height, top",
                        "Hover scale: 1.05×",
                      ],
                    },
                  ].map((p, i) => (
                    <div
                      key={p.title}
                      style={{
                        ...ani(120 + i * 75),
                        padding: "26px",
                        borderRadius: 20,
                        border: "1px solid rgba(141,73,37,0.1)",
                        background: "#fdfaf1",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 11,
                            background: "rgba(141,73,37,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 20, color: "#8D4925" }}
                          >
                            {p.icon}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#3A2618" }}>
                          {p.title}
                        </span>
                      </div>
                      {p.lines.map((line) => (
                        <p
                          key={line}
                          style={{
                            fontSize: 12,
                            color: "rgba(141,73,37,0.65)",
                            lineHeight: 2.1,
                            borderBottom: "1px solid rgba(141,73,37,0.05)",
                          }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    ...ani(360),
                    padding: "20px 24px",
                    borderRadius: 20,
                    border: "1px solid rgba(141,73,37,0.1)",
                    background: "#fdfaf1",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(141,73,37,0.4)",
                      marginBottom: 16,
                    }}
                  >
                    Live demos — hover to interact
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                    {[
                      { icon: "local_shipping", label: "Lift" },
                      { icon: "restaurant", label: "Scale" },
                      { icon: "check_circle", label: "Press", dark: true },
                      { icon: "favorite", label: "Color" },
                    ].map(({ icon, label, dark }) => (
                      <div
                        key={label}
                        style={{
                          padding: "18px",
                          borderRadius: 14,
                          background: dark ? "#8D4925" : "white",
                          border: dark ? "none" : "1px solid rgba(141,73,37,0.1)",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "transform 0.25s ease, box-shadow 0.25s ease",
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          const ico = el.querySelector(".demo-icon") as HTMLElement | null;
                          if (label === "Lift") {
                            el.style.transform = "translateY(-6px)";
                            el.style.boxShadow = "0 12px 28px rgba(0,0,0,0.1)";
                          }
                          if (label === "Scale") el.style.transform = "scale(1.06)";
                          if (label === "Color" && ico) {
                            ico.style.color = "#8D4925";
                            ico.style.transform = "scale(1.15)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          const ico = el.querySelector(".demo-icon") as HTMLElement | null;
                          el.style.transform = "";
                          el.style.boxShadow = "";
                          if (ico) {
                            ico.style.color = "";
                            ico.style.transform = "";
                          }
                        }}
                        onMouseDown={(e) => {
                          if (label === "Press")
                            (e.currentTarget as HTMLElement).style.transform = "scale(0.93)";
                        }}
                        onMouseUp={(e) => {
                          if (label === "Press")
                            (e.currentTarget as HTMLElement).style.transform = "";
                        }}
                      >
                        <span
                          className="material-symbols-outlined demo-icon"
                          style={{
                            fontSize: 30,
                            color: dark
                              ? "white"
                              : label === "Color"
                                ? "rgba(141,73,37,0.18)"
                                : "#8D4925",
                            transition: "color 0.2s, transform 0.2s",
                          }}
                        >
                          {icon}
                        </span>
                        <p
                          style={{
                            fontSize: 11,
                            color: dark ? "rgba(255,255,255,0.75)" : "#8D4925",
                            marginTop: 8,
                            fontWeight: 600,
                          }}
                        >
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Slide 8 — Fin */}
            {currentSlide === 8 && (
              <div className="mx-auto w-full max-w-2xl text-center">
                <div
                  style={{
                    animation: "floatY 5s ease-in-out infinite",
                    display: "inline-block",
                    marginBottom: 36,
                  }}
                >
                  <Image
                    src="/images/logo/kk-white.svg"
                    alt=""
                    width={84}
                    height={84}
                    style={{ opacity: 0.92 }}
                  />
                </div>
                <h1
                  style={{
                    ...ani(100),
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: "clamp(48px,6vw,72px)",
                    fontWeight: 700,
                    color: "white",
                    lineHeight: 1.08,
                    letterSpacing: "-1.5px",
                    marginBottom: 20,
                  }}
                >
                  Kuteera Kitchen
                </h1>
                <p
                  style={{
                    ...ani(200),
                    fontSize: 19,
                    color: "rgba(255,192,106,0.8)",
                    fontWeight: 600,
                    fontStyle: "italic",
                    marginBottom: 14,
                  }}
                >
                  &ldquo;Homely, Tasty, Healthy.&rdquo;
                </p>
                <p
                  style={{
                    ...ani(300),
                    fontSize: 14,
                    color: "rgba(255,255,255,0.32)",
                    marginBottom: 56,
                  }}
                >
                  Built with warmth for authentic home-cooked Indian meals.
                </p>
                <div
                  style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}
                >
                  {["Playfair Display", "Plus Jakarta Sans", "Material Symbols"].map((f, i) => (
                    <span
                      key={f}
                      style={{
                        ...ani(400 + i * 55),
                        padding: "7px 18px",
                        borderRadius: 100,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <p
                  style={{
                    ...ani(600),
                    fontSize: 11,
                    color: "rgba(255,255,255,0.18)",
                    marginTop: 52,
                  }}
                >
                  © 2026 Kuteera Kitchen · Brand Kit
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
