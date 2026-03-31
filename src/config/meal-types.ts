export type MealType = "breakfast" | "lunch" | "dinner" | "condiments";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "condiments"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
};
