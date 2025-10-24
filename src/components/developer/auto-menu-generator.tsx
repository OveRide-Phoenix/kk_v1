"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import { useAuthStore } from "@/store/store";

type AutoMenuResponse = {
  date: string;
  results: Record<
    string,
    {
      status: string;
      menu_id?: number;
      items?: number;
      released?: boolean;
      reason?: string;
    }
  >;
};

const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner"] as const;

const DEFAULT_PLANNED = {
  Breakfast: 50,
  Lunch: 80,
  Dinner: 60,
};

export function AutoMenuGenerator() {
  const { toast: pushToast } = useToast();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [hydrated, setHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [plannedQty, setPlannedQty] = useState<Record<string, number>>({
    ...DEFAULT_PLANNED,
  });
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [result, setResult] = useState<AutoMenuResponse | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const formattedDate = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );
  const isTodaySelected = isToday(selectedDate);
  const isTomorrowSelected = isTomorrow(selectedDate);

  if (!hydrated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Developer Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You must be an administrator to run the one-click menu setup tool.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        date: formattedDate,
        breakfast_planned_qty: plannedQty.Breakfast ?? 0,
        lunch_planned_qty: plannedQty.Lunch ?? 0,
        dinner_planned_qty: plannedQty.Dinner ?? 0,
      };
      const response = await http.post("/api/dev/daily-menu/auto", payload);
      const body = await response.json();
      if (!response.ok) {
        const detail =
          typeof body?.detail === "string" && body.detail.trim().length
            ? body.detail
            : "One-click setup failed.";
        throw new Error(detail);
      }
      setResult(body as AutoMenuResponse);
      pushToast({
        title: "Menu prepared",
        description: `Daily menus for ${formattedDate} are ready.`,
      });
    } catch (error) {
      pushToast({
        title: "Setup failed",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setClearLoading(true);
    setResult(null);
    try {
      const response = await http.post("/api/dev/daily-menu/clear", {
        date: formattedDate,
      });
      const body = await response.json();
      if (!response.ok) {
        const detail =
          typeof body?.detail === "string" && body.detail.trim().length
            ? body.detail
            : "Failed to clear menus for the selected date.";
        throw new Error(detail);
      }
      setPlannedQty({ ...DEFAULT_PLANNED });
      setResult(body as AutoMenuResponse);
      pushToast({
        title: "Menus cleared",
        description: `Removed menus for ${formattedDate}.`,
      });
    } catch (error) {
      pushToast({
        title: "Clear failed",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>One-Click Daily Menu Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Menu date
              </Label>
              <div className="flex items-center gap-2">
                <DatePickerWithPresets
                  selectedDate={selectedDate}
                  onSelectDate={(next) => {
                    if (next) {
                      const normalized = new Date(next);
                      normalized.setHours(0, 0, 0, 0);
                      setSelectedDate(normalized);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    variant={isTodaySelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      setSelectedDate(today);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant={isTomorrowSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(0, 0, 0, 0);
                      setSelectedDate(tomorrow);
                    }}
                  >
                    Tomorrow
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {MEAL_ORDER.map((meal) => (
                <div key={meal} className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {meal} planned qty
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={plannedQty[meal]}
                    onChange={(event) => {
                      const nextValue = Number.parseInt(event.target.value, 10);
                      setPlannedQty((prev) => ({
                        ...prev,
                        [meal]: Number.isNaN(nextValue) ? 0 : nextValue,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Generates menus for Breakfast, Lunch, and Dinner using catalog
              defaults. Breakfast & Lunch are released automatically; Dinner is
              created but left unpublished.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading || clearLoading}
                onClick={handleClear}
              >
                {clearLoading ? "Clearing..." : "Clear & Reset"}
              </Button>
              <Button
                type="button"
                disabled={loading || clearLoading}
                onClick={handleGenerate}
              >
                {loading ? "Generating..." : "Generate Daily Menu"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Generation Summary · {result.date}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Menu ID</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MEAL_ORDER.map((meal) => {
                  const entry = result.results[meal] ?? null;
                  return (
                    <TableRow key={meal}>
                      <TableCell className="font-medium">{meal}</TableCell>
                      <TableCell className="capitalize">
                        {entry?.status ?? "not processed"}
                      </TableCell>
                      <TableCell>
                        {typeof entry?.items === "number" ? entry.items : "—"}
                      </TableCell>
                      <TableCell>
                        {entry?.status === "created"
                          ? entry.released
                            ? "Yes"
                            : "No"
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {typeof entry?.menu_id === "number"
                          ? entry.menu_id
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry?.reason ?? ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
