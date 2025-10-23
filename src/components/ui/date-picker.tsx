"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerWithPresetsProps {
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  showQuickSelect?: boolean;
  disablePast?: boolean;
  triggerClassName?: string;
}

export function DatePickerWithPresets({
  selectedDate,
  onSelectDate,
  showQuickSelect = true,
  disablePast = true,
  triggerClassName,
}: DatePickerWithPresetsProps) {
  const [open, setOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(
    selectedDate
  );

  // Sync parent‐side updates (if any) back into draft
  React.useEffect(() => {
    setDraftDate(selectedDate);
  }, [selectedDate]);

  const handlePresetClick = (value: string) => {
    const next = addDays(new Date(), parseInt(value, 10));
    setDraftDate(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            triggerClassName,
            !draftDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {draftDate ? format(draftDate, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="flex w-[300px] flex-col space-y-4 p-4"
      >
        {/* 1) Quick‐pick dropdown */}
        {showQuickSelect && (
          <Select onValueChange={handlePresetClick}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Quick pick…" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="0">Today</SelectItem>
              <SelectItem value="1">Tomorrow</SelectItem>
              <SelectItem value="3">In 3 days</SelectItem>
              <SelectItem value="7">In a week</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* 2) Calendar grid */}
        <div className="rounded-md border">
          <Calendar
            mode="single"
            selected={draftDate}
            onSelect={(date: Date | undefined) => {
              if (!date) return;
              setDraftDate(date);
            }}
            disabled={(date) => {
              if (!disablePast) return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
            className="text-center"
            initialFocus
            classNames={{
              day: "p-0 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted",
              day_today: "font-bold underline",
              day_selected: "bg-blue-600 text-white rounded-full",
            }}
          />
        </div>

        {/* 3) Inner OK button */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (draftDate) {
                onSelectDate(draftDate);
                setOpen(false);
              }
            }}
            size="sm"
            disabled={!draftDate}
          >
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
