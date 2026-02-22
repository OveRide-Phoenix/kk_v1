export type CityCode = "MYS" | "BLR"

type MealSection = "breakfast" | "lunch" | "dinner" | "condiments"

type CityDefinition = {
  label: string
  supportsFood: boolean
  supportsCondiments: boolean
}

export const DEFAULT_CITY: CityCode = "MYS"

export const CITY_CONFIG: Record<CityCode, CityDefinition> = {
  MYS: {
    label: "Mysore",
    supportsFood: true,
    supportsCondiments: true,
  },
  BLR: {
    label: "Bangalore",
    supportsFood: false,
    supportsCondiments: true,
  },
}

const CITY_ALIAS_TO_CODE: Record<string, CityCode> = {
  mysore: "MYS",
  mysuru: "MYS",
  mys: "MYS",
  bangalore: "BLR",
  bengaluru: "BLR",
  blr: "BLR",
}

export const normalizeCityCode = (value?: string | null): CityCode => {
  if (!value) return DEFAULT_CITY
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_CITY
  const upper = trimmed.toUpperCase()
  if (upper in CITY_CONFIG) {
    return upper as CityCode
  }
  const alias = trimmed.toLowerCase()
  if (alias in CITY_ALIAS_TO_CODE) {
    return CITY_ALIAS_TO_CODE[alias]
  }
  return DEFAULT_CITY
}

export const getCityLabel = (value?: string | null): string => {
  const code = normalizeCityCode(value)
  return CITY_CONFIG[code].label
}

export const citySupportsFood = (value?: string | null): boolean => {
  const code = normalizeCityCode(value)
  return CITY_CONFIG[code].supportsFood
}

export const citySupportsCondiments = (value?: string | null): boolean => {
  const code = normalizeCityCode(value)
  return CITY_CONFIG[code].supportsCondiments
}

export const getSupportedMeals = (value?: string | null): MealSection[] => {
  const supportsFood = citySupportsFood(value)
  const supportsCondiments = citySupportsCondiments(value)
  const meals: MealSection[] = []
  if (supportsFood) {
    meals.push("breakfast", "lunch", "dinner")
  }
  if (supportsCondiments) {
    meals.push("condiments")
  }
  return meals
}
