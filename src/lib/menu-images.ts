const FALLBACK_IMAGES: Record<string, string> = {
  "idli": "/images/menu/idli-sambar.jpg",
  "idli sambar": "/images/menu/idli-sambar.jpg",
  "mini idli": "/images/menu/idli-sambar.jpg",
  "masala dosa": "/images/menu/masala-dosa.jpg",
  "plain dosa": "/images/menu/masala-dosa.jpg",
  "rava dosa": "/images/menu/rava-dosa.jpg",
  "set dosa": "/images/menu/masala-dosa.jpg",
  "poori": "/images/menu/poori.jpg",
  "poori bhaji": "/images/menu/poori.jpg",
  "poori masala": "/images/menu/poori.jpg",
  "upma": "/images/menu/upma.jpg",
  "veg upma": "/images/menu/upma.jpg",
  "vegetable upma": "/images/menu/upma.jpg",
  "vada": "/images/menu/vada-sambar.jpg",
  "medu vada": "/images/menu/vada-sambar.jpg",
  "vada sambar": "/images/menu/vada-sambar.jpg",
  "pongal": "/images/menu/idli-sambar.jpg",
  "bisibelebath": "/images/menu/upma.jpg",
  "veg biryani": "/images/menu/poori.jpg",
};

const DEFAULT_MENU_IMAGE = "/images/menu/idli-sambar.jpg";

export function getMenuImage(name?: string | null, fallback: string = DEFAULT_MENU_IMAGE) {
  if (!name) return fallback;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return fallback;
  return FALLBACK_IMAGES[normalized] ?? fallback;
}

export { DEFAULT_MENU_IMAGE };
