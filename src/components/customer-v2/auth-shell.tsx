"use client"

import Link from "next/link"
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-v2-playfair",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-v2-plus-jakarta",
})

type AuthLink = {
  href: string
  label: string
  active?: boolean
}

export default function CustomerV2AuthShell({
  children,
  links,
}: {
  children: React.ReactNode
  links: AuthLink[]
}) {
  return (
    <div
      className={`${playfair.variable} ${plusJakarta.variable} min-h-screen bg-[#fdfaf1] text-gray-900`}
      style={{ fontFamily: "var(--font-v2-plus-jakarta)", fontSize: "15px" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
            .material-symbols-outlined {
              font-family: "Material Symbols Outlined";
              font-weight: normal;
              font-style: normal;
              font-size: 22px;
              line-height: 1;
              display: inline-block;
              white-space: nowrap;
              direction: ltr;
              -webkit-font-smoothing: antialiased;
              font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
            }
          `,
        }}
      />

      <header className="sticky top-0 z-50 border-b border-orange-100 bg-[#fdfaf1]/95 backdrop-blur-md">
        <div className="mx-auto h-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between">
            <Link className="flex items-center gap-4" href="/">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8D4925]/10">
                <span className="material-symbols-outlined text-[#8D4925]">restaurant</span>
              </div>
              <span className="text-2xl font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-v2-playfair)" }}>
                Kuteera Kitchen
              </span>
            </Link>
            <nav className="flex items-center gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    link.active
                      ? "border-b-2 border-[#8D4925] pb-1 font-bold text-[#8D4925]"
                      : "font-medium text-gray-600 transition-colors hover:text-[#8D4925]"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-orange-100 bg-[#fdfaf1]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-center text-xs font-medium text-gray-500">
            Designed with ❤️ for authentic home-cooked meals
          </p>
        </div>
      </footer>
    </div>
  )
}
