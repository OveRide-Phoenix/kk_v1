"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const CART_STORAGE_KEY = "customer_cart_items";
const CART_CONTEXT_KEY = "customer_cart_context";

export default function CustomerV2Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [cartCount, setCartCount] = useState(0);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const lastCartRawRef = useRef<string>("");

  useEffect(() => {
    const readCartCount = () => {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(CART_STORAGE_KEY) || "";
      if (raw === lastCartRawRef.current) return;
      lastCartRawRef.current = raw;
      if (!raw) {
        setCartCount(0);
        return;
      }
      try {
        const items = JSON.parse(raw) as Array<{ quantity?: number }>;
        const total = Array.isArray(items)
          ? items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
          : 0;
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };

    readCartCount();
    const interval = window.setInterval(readCartCount, 500);
    const onStorage = () => readCartCount();
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentPath = pathname ?? "";
    const onProtectedPage =
      currentPath.startsWith("/customer-v2/new-order") ||
      currentPath.startsWith("/customer-v2/cart");
    if (!onProtectedPage || cartCount <= 0) return;

    const normalizePath = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value);

    const handleNavigationAttempt = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target?.closest<HTMLAnchorElement>("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
        return;

      let destination: URL;
      try {
        destination = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;
      const nextPath = normalizePath(destination.pathname);
      const current = normalizePath(currentPath);
      if (nextPath === current) return;

      const isStayingInOrderFlow =
        nextPath.startsWith("/customer-v2/new-order") || nextPath.startsWith("/customer-v2/cart");
      if (isStayingInOrderFlow) return;

      event.preventDefault();
      event.stopPropagation();

      setPendingDestination(`${destination.pathname}${destination.search}${destination.hash}`);
      setConfirmLeaveOpen(true);
    };

    document.addEventListener("click", handleNavigationAttempt, true);
    return () => {
      document.removeEventListener("click", handleNavigationAttempt, true);
    };
  }, [cartCount, pathname]);

  const confirmLeaveAndNavigate = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_CONTEXT_KEY);
    }
    setCartCount(0);
    const next = pendingDestination;
    setPendingDestination(null);
    setConfirmLeaveOpen(false);
    if (next) {
      router.push(next);
    }
  };

  const linkClass = (href: string) => {
    const current = pathname ?? "";
    const normalizedCurrent = current.length > 1 ? current.replace(/\/+$/, "") : current;
    const normalizedHref = href.length > 1 ? href.replace(/\/+$/, "") : href;
    const isActive =
      normalizedCurrent === normalizedHref || normalizedCurrent.startsWith(`${normalizedHref}/`);

    return isActive
      ? "border-b-2 border-[#8D4925] pb-1 font-bold text-[#8D4925]"
      : "font-medium text-gray-600 transition-colors hover:text-[#8D4925]";
  };

  return (
    <div
      className={`${playfair.variable} ${plusJakarta.variable} min-h-screen bg-[#fdfaf1] text-gray-900`}
      style={{ fontFamily: "var(--font-v2-plus-jakarta)", fontSize: "13.5px" }}
    >
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
          `,
        }}
      />

      <nav className="sticky top-0 z-50 border-b border-orange-100 bg-[#fdfaf1]/95 backdrop-blur-md">
        <div className="mx-auto h-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between">
            <Link href="/customer-v2/home" className="flex items-center gap-2.5">
              <Image
                src="/images/logo/kk-brown.svg"
                alt="Kuteera Kitchen"
                width={36}
                height={36}
                style={{ height: 36, width: "auto" }}
                priority
              />
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
            </Link>
            <div className="hidden items-center gap-8 md:flex">
              <Link className={linkClass("/customer-v2/home")} href="/customer-v2/home">
                Home
              </Link>
              <Link className={linkClass("/customer-v2/new-order")} href="/customer-v2/new-order">
                Order
              </Link>
              <Link
                className={linkClass("/customer-v2/subscription")}
                href="/customer-v2/subscription"
              >
                Subscription
              </Link>
              <Link
                className={`relative flex items-center gap-1 font-medium transition-colors ${
                  (pathname ?? "").startsWith("/customer-v2/cart")
                    ? "text-[#8D4925]"
                    : "text-gray-600 hover:text-[#8D4925]"
                }`}
                href="/customer-v2/cart"
              >
                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                {cartCount > 0 ? (
                  <span className="absolute -right-3 -top-3 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#8D4925] px-1.5 text-[10px] font-bold leading-5 text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </Link>
              <div className="flex items-center gap-3 border-l border-orange-100 pl-4">
                <a
                  className="flex items-center gap-1 font-medium text-gray-600 transition-colors hover:text-[#8D4925]"
                  href="#"
                >
                  <span className="material-symbols-outlined relative text-2xl">
                    notifications
                    <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-[#fdfaf1] bg-red-500"></span>
                  </span>
                </a>
                <Link className="group flex items-center gap-2" href="/customer-v2/account">
                  <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#8D4925]/20 bg-orange-100 p-0.5">
                    <img
                      alt="User Profile"
                      className="h-full w-full rounded-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoLZbX-XKgbESxdE3pDbYuatyFyTcmtUV3S_652YJvY3nb7-tg5aYqrtYBI54YguxqGJJ7JoR6S6QwNqGEOTrzPKrYmkRTY18fjM9o2ldrCX__h7OPCbM62C6l5gHRgVRNNzsBpRVSgTwLvf265AYvDmDLlJFgqlg20srdDTFORam8PkOzqk8X6B0BW_YW9DtCWbk0ExPGClctG-ULqvlGqy4rsQZUYDpwI9i4pQsfWlSwokrfq_acZjz9PgglFealBobkrrnxwFs3"
                    />
                  </div>
                  <span
                    className={`text-sm font-bold transition-colors group-hover:text-[#8D4925] ${
                      (pathname ?? "").startsWith("/customer-v2/account")
                        ? "text-[#8D4925]"
                        : "text-gray-700"
                    }`}
                  >
                    Profile
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    router.replace("/login-v2");
                  }}
                  className="inline-flex items-center justify-center text-gray-600 transition-colors hover:text-[#8D4925]"
                  aria-label="Logout"
                  title="Logout"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {children}

      <footer style={{ background: "#3A1A08", padding: "64px 24px 32px", marginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 48,
              marginBottom: 56,
            }}
            className="shell-footer-grid"
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
                      color: i === 2 ? "rgba(253,250,241,0.3)" : "rgba(253,250,241,0.55)",
                      fontSize: 14,
                      fontStyle: i === 2 ? "italic" : "normal",
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

        <style>{`
          @media (max-width: 768px) {
            .shell-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          }
          @media (max-width: 480px) {
            .shell-footer-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </footer>

      <Dialog
        open={confirmLeaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmLeaveOpen(false);
            setPendingDestination(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave this page?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8d6e63]">
            Cart will be emptied. Are you sure you want to leave?
          </p>
          <DialogFooter className="mt-4">
            <button
              onClick={() => {
                setConfirmLeaveOpen(false);
                setPendingDestination(null);
              }}
              className="rounded-md border border-[#8D4925]/20 px-4 py-2 text-sm font-semibold text-[#8D4925] transition-colors hover:bg-orange-50"
            >
              Stay here
            </button>
            <button
              onClick={confirmLeaveAndNavigate}
              className="rounded-md bg-[#8D4925] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7a3f20]"
            >
              Leave page
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
