import type { MealType } from "./meal-types";

/**
 * Order cutoff times for today's one-time orders (24h format: [hour, minute]).
 * After this time, ordering for today is closed and the meal tab is disabled.
 * Subscriptions are exempt — they can be booked any time.
 */
export const ORDER_CUTOFF_TIMES: Record<MealType, [number, number] | null> = {
  breakfast: [8, 0], // 8:00 AM
  lunch: [12, 30], // 12:30 PM
  dinner: [20, 30], // 8:30 PM
  condiments: null, // condiments have no cutoff
};

/** Returns true if today's order window for this meal is closed. */
export function isMealOrderClosed(meal: MealType): boolean {
  const cutoff = ORDER_CUTOFF_TIMES[meal];
  if (!cutoff) return false;
  const now = new Date();
  const [h, m] = cutoff;
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

/**
 * Default "Delivers by" times shown in the customer UI.
 * These are the fallback values when the API does not return a delivers_by
 * for a given menu. Intended to be admin-editable via a settings page later.
 */
export const DEFAULT_DELIVERY_TIMES: Record<MealType, string | null> = {
  breakfast: "8:30 AM",
  lunch: "1:00 PM",
  dinner: "9:00 PM",
  condiments: null, // shown as "Delivery time varies"
};

/**
 * Returns the display string for a meal's delivery time.
 * Uses the API value if available, otherwise falls back to the default config.
 */
export function getDeliveryText(meal: MealType, apiValue: string | null | undefined): string {
  const value = apiValue ?? DEFAULT_DELIVERY_TIMES[meal];
  if (!value) return "Delivery time varies";
  return `Delivers by ${value}`;
}
