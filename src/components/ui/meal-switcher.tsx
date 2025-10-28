import { cn } from "@/lib/utils"

export type MealSwitcherOption<T extends string> = {
  value: T
  label: string
}

type MealSwitcherProps<T extends string> = {
  options: MealSwitcherOption<T>[]
  value: T
  onValueChange?: (value: T) => void
}

export function MealSwitcher<T extends string>({ options, value, onValueChange }: MealSwitcherProps<T>) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {options.map((option) => {
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onValueChange?.(option.value)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default MealSwitcher
