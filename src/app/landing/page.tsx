"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-v2-playfair",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-v2-plus-jakarta",
});

/* ─── Data ─────────────────────────────────────────────────────────────── */

const services = [
  {
    icon: "lunch_dining",
    title: "Daily Fresh Orders",
    description:
      "Order wholesome, home-cooked meals for today or plan ahead for the week. Every dish is prepared fresh the same morning it's delivered.",
    color: "#8D4925",
  },
  {
    icon: "calendar_month",
    title: "Meal Subscriptions",
    description:
      "Lock in your weekly or monthly meal plan and never worry about what's for lunch again. Flexible, affordable, and delicious every day.",
    color: "#1b4332",
  },
  {
    icon: "celebration",
    title: "Festival & Event Specials",
    description:
      "Celebrate festivals and occasions with curated traditional spreads — from Onam Sadhya to festive combos — crafted exactly like home.",
    color: "#7c3d12",
  },
];

const testimonials = [
  {
    name: "Priya Nair",
    city: "Bengaluru",
    rating: 5,
    text: "Feels exactly like mom's cooking. The sambhar and rice combo is something I look forward to every single day.",
  },
  {
    name: "Rajan Menon",
    city: "Kochi",
    rating: 5,
    text: "I've tried multiple tiffin services but Kuteera Kitchen is on another level. Authentic, consistent, and always on time.",
  },
  {
    name: "Anitha Krishnan",
    city: "Bengaluru",
    rating: 5,
    text: "The subscription plan is incredibly convenient. I no longer stress about lunch and the variety keeps things interesting.",
  },
  {
    name: "Suresh Babu",
    city: "Mysuru",
    rating: 4,
    text: "Solid home food. The plated meals are filling and well-portioned. Great value for what you pay.",
  },
  {
    name: "Deepa Varma",
    city: "Kochi",
    rating: 5,
    text: "Ordered for our office team and everyone loved it. The festival special was a huge hit. Will order again!",
  },
];

const products = [
  {
    icon: "set_meal",
    image: "/images/menu/new/rice.png",
    name: "A La Carte Items",
    description:
      "Individual dishes — rice, curries, sabzi, dal — priced by meal type. Mix and match to build your plate.",
    tag: "Flexible",
  },
  {
    icon: "local_dining",
    image: "/images/hero/thalidosa.png",
    name: "Combo Packs",
    description:
      "Curated bundles that pair well together. A full meal sorted in one click — great value, zero guesswork.",
    tag: "Best Value",
  },
  {
    icon: "restaurant",
    image: "/images/hero/thali.png",
    name: "Plated Specials",
    description:
      "Pre-assembled complete meals with all components included. A balanced plate, ready to eat.",
    tag: "Complete Meal",
  },
  {
    icon: "cake",
    image: "/images/menu/new/south-festival.png",
    name: "Festival Spreads",
    description:
      "Seasonal and festive offerings — Onam Sadhya, Ugadi specials, and more. Limited, authentic, and made to order.",
    tag: "Seasonal",
  },
];

