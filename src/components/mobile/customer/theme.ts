import { Outfit, Playfair_Display, Work_Sans } from "next/font/google";

export const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-mobile-work-sans",
});

export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-mobile-outfit",
});

export const playfairMobile = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-mobile-playfair",
});

export const mobilePalette = {
  background: "#FDFAF1",
  brand: "#8D4A25",
  brandSoft: "rgba(141, 74, 37, 0.6)",
  heading: "#0F172A",
  body: "#475569",
  trust: "#1B4332",
  muted: "#94A3B8",
};
