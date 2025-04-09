import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { GeistSans } from 'geist/font/sans'
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
})

const geist = GeistSans

export const metadata: Metadata = {
  title: "Kuteera Kitchen - Authentic Home-Cooked Meals",
  description:
    "Freshly prepared, authentic home-cooked meals delivered to your doorstep. Healthy, hygienic & delicious – Subscribe or order now.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check if we're on the home page
  const isHomePage = typeof window !== 'undefined' && window.location.pathname === '/'

  return (
    <html lang="en">
      <body 
        className={`
          ${isHomePage ? `${inter.variable} ${playfair.variable} font-sans` : geist.className}
          min-h-screen
        `}
      >
        {children}
        <Toaster />
        
        {/* ✅ Use Next.js `Script` component for better handling */}
        <Script
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCE0f3L2qXluZn96UVI-U_Bh8WIWX_e_kI&libraries=places"
          strategy="lazyOnload" 
        />
      </body>
    </html>
  )
}
