"use client";

import { format as formatDate } from "date-fns";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  startDate: string;
  endDate: string;
  minDate?: string;
  onChange: (start: string, end: string) => void;
};

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DateRangePicker({ startDate, endDate, minDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<DateRange | undefined>();

  const from = startDate ? parseLocalDate(startDate) : undefined;
  const to = endDate ? parseLocalDate(endDate) : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) return;
    setSelecting(range);
    if (range.from && range.to) {
      onChange(formatDate(range.from, "yyyy-MM-dd"), formatDate(range.to, "yyyy-MM-dd"));
      setSelecting(undefined);
      setOpen(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setSelecting(undefined);
  };

  const displayText =
    from && to
      ? `${formatDate(from, "d MMM yyyy")} → ${formatDate(to, "d MMM yyyy")}`
      : "Select dates";

  const disabled = minDate ? { before: parseLocalDate(minDate) } : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-12 w-full items-center gap-2.5 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-gray-800 outline-none transition-all hover:border-[#8D4925]/30 focus:border-[#8D4925] focus:ring-2 focus:ring-[#8D4925]/20"
        >
          <span className="material-symbols-outlined text-[18px] text-[#8D4925]/60">
            calendar_month
          </span>
          <span className="flex-1 text-left">{displayText}</span>
          <span className="material-symbols-outlined text-[16px] text-gray-400">expand_more</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-orange-100 bg-[#fdfaf1] p-5 shadow-2xl"
        style={{ borderRadius: "1.5rem" }}
        align="start"
        sideOffset={8}
      >
        {from && to && !selecting && (
          <p className="mb-3 text-center text-xs text-[#8D4925]/60">
            Currently{" "}
            <span className="font-semibold">
              {formatDate(from, "d MMM")} → {formatDate(to, "d MMM yyyy")}
            </span>
            . Click a new start date.
          </p>
        )}
        <DayPicker
          mode="range"
          numberOfMonths={2}
          selected={selecting}
          defaultMonth={from}
          onSelect={handleSelect}
          disabled={disabled}
          showOutsideDays={false}
          className="kk-rdp"
        />
        {selecting?.from && !selecting.to && (
          <p className="mt-3 text-center text-xs text-[#8D4925]/60">Now pick an end date</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
