"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Compass } from "lucide-react";

type NLResponse =
  | {
      intent: string;
      slots?: Record<string, unknown>;
      data?: unknown;
      note?: string;
      message?: string;
      examples?: string[];
    }
  | {
      intent: "UNKNOWN";
      message: string;
      examples?: string[];
    };

interface AskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FALLBACK_API_BASE = "http://127.0.0.1:8000";

const intentMeta: Record<
  string,
  { title: string; action?: { label: string; href: string } }
> = {
  GET_MENU: {
    title: "Daily Menu",
    action: { label: "Open Daily Menu Setup", href: "/admin/dailymenusetup" },
  },
  GET_MENU_BUFFER: {
    title: "Menu Buffer",
    action: { label: "Manage Daily Menu", href: "/admin/dailymenusetup" },
  },
  SET_MENU_BUFFER_BY_ID: {
    title: "Buffer Update",
    action: { label: "Review Daily Menu", href: "/admin/dailymenusetup" },
  },
  SET_MENU_BUFFER_BY_NAME: {
    title: "Buffer Update",
    action: { label: "Review Daily Menu", href: "/admin/dailymenusetup" },
  },
  GET_ORDER_COUNT: {
    title: "Order Count",
    action: { label: "Open Reports", href: "/admin/reports" },
  },
  GET_ORDER_TOTALS: {
    title: "Sales Overview",
    action: { label: "Open Reports", href: "/admin/reports" },
  },
  GET_TOP_ITEMS: {
    title: "Top Items",
    action: { label: "View Sales Reports", href: "/admin/reports" },
  },
  GET_CUSTOMER_ORDERS: {
    title: "Customer Orders",
    action: { label: "Order History", href: "/admin/order-history" },
  },
  GET_CUSTOMER_ADDRESSES: {
    title: "Customer Addresses",
    action: { label: "Customer Management", href: "/admin/customermgmt" },
  },
  GET_ADMIN_LOGS_RECENT: {
    title: "Admin Activity",
    action: { label: "View Admin Logs", href: "/admin/logs" },
  },
};

export function AskDialog({ open, onOpenChange }: AskDialogProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<NLResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResponse(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const endpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? FALLBACK_API_BASE;
    return `${base}/api/nl/route`;
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Ask a question to continue.");
      setResponse(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: trimmed }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail || `Request failed (${res.status})`);
      }
      const payload: NLResponse = await res.json();
      setResponse(payload);
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "Failed to contact NL router.";
      setError(detail);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function handleNavigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const meta = response ? intentMeta[response.intent] : null;
  const hasData =
    response &&
    "data" in response &&
    response.data !== null &&
    response.data !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle>Ask Kuteera Kitchen</DialogTitle>
          <DialogDescription>
            Type what you need and we will route it to the right report or
            control panel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search menus, orders, addresses, buffers..."
                disabled={loading}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Asking…
                </span>
              ) : (
                "Ask"
              )}
            </Button>
          </div>
        </form>
        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <ScrollArea className="max-h-[22rem] rounded-md border border-dashed border-border/60 bg-muted/30 p-4">
          {response ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/70 text-xs">
                  Intent · {response.intent}
                </Badge>
                {meta ? (
                  <span className="text-sm font-medium text-foreground">
                    {meta.title}
                  </span>
                ) : null}
                {"note" in response && response.note ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {response.note}
                  </Badge>
                ) : null}
              </div>

              {"slots" in response && response.slots ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(response.slots).map(([key, value]) => (
                    <Badge
                      key={key}
                      variant="secondary"
                      className="bg-background text-xs font-medium"
                    >
                      {formatKey(key)}: {formatValue(value)}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {"message" in response && response.message ? (
                <p className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
                  {response.message}
                </p>
              ) : null}

              {hasData ? renderData(response.data) : null}

              {response.intent === "UNKNOWN" && response.examples?.length ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Try asking:</p>
                  <ul className="list-disc pl-5">
                    {response.examples.map((sample) => (
                      <li key={sample}>{sample}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Compass className="h-8 w-8" />
              <p className="text-sm font-medium">
                Ask about menus, orders, revenue, customers, or buffers.
              </p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="flex items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Tip: phrases like “top items this month 5” or “update buffer for
            rasam to 20” work best.
          </p>
          {meta?.action ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleNavigate(meta.action!.href)}
            >
              {meta.action.label}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function renderData(data: unknown) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <p className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
          No records found for this request.
        </p>
      );
    }
    if (data.every((item) => !isPlainObject(item))) {
      return (
        <ul className="list-disc space-y-1 pl-5">
          {data.map((item, index) => (
            <li key={index}>{formatValue(item)}</li>
          ))}
        </ul>
      );
    }
    const rows = data.filter(isPlainObject) as Record<string, unknown>[];
    const columns = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>())
    );
    return (
      <div className="rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{formatKey(column)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column}>
                    {formatValue(row[column]) || "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return (
        <p className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
          Nothing to display.
        </p>
      );
    }
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableBody>
            {entries.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="w-48 font-medium text-muted-foreground">
                  {formatKey(key)}
                </TableCell>
                <TableCell>{formatValue(value) || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data === null || data === undefined) {
    return null;
  }

  return (
    <p className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
      {formatValue(data)}
    </p>
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatKey(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) =>
      word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""
    )
    .join(" ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(trimmed)) {
      const safeDate = new Date(trimmed);
      if (!Number.isNaN(safeDate.valueOf())) {
        return safeDate.toLocaleString();
      }
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .map(([key, val]) => `${formatKey(key)}: ${formatValue(val)}`)
      .join(", ");
  }
  return String(value);
}
