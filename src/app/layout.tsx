import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Kuteera Kitchen",
  description: "Home cooked meals delivered to your doorstep",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
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
