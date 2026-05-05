"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { League_Spartan, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-v2-playfair",
});

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-v2-league-spartan",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-v2-plus-jakarta",
});

/* ─── Data ─────────────────────────────────────────────────────────────── */

const services = [
  {
    icon: "local_shipping",
    image: "/images/menu/placeholder_lunch.png",
    title: "Home Delivery",
    description:
      "Get wholesome, home-style meals delivered straight to your doorstep, whether you need lunch for today or dinner for the family.",
    color: "#8D4925",
  },
  {
    icon: "groups",
    image: "/images/menu/placeholder_event.png",
    title: "Corporate Orders",
    description:
      "Plan reliable office lunches and team meals with comforting Indian food that scales well for workplaces, meetings, and recurring staff orders.",
    color: "#1b4332",
  },
  {
    icon: "celebration",
    image: "/images/menu/placeholder_weekend.png",
    title: "Party Orders",
    description:
      "Serve generous spreads for house parties, celebrations, and special gatherings with crowd-pleasing menus made in our signature home-style way.",
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
    city: "Mysuru",
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
    city: "Bengaluru",
    rating: 5,
    text: "Ordered for our office team and everyone loved it. The festival special was a huge hit. Will order again!",
  },
];

const products = [
  {
    icon: "set_meal",
    image: "/images/menu/placeholder_breakfast.png",
    name: "Breakfast",
    description:
      "Individual dishes — rice, curries, sabzi, dal — priced by meal type. Mix and match to build your plate.",
    tag: "Flexible",
    badgeText: "Only for Mysuru",
  },
  {
    icon: "local_dining",
    image: "/images/menu/placeholder_lunch.png",
    name: "Lunch",
    description:
      "Curated bundles that pair well together. A full meal sorted in one click — great value, zero guesswork.",
    tag: "Best Value",
    badgeText: "Only for Mysuru",
  },
  {
    icon: "restaurant",
    image: "/images/menu/placeholder_dinner.png",
    name: "Dinner",
    description:
      "Pre-assembled complete meals with all components included. A balanced plate, ready to eat.",
    tag: "Complete Meal",
    badgeText: "Only for Mysuru",
  },
  {
    icon: "cake",
    image: "/images/menu/placeholder_condiments.png",
    name: "Condiments",
    description:
      "Seasonal and festive offerings — Onam Sadhya, Ugadi specials, and more. Limited, authentic, and made to order.",
    tag: "Seasonal",
  },
  {
    icon: "cake",
    image: "/images/menu/placeholder_savouries.png",
    name: "Savouries",
    description:
      "Seasonal and festive offerings — Onam Sadhya, Ugadi specials, and more. Limited, authentic, and made to order.",
    tag: "Seasonal",
  },

  {
    icon: "cake",
    image: "/images/menu/placeholder_sweets.png",
    name: "Sweets",
    description:
      "Seasonal and festive offerings — Onam Sadhya, Ugadi specials, and more. Limited, authentic, and made to order.",
    tag: "Seasonal",
  },
  {
    icon: "cake",
    image: "/images/menu/placeholder_weekend.png",
    name: "Weekend/Festival Specials",
    description:
      "Seasonal and festive offerings — Onam Sadhya, Ugadi specials, and more. Limited, authentic, and made to order.",
    tag: "Seasonal",
  },
  {
    icon: "cake",
    image: "/images/menu/placeholder_event.png",
    name: "Event Specials",
    description:
      "Seasonal and festive offerings — Onam Sadhya, Ugadi specials, and more. Limited, authentic, and made to order.",
    tag: "Seasonal",
  },
];