const stats = [
  { value: "3+", label: "Cities Served" },
  { value: "500+", label: "Happy Customers" },
  { value: "10K+", label: "Meals Delivered" },
  { value: "100%", label: "Home-style Recipes" },
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 },
    );

    const sections = document.querySelectorAll("[data-animate]");
    sections.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  const navLinks = [
    { label: "Home", href: "#hero" },
    { label: "About", href: "#about" },
    { label: "Services", href: "#services" },
    { label: "Products", href: "#products" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div
      className={`${playfair.variable} ${plusJakarta.variable}`}
      style={{ fontFamily: "var(--font-v2-plus-jakarta), sans-serif", overflowX: "hidden" }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: scrolled ? "rgba(253,250,241,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 24px rgba(141,73,37,0.08)" : "none",
          transition: "all 0.3s ease",
          borderBottom: scrolled ? "1px solid rgba(141,73,37,0.1)" : "none",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: "#8D4925",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "#fdfaf1", fontSize: 20 }}
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

          {/* Desktop Nav */}
          <nav
            style={{ display: "flex", alignItems: "center", gap: 32 }}
            className="hidden md:flex"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  color: "#6B5344",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#8D4925")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6B5344")}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 12 }}
            className="hidden md:flex"
          >
            <Link
              href="/customer-v2/home"
              style={{
                color: "#8D4925",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: 8,
                border: "1.5px solid #8D4925",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#8D4925";
                e.currentTarget.style.color = "#fdfaf1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#8D4925";
              }}
            >
              Sign In
            </Link>
            <Link
              href="/customer-v2/new-order"
              style={{
                background: "#8D4925",
                color: "#fdfaf1",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                padding: "8px 20px",
                borderRadius: 8,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(141,73,37,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#7a3d1f";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#8D4925";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Order Now
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "#3A2618",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              background: "#fdfaf1",
              padding: "16px 24px 24px",
              borderTop: "1px solid rgba(141,73,37,0.1)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block",
                  color: "#3A2618",
                  fontSize: 16,
                  fontWeight: 500,
                  textDecoration: "none",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(141,73,37,0.08)",
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              <Link
                href="/customer-v2/home"
                style={{
                  textAlign: "center",
                  color: "#8D4925",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1.5px solid #8D4925",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/customer-v2/new-order"
                style={{
                  textAlign: "center",
                  background: "#8D4925",
                  color: "#fdfaf1",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "10px 16px",
                  borderRadius: 8,
                }}
              >
                Order Now
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #8D4925 0%, #5c2d0e 50%, #3A1A08 100%)",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "-5%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            left: "-8%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            right: "15%",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,200,100,0.06)",
          }}
        />

        {/* Dot grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "120px 24px 80px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
          className="hero-grid"
        >
          {/* Left: Text */}
          <div className="animate-fade-in">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 100,
                padding: "6px 16px",
                marginBottom: 28,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "#ffc06a" }}
              >
                local_fire_department
              </span>
              <span style={{ color: "#ffc06a", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                FRESHLY PREPARED EVERY DAY
              </span>
            </div>

            <h1
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: "clamp(36px, 5vw, 64px)",
                color: "#fdfaf1",
                lineHeight: 1.15,
                marginBottom: 24,
              }}
            >
              Home-cooked
              <br />
              <span style={{ color: "#ffc06a" }}>Meals</span>, Delivered
              <br />
              Fresh.
            </h1>

            <p
              style={{
                color: "rgba(253,250,241,0.75)",
                fontSize: 17,
                lineHeight: 1.7,
                marginBottom: 40,
                maxWidth: 480,
              }}
            >
              Not a restaurant. Not a cloud kitchen. Kuteera Kitchen is your daily dose of
              authentic, home-style Indian cooking — prepared with care and delivered to your door.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link
                href="/customer-v2/new-order"
                style={{
                  background: "#ffc06a",
                  color: "#3A1A08",
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  padding: "14px 32px",
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(255,192,106,0.4)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 28px rgba(255,192,106,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,192,106,0.4)";
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  shopping_bag
                </span>
                Order Today&apos;s Meal
              </Link>
              <a
                href="#about"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fdfaf1",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "14px 28px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
              >
                Our Story
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  arrow_downward
                </span>
              </a>
            </div>

            {/* Quick stats */}
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 56,
                paddingTop: 32,
                borderTop: "1px solid rgba(255,255,255,0.12)",
                flexWrap: "wrap",
              }}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontFamily: "var(--font-v2-playfair), serif",
                      fontWeight: 700,
                      fontSize: 28,
                      color: "#ffc06a",
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ color: "rgba(253,250,241,0.6)", fontSize: 12, marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Decorative card */}
          <div
            className="animate-slide-in-right hidden md:flex"
            style={{ justifyContent: "center" }}
          >
            <div style={{ position: "relative", width: 380 }}>
              {/* Main card */}
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 24,
                  padding: 32,
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    marginBottom: 20,
                    overflow: "hidden",
                    height: 200,
                    position: "relative",
                  }}
                >
                  <Image
                    src="/images/hero/thali.png"
                    alt="South Indian Thali"
                    fill
                    style={{ objectFit: "cover", borderRadius: 16 }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: "rgba(253,250,241,0.5)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Today&apos;s Special
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-v2-playfair), serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: "#fdfaf1",
                    }}
                  >
                    South Indian Thali
                  </div>
                  <div style={{ color: "rgba(253,250,241,0.65)", fontSize: 13, marginTop: 6 }}>
                    Rice · Sambhar · Rasam · Poriyal · Papad · Pickle
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-v2-playfair), serif",
                        fontWeight: 700,
                        fontSize: 26,
                        color: "#ffc06a",
                      }}
                    >
                      ₹120
                    </span>
                    <span style={{ color: "rgba(253,250,241,0.5)", fontSize: 12, marginLeft: 8 }}>
                      / person
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#ffc06a",
                      color: "#3A1A08",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "6px 16px",
                      borderRadius: 100,
                    }}
                  >
                    ORDER NOW
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                  {["Fresh", "Vegetarian", "Home-style"].map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "rgba(253,250,241,0.7)",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "4px 10px",
                        borderRadius: 100,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  background: "#1b4332",
                  border: "3px solid rgba(253,250,241,0.15)",
                  borderRadius: 16,
                  padding: "12px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#4ade80", fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>
                  DELIVERS
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-v2-playfair), serif",
                    color: "#fdfaf1",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  7am
                </div>
                <div style={{ color: "rgba(253,250,241,0.5)", fontSize: 10 }}>Daily</div>
              </div>

              {/* Floating rating */}
              <div
                style={{
                  position: "absolute",
                  bottom: -18,
                  left: -18,
                  background: "#fdfaf1",
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined"
                      style={{ fontSize: 14, color: "#f59e0b" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3A2618" }}>4.9</span>
                <span style={{ fontSize: 11, color: "#6B5344" }}>500+ reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            animation: "bounce 2s infinite",
            zIndex: 1,
          }}
        >
          <div style={{ color: "rgba(253,250,241,0.4)", fontSize: 11, letterSpacing: 1.5 }}>
            SCROLL
          </div>
          <span
            className="material-symbols-outlined"
            style={{ color: "rgba(253,250,241,0.4)", fontSize: 20 }}
          >
            keyboard_arrow_down
          </span>
        </div>
      </section>

      {/* ── About Us ───────────────────────────────────────────────────────── */}
      <section id="about" data-animate style={{ background: "#fdfaf1", padding: "100px 24px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }}
          className="about-grid"
        >
          {/* Left: Visual */}
          <div
            style={{ position: "relative" }}
            className={visibleSections.has("about") ? "animate-slide-in-left" : ""}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #8D4925 0%, #5c2d0e 100%)",
                borderRadius: 24,
                padding: 40,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    height: 180,
                    position: "relative",
                    marginBottom: 20,
                  }}
                >
                  <Image
                    src="/images/menu/idli-sambar.jpg"
                    alt="Home cooked meal"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(92,45,14,0.6) 0%, transparent 60%)",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#fdfaf1",
                    lineHeight: 1.4,
                    marginBottom: 16,
                  }}
                >
                  &ldquo;Every meal tells the story of a home.&rdquo;
                </p>
                <p style={{ color: "rgba(253,250,241,0.7)", fontSize: 14, lineHeight: 1.7 }}>
                  Founded with the belief that the best food is the kind you grew up eating —
                  simple, wholesome, and made with love.
                </p>
              </div>
            </div>

            {/* Values grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
              {[
                { icon: "eco", label: "Fresh Ingredients", color: "#1b4332" },
                { icon: "timer", label: "Delivered On Time", color: "#8D4925" },
                { icon: "favorite", label: "Made with Care", color: "#7c3d12" },
                { icon: "verified", label: "100% Hygienic", color: "#1b4332" },
              ].map((v) => (
                <div
                  key={v.label}
                  style={{
                    background: "#fff8e7",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid rgba(141,73,37,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: v.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: "#fdfaf1" }}
                    >
                      {v.icon}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#3A2618" }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Text */}
          <div className={visibleSections.has("about") ? "animate-slide-in-right" : ""}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(141,73,37,0.08)",
                borderRadius: 100,
                padding: "6px 16px",
                marginBottom: 24,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "#8D4925" }}
              >
                auto_stories
              </span>
              <span style={{ color: "#8D4925", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                OUR STORY
              </span>
            </div>

            <h2
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                color: "#3A2618",
                lineHeight: 1.2,
                marginBottom: 24,
              }}
            >
              A Kitchen Built on the <span style={{ color: "#8D4925" }}>Love of Home Cooking</span>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ color: "#6B5344", fontSize: 16, lineHeight: 1.75 }}>
                Kuteera Kitchen was born out of a simple frustration — why is it so hard to find
                food that actually tastes like home? Not restaurant-fancy, not canteen-bland. Just
                real, nourishing, everyday Indian food.
              </p>
              <p style={{ color: "#6B5344", fontSize: 16, lineHeight: 1.75 }}>
                We started in Bengaluru with a small team of home cooks, a handful of loyal
                customers, and one mission: to make the comfort of a home-cooked meal accessible to
                everyone, every single day.
              </p>
              <p style={{ color: "#6B5344", fontSize: 16, lineHeight: 1.75 }}>
                Today we serve thousands of meals across multiple cities, but our philosophy remains
                unchanged — cook it like you&apos;d cook it at home, and deliver it like you care.
              </p>
            </div>

            <a
              href="#services"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 32,
                color: "#8D4925",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "2px solid #8D4925",
                paddingBottom: 2,
                transition: "gap 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.gap = "14px")}
              onMouseLeave={(e) => (e.currentTarget.style.gap = "8px")}
            >
              What We Offer
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                arrow_forward
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────────── */}
      <section id="services" data-animate style={{ background: "#fff8e7", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(141,73,37,0.08)",
                borderRadius: 100,
                padding: "6px 16px",
                marginBottom: 20,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "#8D4925" }}
              >
                room_service
              </span>
              <span style={{ color: "#8D4925", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                WHAT WE DO
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                color: "#3A2618",
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              Our Services
            </h2>
            <p
              style={{
                color: "#6B5344",
                fontSize: 16,
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Whether you need a single meal or a full month&apos;s plan, we&apos;ve got you covered
              with flexible options built around your life.
            </p>
          </div>

          {/* Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {services.map((service, i) => (
              <div
                key={service.title}
                style={{
                  background: "#fdfaf1",
                  borderRadius: 20,
                  padding: 32,
                  border: "1px solid rgba(141,73,37,0.1)",
                  transition: "all 0.3s ease",
                  cursor: "default",
                  animationDelay: `${i * 0.1}s`,
                }}
                className={visibleSections.has("services") ? "animate-slide-up" : ""}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 20px 48px rgba(141,73,37,0.12)";
                  e.currentTarget.style.borderColor = service.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "rgba(141,73,37,0.1)";
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: service.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: "#fdfaf1" }}
                  >
                    {service.icon}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "#3A2618",
                    marginBottom: 12,
                  }}
                >
                  {service.title}
                </h3>
                <p style={{ color: "#6B5344", fontSize: 14, lineHeight: 1.75 }}>
                  {service.description}
                </p>
                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: "1px solid rgba(141,73,37,0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: service.color,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Learn more
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Food Gallery Strip ─────────────────────────────────────────────── */}
      <div style={{ background: "#3A1A08", padding: "40px 0", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingInline: 24,
          }}
          className="scrollbar-hide"
        >
          {[
            { src: "/images/menu/idli-sambar.jpg", label: "Idli Sambar" },
            { src: "/images/menu/masala-dosa.jpg", label: "Masala Dosa" },
            { src: "/images/menu/new/pongal.png", label: "Pongal" },
            { src: "/images/menu/poori.jpg", label: "Poori" },
            { src: "/images/menu/rava-dosa.jpg", label: "Rava Dosa" },
            { src: "/images/menu/new/chapathi.png", label: "Chapathi" },
            { src: "/images/menu/upma.jpg", label: "Upma" },
            { src: "/images/menu/vada-sambar.jpg", label: "Vada Sambar" },
            { src: "/images/menu/new/idly.png", label: "Idly" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flexShrink: 0,
                width: 180,
                height: 220,
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Image
                src={item.src}
                alt={item.label}
                fill
                style={{ objectFit: "cover", transition: "transform 0.4s ease" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.08)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")
                }
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "32px 14px 14px",
                  background: "linear-gradient(to top, rgba(58,26,8,0.85) 0%, transparent 100%)",
                  color: "#fdfaf1",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section
        id="testimonials"
        data-animate
        style={{ background: "#fdfaf1", padding: "100px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(141,73,37,0.08)",
                borderRadius: 100,
                padding: "6px 16px",
                marginBottom: 20,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "#8D4925" }}
              >
                format_quote
              </span>
              <span style={{ color: "#8D4925", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                WHAT PEOPLE SAY
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                color: "#3A2618",
              }}
            >
              Loved by Families Across Cities
            </h2>
          </div>

          {/* Scrollable cards */}
          <div
            style={{
              display: "flex",
              gap: 20,
              overflowX: "auto",
              paddingBottom: 12,
            }}
            className="scrollbar-hide"
          >
            {testimonials.map((t, i) => (
              <div
                key={i}
                style={{
                  minWidth: 300,
                  maxWidth: 340,
                  background: "#fff8e7",
                  borderRadius: 20,
                  padding: 28,
                  border: "1px solid rgba(141,73,37,0.1)",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(141,73,37,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Stars */}
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[...Array(t.rating)].map((_, j) => (
                    <span
                      key={j}
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: "#f59e0b" }}
                    >
                      star
                    </span>
                  ))}
                  {[...Array(5 - t.rating)].map((_, j) => (
                    <span
                      key={j}
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: "#d1c5b5" }}
                    >
                      star
                    </span>
                  ))}
                </div>

                {/* Quote icon */}
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 28,
                    color: "rgba(141,73,37,0.15)",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  format_quote
                </span>

                <p
                  style={{
                    color: "#3A2618",
                    fontSize: 14,
                    lineHeight: 1.7,
                    marginBottom: 20,
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(141,73,37,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#8D4925",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: "#fdfaf1", fontSize: 14, fontWeight: 700 }}>
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#3A2618" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#6B5344" }}>{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ───────────────────────────────────────────────────────── */}
      <section
        id="products"
        data-animate
        style={{
          background: "linear-gradient(180deg, #8D4925 0%, #5c2d0e 100%)",
          padding: "100px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 100,
                padding: "6px 16px",
                marginBottom: 20,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "#ffc06a" }}
              >
                menu_book
              </span>
              <span style={{ color: "#ffc06a", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                OUR MENU
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                color: "#fdfaf1",
                marginBottom: 16,
              }}
            >
              Something for Every Appetite
            </h2>
            <p
              style={{
                color: "rgba(253,250,241,0.7)",
                fontSize: 16,
                maxWidth: 480,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              From individual dishes to complete spreads, we offer a range of options to fit your
              hunger and your budget.
            </p>
          </div>

          {/* Product Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {products.map((product, i) => (
              <div
                key={product.name}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  padding: 28,
                  transition: "all 0.3s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.borderColor = "rgba(255,192,106,0.4)";
                  e.currentTarget.style.boxShadow = "0 20px 48px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    height: 160,
                    position: "relative",
                    marginBottom: 20,
                  }}
                >
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(58,26,8,0.5) 0%, transparent 60%)",
                    }}
                  />
                </div>

                <div
                  style={{
                    background: "rgba(255,192,106,0.15)",
                    color: "#ffc06a",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    padding: "3px 10px",
                    borderRadius: 100,
                    display: "inline-block",
                    marginBottom: 12,
                  }}
                >
                  {product.tag}
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#fdfaf1",
                    marginBottom: 10,
                  }}
                >
                  {product.name}
                </h3>
                <p style={{ color: "rgba(253,250,241,0.65)", fontSize: 13, lineHeight: 1.7 }}>
                  {product.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <Link
              href="/customer-v2/new-order"
              style={{
                background: "#ffc06a",
                color: "#3A1A08",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                padding: "14px 36px",
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 20px rgba(255,192,106,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,192,106,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,192,106,0.3)";
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                restaurant_menu
              </span>
              Browse Today&apos;s Menu
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <section id="contact" data-animate style={{ background: "#fdfaf1", padding: "100px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(141,73,37,0.08)",
                borderRadius: 100,
                padding: "6px 16px",
                marginBottom: 20,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "#8D4925" }}
              >
                contact_mail
              </span>
              <span style={{ color: "#8D4925", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                GET IN TOUCH
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-v2-playfair), serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.5vw, 44px)",
                color: "#3A2618",
                marginBottom: 12,
              }}
            >
              We&apos;d Love to Hear From You
            </h2>
            <p style={{ color: "#6B5344", fontSize: 16, maxWidth: 460, margin: "0 auto" }}>
              Questions, feedback, or just want to know more? Drop us a message and we&apos;ll get
              back to you quickly.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: 48,
              alignItems: "start",
            }}
            className="contact-grid"
          >
            {/* Left: Contact Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                {
                  icon: "location_on",
                  title: "Cities We Serve",
                  content: "Bengaluru · Kochi · Mysuru",
                  color: "#8D4925",
                },
                {
                  icon: "phone",
                  title: "Call or WhatsApp",
                  content: "+91 98765 43210",
                  color: "#1b4332",
                },
                {
                  icon: "mail",
                  title: "Email Us",
                  content: "hello@kuteera.kitchen",
                  color: "#7c3d12",
                },
                {
                  icon: "schedule",
                  title: "Order Hours",
                  content: "Order by 8 PM for next day delivery",
                  color: "#8D4925",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                    background: "#fff8e7",
                    borderRadius: 16,
                    padding: 20,
                    border: "1px solid rgba(141,73,37,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: item.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20, color: "#fdfaf1" }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6B5344",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        marginBottom: 4,
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#3A2618" }}>
                      {item.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Form */}
            <div
              style={{
                background: "#fff8e7",
                borderRadius: 24,
                padding: 40,
                border: "1px solid rgba(141,73,37,0.1)",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-v2-playfair), serif",
                  fontWeight: 700,
                  fontSize: 24,
                  color: "#3A2618",
                  marginBottom: 24,
                }}
              >
                Send a Message
              </h3>

              <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3A2618",
                        marginBottom: 6,
                      }}
                    >
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Anitha Krishnan"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1.5px solid rgba(141,73,37,0.2)",
                        background: "#fdfaf1",
                        fontSize: 14,
                        color: "#3A2618",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#8D4925")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(141,73,37,0.2)")}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#3A2618",
                        marginBottom: 6,
                      }}
                    >
                      Phone / Email
                    </label>
                    <input
                      type="text"
                      placeholder="email or phone"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1.5px solid rgba(141,73,37,0.2)",
                        background: "#fdfaf1",
                        fontSize: 14,
                        color: "#3A2618",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#8D4925")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(141,73,37,0.2)")}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#3A2618",
                      marginBottom: 6,
                    }}
                  >
                    City
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1.5px solid rgba(141,73,37,0.2)",
                      background: "#fdfaf1",
                      fontSize: 14,
                      color: "#3A2618",
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#8D4925")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(141,73,37,0.2)")}
                  >
                    <option value="">Select your city</option>
                    <option value="bengaluru">Bengaluru</option>
                    <option value="kochi">Kochi</option>
                    <option value="mysuru">Mysuru</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#3A2618",
                      marginBottom: 6,
                    }}
                  >
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us what you're looking for, or ask us anything..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1.5px solid rgba(141,73,37,0.2)",
                      background: "#fdfaf1",
                      fontSize: 14,
                      color: "#3A2618",
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                      fontFamily: "var(--font-v2-plus-jakarta), sans-serif",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#8D4925")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(141,73,37,0.2)")}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: "#8D4925",
                    color: "#fdfaf1",
                    fontSize: 15,
                    fontWeight: 700,
                    border: "none",
                    padding: "13px 24px",
                    borderRadius: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.2s",
                    boxShadow: "0 4px 16px rgba(141,73,37,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#7a3d1f";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#8D4925";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    send
                  </span>
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#3A1A08", padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 48,
              marginBottom: 56,
            }}
            className="footer-grid"
          >
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "#ffc06a",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
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
                    fontSize: 18,
                    color: "#fdfaf1",
                  }}
                >
                  Kuteera Kitchen
                </span>
              </div>
              <p
                style={{
                  color: "rgba(253,250,241,0.55)",
                  fontSize: 14,
                  lineHeight: 1.75,
                  maxWidth: 280,
                }}
              >
                Home-style Indian meals, prepared fresh every morning and delivered to your door.
                Because good food shouldn&apos;t be complicated.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                {["instagram", "facebook", "chat"].map((icon) => (
                  <div
                    key={icon}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "rgba(255,192,106,0.2)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")
                    }
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: "rgba(253,250,241,0.6)" }}
                    >
                      {icon}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4
                style={{
                  color: "#fdfaf1",
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 20,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Quick Links
              </h4>
              {["About Us", "Our Menu", "Subscriptions", "Festival Specials"].map((link) => (
                <div key={link} style={{ marginBottom: 12 }}>
                  <a
                    href="#"
                    style={{
                      color: "rgba(253,250,241,0.55)",
                      fontSize: 14,
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffc06a")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253,250,241,0.55)")}
                  >
                    {link}
                  </a>
                </div>
              ))}
            </div>

            {/* Cities */}
            <div>
              <h4
                style={{
                  color: "#fdfaf1",
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 20,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Cities
              </h4>
              {["Bengaluru", "Kochi", "Mysuru", "Coming Soon…"].map((city, i) => (
                <div key={city} style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      color: i === 3 ? "rgba(253,250,241,0.3)" : "rgba(253,250,241,0.55)",
                      fontSize: 14,
                      fontStyle: i === 3 ? "italic" : "normal",
                    }}
                  >
                    {city}
                  </span>
                </div>
              ))}
            </div>

            {/* Support */}
            <div>
              <h4
                style={{
                  color: "#fdfaf1",
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 20,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Support
              </h4>
              {["FAQs", "Order Help", "Delivery Info", "Contact Us"].map((link) => (
                <div key={link} style={{ marginBottom: 12 }}>
                  <a
                    href="#contact"
                    style={{
                      color: "rgba(253,250,241,0.55)",
                      fontSize: 14,
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffc06a")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253,250,241,0.55)")}
                  >
                    {link}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span style={{ color: "rgba(253,250,241,0.35)", fontSize: 13 }}>
              © 2026 Kuteera Kitchen. All rights reserved.
            </span>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacy Policy", "Terms of Service"].map((link) => (
                <a
                  key={link}
                  href="#"
                  style={{
                    color: "rgba(253,250,241,0.35)",
                    fontSize: 13,
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffc06a")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253,250,241,0.35)")}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Material Symbols + Responsive overrides */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          -webkit-font-feature-settings: "liga";
          -webkit-font-smoothing: antialiased;
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .contact-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `,
        }}
      />
    </div>
  );
}
