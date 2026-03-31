import type { MealType } from "./meal-types";

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