const stats = [
  { value: "2", label: "Cities Served" },
  { value: "500+", label: "Happy Customers" },
  { value: "10K+", label: "Meals Delivered" },
  { value: "100%", label: "Home-style Recipes" },
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [statValues, setStatValues] = useState([0, 0, 0, 0]);
  const [activeProduct, setActiveProduct] = useState(0);
  const [productAnimating, setProductAnimating] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const statsAnimatedRef = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-reveal: add .revealed to [data-animate] sections and [data-reveal] elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll("[data-animate], [data-reveal]")
      .forEach((el) => observer.observe(el));
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  // Stat counter animation
  useEffect(() => {
    const targets = [2, 500, 10, 100];
    const heroStats = document.getElementById("hero-stats");
    if (!heroStats) return;
    const statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsAnimatedRef.current) {
          statsAnimatedRef.current = true;
          const duration = 1800;
          const startTime = performance.now();
          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setStatValues(targets.map((t) => Math.floor(t * eased)));
            if (progress < 1) requestAnimationFrame(tick);
            else setStatValues(targets);
          };
          requestAnimationFrame(tick);
          statsObserver.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    statsObserver.observe(heroStats);
    return () => statsObserver.disconnect();
  }, []);

  // Auto-scroll product carousel every 3s
  useEffect(() => {
    const timer = setInterval(() => {
      setProductAnimating(true);
      setTimeout(() => {
        setActiveProduct((p) => (p + 1) % products.length);
        setProductAnimating(false);
      }, 250);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const navLinks = [
    { label: "Home", href: "#hero" },
    { label: "About", href: "#about" },
    { label: "Offerings", href: "#services" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div
      className={`${playfair.variable} ${leagueSpartan.variable} ${plusJakarta.variable}`}
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
          background: "rgba(253,250,241,0.96)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 1px 24px rgba(141,73,37,0.08)",
          transition: "all 0.3s ease",
          borderBottom: "1px solid rgba(141,73,37,0.1)",
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
          <Link
            href="/"
            style={{ display: "flex", alignItems: "flex-start", gap: 10, textDecoration: "none" }}
          >
            <Image
              src="/images/logo/kk-brown.svg"
              alt="Kuteera Kitchen"
              width={36}
              height={36}
              style={{ height: 36, width: "auto", transition: "opacity 0.3s ease" }}
              priority
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 1 }}>
              <span
                style={{
                  fontFamily: "var(--font-v2-league-spartan), sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#3A2618",
                  letterSpacing: "0",
                  lineHeight: 1.05,
                  transition: "color 0.3s ease",
                }}
              >
                Kuteera Kitchen
              </span>
              <span
                style={{
                  fontFamily: '"Lucida Handwriting", "Lucida Calligraphy", cursive',
                  fontWeight: 400,
                  fontSize: 14,
                  letterSpacing: "0.01em",
                  color: "rgba(58,26,8,0.72)",
                  lineHeight: 1.1,
                  transition: "color 0.3s ease",
                }}
              >
                Homely, Tasty, Healthy
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ alignItems: "center", gap: 32 }} className="nav-desktop">
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
          <div style={{ alignItems: "center", gap: 12 }} className="nav-desktop">
            <Link
              href="/customer-v2/new-order"
              style={{
                background: "#8D4925",
                color: "#fdfaf1",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                padding: "0 20px",
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 8,
                transition: "all 0.2s",
                boxSizing: "border-box",
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
            className="nav-mobile"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "#3A2618",
              transition: "color 0.3s",
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
          className="hero-grid hero-content-pad"
        >
          {/* Left: Text */}
          <div className="animate-fade-in">
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

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }} className="hero-ctas">
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
              id="hero-stats"
              className="hero-stats-row"
              style={{
                display: "flex",
                gap: 32,
                marginTop: 56,
                paddingTop: 32,
                borderTop: "1px solid rgba(255,255,255,0.12)",
                flexWrap: "wrap",
              }}
            >
              {stats.map((s, i) => {
                const suffixes = ["", "+", "K+", "%"];
                return (
                  <div key={s.label}>
                    <div
                      style={{
                        fontFamily: "var(--font-v2-playfair), serif",
                        fontWeight: 700,
                        fontSize: 28,
                        color: "#ffc06a",
                      }}
                    >
                      {statValues[i]}
                      {suffixes[i]}
                    </div>
                    <div style={{ color: "rgba(253,250,241,0.6)", fontSize: 12, marginTop: 2 }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Decorative card */}
          <div
            className="animate-slide-in-right hidden md:flex"
            style={{ justifyContent: "center" }}
          >
            <div
              style={{
                width: 420,
                animation: "float 5s ease-in-out infinite",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.08fr 0.92fr",
                  gap: 14,
                  height: 420,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    borderRadius: 26,
                    overflow: "hidden",
                    height: "100%",
                    boxShadow: "0 28px 60px rgba(0,0,0,0.22)",
                  }}
                >
                  <Image
                    src="/images/menu/placeholder_lunch.png"
                    alt="South Indian thali"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: "1.02fr 1.18fr 0.8fr",
                    gap: 14,
                    height: "100%",
                  }}
                >
                  {[
                    { src: "/images/menu/placeholder_breakfast.png", alt: "Breakfast" },
                    { src: "/images/menu/placeholder_dinner.png", alt: "Dinner" },
                    { src: "/images/menu/placeholder_event.png", alt: "Event Spread" },
                  ].map((photo) => (
                    <div
                      key={photo.src}
                      style={{
                        position: "relative",
                        borderRadius: 22,
                        overflow: "hidden",
                        height: "100%",
                        boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
                      }}
                    >
                      <Image src={photo.src} alt={photo.alt} fill style={{ objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator — hidden once user scrolls */}
        {!scrolled && (
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
        )}
      </section>

      {/* ── About Us ───────────────────────────────────────────────────────── */}
      <section
        id="about"
        data-animate
        className="section-pad"
        style={{ background: "#fdfaf1", padding: "100px 24px" }}
      >
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
          <div style={{ position: "relative" }} data-reveal>
            <div
              style={{
                background: "linear-gradient(135deg, #8D4925 0%, #5c2d0e 100%)",
                borderRadius: 12,
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
                    src="/images/menu/placeholder_weekend.png"
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
          <div data-reveal data-reveal-delay="2">
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
                ABOUT US
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
              A Kitchen Built on the <span style={{ color: "#8D4925" }}>Love for Home Cooking</span>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ color: "#6B5344", fontSize: 16, lineHeight: 1.75 }}>
                Kuteera Kitchen was born out of a simple frustration — why is it so hard to find
                food that actually tastes like home? Not restaurant-fancy, not canteen-bland. Just
                real, nourishing, everyday Indian food.
              </p>
              <p style={{ color: "#6B5344", fontSize: 16, lineHeight: 1.75 }}>
                We started in Mysuru with a small team of home cooks, a handful of loyal customers,
                and one mission: to make the comfort of a home-cooked meal accessible to everyone,
                every single day.
              </p>
              <p style={{ color: "#6B5344", fontSize: 16, lineHeight: 1.75 }}>
                Today we serve thousands of meals across multiple cities, but our philosophy remains
                unchanged — cook it like you&apos;d cook it at home, and deliver it like you care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────────── */}
      <section
        id="services"
        data-animate
        className="section-pad"
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
                room_service
              </span>
              <span style={{ color: "#ffc06a", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
                WHAT WE DO
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
              Our Services
            </h2>
            <p
              style={{
                color: "rgba(253,250,241,0.7)",
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
            className="services-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {services.map((service, i) => (
              <div
                key={service.title}
                data-reveal
                data-reveal-delay={String(i + 1)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  overflow: "hidden",
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
                {/* Image */}
                <div style={{ position: "relative", height: 160, width: "100%" }}>
                  <Image
                    src={service.image}
                    alt={service.title}
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
                {/* Text */}
                <div style={{ padding: 28 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(255,192,106,0.15)",
                      border: "1px solid rgba(255,192,106,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 22, color: "#ffc06a" }}
                    >
                      {service.icon}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-v2-playfair), serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: "#fdfaf1",
                      marginBottom: 12,
                    }}
                  >
                    {service.title}
                  </h3>
                  <p style={{ color: "rgba(253,250,241,0.65)", fontSize: 14, lineHeight: 1.75 }}>
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Food Gallery Strip (marquee) ───────────────────────────────────── */}
      <div style={{ background: "#3A1A08", padding: "40px 0", overflow: "hidden" }}>
        {/* Track duplicated for seamless loop */}
        <div className="marquee-track">
          {[
            { src: "/images/menu/placeholder_breakfast.png", label: "Breakfast" },
            { src: "/images/menu/placeholder_lunch.png", label: "Lunch" },
            { src: "/images/menu/placeholder_dinner.png", label: "Dinner" },
            { src: "/images/menu/placeholder_condiments.png", label: "Condiments" },
            { src: "/images/menu/placeholder_savouries.png", label: "Savouries" },
            { src: "/images/menu/placeholder_sweets.png", label: "Sweets" },
            { src: "/images/menu/placeholder_weekend.png", label: "Specials" },
            { src: "/images/menu/placeholder_event.png", label: "Events" },
            { src: "/images/menu/placeholder_breakfast.png", label: "Breakfast 2" },
            // duplicate for seamless loop
            { src: "/images/menu/placeholder_breakfast.png", label: "Breakfast 3" },
            { src: "/images/menu/placeholder_lunch.png", label: "Lunch 2" },
            { src: "/images/menu/placeholder_dinner.png", label: "Dinner 2" },
            { src: "/images/menu/placeholder_condiments.png", label: "Condiments 2" },
            { src: "/images/menu/placeholder_savouries.png", label: "Savouries 2" },
            { src: "/images/menu/placeholder_sweets.png", label: "Sweets 2" },
            { src: "/images/menu/placeholder_weekend.png", label: "Specials 2" },
            { src: "/images/menu/placeholder_event.png", label: "Events 2" },
            { src: "/images/menu/placeholder_breakfast.png", label: "Breakfast 4" },
          ].map((item) => (
            <div key={item.label} className="marquee-card">
              <Image
                src={item.src}
                alt={item.label.replace(" 2", "")}
                fill
                style={{ objectFit: "cover" }}
              />
              <div className="marquee-label">{item.label.replace(" 2", "")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section
        id="testimonials"
        data-animate
        className="section-pad"
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
        className="section-pad"
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

          {/* Desktop: 4-card grid */}
          <div
            className="products-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {products.map((product) => (
              <div
                key={product.name}
                style={{
                  position: "relative",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  padding: 28,
                  overflow: "visible",
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
                {product.badgeText ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: -12,
                      zIndex: 2,
                      background: "#fff6e8",
                      border: "3px solid rgba(141,73,37,0.12)",
                      borderRadius: 14,
                      padding: "8px 12px",
                      textAlign: "center",
                      boxShadow: "0 10px 24px rgba(58,26,8,0.16)",
                      minWidth: 96,
                    }}
                  >
                    <div
                      style={{
                        color: "#8D4925",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.2,
                        lineHeight: 1.2,
                      }}
                    >
                      {product.badgeText}
                    </div>
                  </div>
                ) : null}
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

          {/* Mobile: single-card auto carousel */}
          <div className="products-carousel" style={{ position: "relative" }}>
            <div
              style={{
                position: "relative",
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 20,
                overflow: "visible",
                opacity: productAnimating ? 0 : 1,
                transform: productAnimating ? "scale(0.97)" : "scale(1)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
              }}
            >
              {products[activeProduct].badgeText ? (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    right: -12,
                    zIndex: 2,
                    background: "#fff6e8",
                    border: "3px solid rgba(141,73,37,0.12)",
                    borderRadius: 14,
                    padding: "8px 12px",
                    textAlign: "center",
                    boxShadow: "0 10px 24px rgba(58,26,8,0.16)",
                    minWidth: 96,
                  }}
                >
                  <div
                    style={{
                      color: "#8D4925",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.2,
                      lineHeight: 1.2,
                    }}
                  >
                    {products[activeProduct].badgeText}
                  </div>
                </div>
              ) : null}
              {/* Image */}
              <div style={{ position: "relative", height: 220, width: "100%" }}>
                <Image
                  src={products[activeProduct].image}
                  alt={products[activeProduct].name}
                  fill
                  style={{ objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(58,26,8,0.75) 0%, transparent 55%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    left: 16,
                    background: "rgba(255,192,106,0.18)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,192,106,0.35)",
                    color: "#ffc06a",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    padding: "3px 12px",
                    borderRadius: 100,
                  }}
                >
                  {products[activeProduct].tag}
                </div>
              </div>
              {/* Text */}
              <div style={{ padding: "24px 22px 28px" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-v2-playfair), serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "#fdfaf1",
                    marginBottom: 10,
                  }}
                >
                  {products[activeProduct].name}
                </h3>
                <p style={{ color: "rgba(253,250,241,0.7)", fontSize: 14, lineHeight: 1.75 }}>
                  {products[activeProduct].description}
                </p>
                {/* Dots */}
                <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
                  {products.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (i === activeProduct) return;
                        setProductAnimating(true);
                        setTimeout(() => {
                          setActiveProduct(i);
                          setProductAnimating(false);
                        }, 250);
                      }}
                      style={{
                        width: i === activeProduct ? 24 : 8,
                        height: 8,
                        borderRadius: 100,
                        background: i === activeProduct ? "#ffc06a" : "rgba(255,255,255,0.3)",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        transition: "all 0.3s ease",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
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
      <section
        id="contact"
        data-animate
        className="section-pad"
        style={{ background: "#fdfaf1", padding: "100px 24px" }}
      >
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
                  content: "Bengaluru · Mysuru",
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
      <footer
        className="landing-footer"
        style={{ background: "#3A1A08", padding: "64px 24px 32px" }}
      >
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
                {[
                  {
                    label: "Instagram",
                    svg: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(253,250,241,0.6)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle
                          cx="17.5"
                          cy="6.5"
                          r="0.5"
                          fill="rgba(253,250,241,0.6)"
                          stroke="none"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "WhatsApp",
                    svg: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(253,250,241,0.6)">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Facebook",
                    svg: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(253,250,241,0.6)">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    ),
                  },
                ].map(({ label, svg }) => (
                  <div
                    key={label}
                    title={label}
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
                    {svg}
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
              {["Bengaluru", "Mysuru", "Coming Soon…"].map((city, i) => (
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
            <span style={{ color: "rgba(253,250,241,0.35)", fontSize: 13 }}>
              Designed with ❤️ for authentic home-cooked meals
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
        /* ── Navbar responsive ───────────────────────────────── */
        .nav-desktop { display: flex; }
        .nav-mobile  { display: none; }
        @media (max-width: 767px) {
          .nav-desktop { display: none !important; }
          .nav-mobile  { display: block !important; }
        }

        /* ── Scroll reveal ───────────────────────────────────── */
        [data-animate], [data-reveal] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.75s cubic-bezier(0.22,1,0.36,1),
                      transform 0.75s cubic-bezier(0.22,1,0.36,1);
        }
        [data-animate].revealed, [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }
        [data-reveal-delay="1"] { transition-delay: 0.12s; }
        [data-reveal-delay="2"] { transition-delay: 0.22s; }
        [data-reveal-delay="3"] { transition-delay: 0.34s; }
        [data-reveal-delay="4"] { transition-delay: 0.46s; }

        /* ── Float (hero card) ───────────────────────────────── */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }

        /* ── Marquee gallery ─────────────────────────────────── */
        .marquee-track {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
        .marquee-card {
          flex-shrink: 0;
          width: 180px;
          height: 220px;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          transition: transform 0.35s ease, box-shadow 0.35s ease;
          cursor: pointer;
        }
        .marquee-card:hover {
          transform: scale(1.05) translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.45);
        }
        .marquee-label {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 32px 14px 14px;
          background: linear-gradient(to top, rgba(58,26,8,0.85) 0%, transparent 100%);
          color: #fdfaf1;
          font-size: 13px;
          font-weight: 600;
          transition: padding 0.3s ease;
        }
        .marquee-card:hover .marquee-label { padding-bottom: 20px; }
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Products: grid on desktop, carousel on mobile */
        .products-grid     { display: grid; }
        .products-carousel { display: none; }
        @media (max-width: 767px) {
          .products-grid     { display: none !important; }
          .products-carousel { display: block !important; }
        }

        /* ── Responsive ──────────────────────────────────────── */

        /* Tablet (≤ 768px) */
        @media (max-width: 768px) {
          .hero-grid    { grid-template-columns: 1fr !important; gap: 32px !important; }
          .about-grid   { grid-template-columns: 1fr !important; gap: 32px !important; }
          .contact-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .footer-grid  { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .section-pad  { padding-top: 72px !important; padding-bottom: 72px !important; }
          .hero-content-pad { padding-top: 100px !important; padding-bottom: 60px !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .marquee-card  { width: 150px !important; height: 190px !important; }
        }

        /* Mobile (≤ 480px) */
        @media (max-width: 480px) {
          .section-pad  { padding-top: 56px !important; padding-bottom: 56px !important; }
          .hero-content-pad { padding-top: 88px !important; padding-bottom: 48px !important; }
          .footer-grid  { grid-template-columns: 1fr !important; }
          .hero-ctas    { flex-direction: column !important; }
          .hero-ctas a  { text-align: center !important; justify-content: center !important; }
          .hero-stats-row { gap: 20px !important; margin-top: 36px !important; padding-top: 24px !important; }
          .marquee-card  { width: 140px !important; height: 175px !important; }
          .landing-footer { padding: 48px 20px 28px !important; }
        }

        /* Small mobile (≤ 360px) */
        @media (max-width: 360px) {
          .section-pad  { padding-top: 48px !important; padding-bottom: 48px !important; }
          .hero-content-pad { padding-top: 80px !important; }
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
