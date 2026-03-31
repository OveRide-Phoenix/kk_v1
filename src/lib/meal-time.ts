import type { MealType } from "@/config/meal-types";

/** Cutoff hours (24h) after which a meal type is no longer "current" */
export const MEAL_CUTOFFS: Record<MealType, { hour: number; minute: number }> = {
  breakfast: { hour: 8, minute: 30 }, // show breakfast before 08:30
  lunch: { hour: 13, minute: 0 }, // show lunch 08:30 – 13:00
  dinner: { hour: 21, minute: 0 }, // show dinner 13:00 – 21:00
  condiments: { hour: 21, minute: 0 }, // condiments follow dinner
};

/**
 * Returns the meal type that should be shown as "today's menu" based on the
 * current local time. Falls back to "dinner" after 21:00.
 */
export function getCurrentMeal(): MealType {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  const breakfastCutoff = 8 * 60 + 30; // 08:30
  const lunchCutoff = 13 * 60; // 13:00
  const dinnerCutoff = 21 * 60; // 21:00

  if (totalMinutes < breakfastCutoff) return "breakfast";
  if (totalMinutes < lunchCutoff) return "lunch";
  if (totalMinutes < dinnerCutoff) return "dinner";
  return "dinner"; // after 21:00 still show dinner (next day's menu not yet available)
}
