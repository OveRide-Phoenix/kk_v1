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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as ConfirmFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Compass, Wand2 } from "lucide-react";

type NLSelectSuccess = {
  intent: string;
  sql: string;
  rows: Array<Record<string, unknown>>;
};

type NLUpdateSuccess = {
  intent: "SET_MENU_BUFFER";
  sql: string;
  affected: number;
  row?: Record<string, unknown> | null;
};

type NLError = {
  error: string;
  sql?: string;
  examples?: string[];
};

type NLResult = NLSelectSuccess | NLUpdateSuccess | NLError;

interface AskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type IntentMeta = {
  title: string;
  action: { label: string; href: string };
  emptyMessage: string;
};

const FALLBACK_API_BASE = "http://127.0.0.1:8000";

const DEFAULT_ACTION = {
  label: "Go to Admin Dashboard",
  href: "/admin",
};

const DEFAULT_META: IntentMeta = {
  title: "Dashboard",
  action: DEFAULT_ACTION,
  emptyMessage: "The request returned no data. Double-check the details and try again.",
};

const intentMeta: Record<string, IntentMeta> = {
  GET_MENU: {
    title: "Daily Menu",
    action: { label: "Open Daily Menu Setup", href: "/admin/dailymenusetup" },
    emptyMessage: "Menu is not set up for that date.",
  },
  GET_MENU_BUFFER: {
    title: "Menu Buffer",
    action: { label: "Manage Daily Menu", href: "/admin/dailymenusetup" },
    emptyMessage: "Buffer is not configured for that day.",
  },
  SET_MENU_BUFFER: {
    title: "Buffer Updated",
    action: { label: "Review Daily Menu", href: "/admin/dailymenusetup" },
    emptyMessage: "Buffer update did not return any details.",
  },
  GET_ORDER_COUNT: {
    title: "Order Count",
    action: { label: "Open Reports", href: "/admin/reports" },
    emptyMessage: "No orders found for that window.",
  },
  GET_ORDER_TOTALS: {
    title: "Sales Overview",
    action: { label: "Open Reports", href: "/admin/reports" },
    emptyMessage: "No sales recorded for that period.",
  },
  GET_TOP_ITEMS: {
    title: "Top Items",
    action: { label: "View Sales Reports", href: "/admin/reports" },
    emptyMessage: "No items sold in that period.",
  },
  GET_CUSTOMER_ORDERS: {
    title: "Customer Orders",
    action: { label: "Order History", href: "/admin/order-history" },
    emptyMessage: "No orders matched that customer and time range.",
  },
  GET_CUSTOMER_ADDRESSES: {
    title: "Customer Addresses",
    action: { label: "Customer Management", href: "/admin/customermgmt" },
    emptyMessage: "No saved addresses for that customer yet.",
  },
  GET_ADMIN_LOGS_RECENT: {
    title: "Admin Activity",
    action: { label: "View Admin Logs", href: "/admin/logs" },
    emptyMessage: "No recent admin activity to display.",
  },
};

export function AskDialog({ open, onOpenChange }: AskDialogProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<NLResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingWriteQuery, setPendingWriteQuery] = useState<string | null>(null);
  const [confirmWriteOpen, setConfirmWriteOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const endpoint = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? FALLBACK_API_BASE;
    return `${base}/api/nl/sql`;
  }, []);

  async function executeQuery(requestQuery: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: requestQuery }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail || `Request failed (${res.status})`);
      }
      const payload: NLResult = await res.json();
      setResult(payload);
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "Failed to contact NL router.";
      setError(detail);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Ask a question to continue.");
      setResult(null);
      return;
    }
    if (isPotentialUpdate(trimmed)) {
      setPendingWriteQuery(trimmed);
      setConfirmWriteOpen(true);
      return;
    }
    executeQuery(trimmed);
  }

  function handleNavigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const meta = getIntentMeta(result);
  const examples = isError(result) ? result.examples ?? [] : [];

  return (
    <>
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
                placeholder="Search menus, orders, revenue, customers, buffers..."
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
        <ScrollArea className="max-h-[26rem] rounded-md border border-dashed border-border/60 bg-muted/30 p-4">
          {result ? (
            <div className="space-y-4 text-sm">
              {renderIntentBadge(result, meta)}
              {isError(result) ? (
                <Card className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">{result.error}</p>
                  {result.sql ? (
                    <pre className="mt-2 rounded bg-white/70 p-2 text-xs text-destructive-foreground">
                      {result.sql}
                    </pre>
                  ) : null}
                </Card>
              ) : null}
              {isUpdate(result) ? renderUpdateSummary(result) : null}
              {isSelect(result) ? renderRows(result, meta) : null}
              {isSuccess(result) && result.sql ? renderSQLSnippet(result.sql) : null}
              {examples.length ? (
                <Card className="border border-border/50 bg-background p-3">
                  <p className="font-medium text-muted-foreground">
                    Try asking:
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {examples.map((sample) => (
                      <li key={sample}>{sample}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Compass className="h-8 w-8" />
              <p className="text-sm font-medium">
                Ask about menus, orders, revenue, customers, or buffers.
              </p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="flex items-center justify-between gap-3 sm:flex-row">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wand2 className="h-3.5 w-3.5" />
            Tips: “top items this month 5” · “tomorrow dinner menu” · “update
            buffer for rasam to 20”
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              handleNavigate((meta ?? DEFAULT_META).action.href)
            }
          >
            {(meta ?? DEFAULT_META).action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
      <AlertDialog open={confirmWriteOpen} onOpenChange={setConfirmWriteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm buffer update</AlertDialogTitle>
          <AlertDialogDescription>
            This question will update menu buffer quantities in the database.
            Please confirm you want to apply this change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ConfirmFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmWriteOpen(false);
              setPendingWriteQuery(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingWriteQuery) {
                setConfirmWriteOpen(false);
                executeQuery(pendingWriteQuery);
                setPendingWriteQuery(null);
              }
            }}
          >
            Yes, update buffer
          </AlertDialogAction>
        </ConfirmFooter>
      </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getIntentMeta(result: NLResult | null) {
  if (!result || isError(result)) {
    return null;
  }
  const intentKey =
    result.intent === "SET_MENU_BUFFER" ? "SET_MENU_BUFFER" : result.intent;
  return intentMeta[intentKey] ?? null;
}

function renderIntentBadge(result: NLResult, meta: IntentMeta | null) {
  if (isError(result)) {
    return (
      <Badge variant="outline" className="bg-background/70 text-xs text-destructive">
        Something went wrong
      </Badge>
    );
  }
  const effectiveMeta = meta ?? DEFAULT_META;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="bg-background/70 text-xs">
        Intent · {result.intent}
      </Badge>
      {meta ? (
        <span className="text-sm font-medium text-foreground">
          {meta.title}
        </span>
      ) : null}
      {isUpdate(result) ? (
        <Badge className="bg-emerald-100 text-emerald-700">
          {result.affected} row{result.affected === 1 ? "" : "s"} updated
        </Badge>
      ) : null}
      {isSelect(result) && result.rows.length === 0 ? (
        <Badge className="bg-amber-100 text-amber-800">
          {effectiveMeta.emptyMessage}
        </Badge>
      ) : null}
    </div>
  );
}

function renderUpdateSummary(result: NLUpdateSuccess) {
  if (!result.row) {
    return null;
  }
  return (
    <Card className="space-y-3 border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-sm font-medium text-emerald-900">
        Buffer updated successfully.
      </p>
      {renderSimpleTable([result.row])}
    </Card>
  );
}

function renderRows(result: NLSelectSuccess, meta: IntentMeta | null) {
  const effectiveMeta = meta ?? DEFAULT_META;
  if (!result.rows.length) {
    return (
      <Card className="border border-border/60 bg-background p-4 text-sm text-muted-foreground">
        {effectiveMeta.emptyMessage}
      </Card>
    );
  }
  return renderSimpleTable(result.rows);
}

function renderSimpleTable(rows: Array<Record<string, unknown>>) {
  const columns = deriveColumns(rows);
  return (
    <div className="rounded-lg border border-border bg-background shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{formatKey(column)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column}>{formatValue(row[column]) || "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function renderSQLSnippet(sql: string) {
  return (
    <details className="rounded-md border border-border/40 bg-background/80 p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        View generated SQL
      </summary>
      <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/40 p-2">{sql}</pre>
    </details>
  );
}

function deriveColumns(rows: Array<Record<string, unknown>>) {
  const columns = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!key.toLowerCase().endsWith("_id") && key.toLowerCase() !== "id") {
        columns.add(key);
      }
    });
  });
  if (!columns.size && rows.length) {
    return Object.keys(rows[0]);
  }
  return Array.from(columns);
}

function isError(result: NLResult | null): result is NLError {
  return !!result && "error" in result;
}

function isUpdate(result: NLResult | null): result is NLUpdateSuccess {
  return !!result && "intent" in result && result.intent === "SET_MENU_BUFFER";
}

function isSelect(result: NLResult | null): result is NLSelectSuccess {
  return !!result && "rows" in result;
}

function isSuccess(result: NLResult | null): result is NLSelectSuccess | NLUpdateSuccess {
  return isSelect(result) || isUpdate(result);
}

function isPotentialUpdate(text: string): boolean {
  const value = text.toLowerCase();
  if (!value) return false;
  if (value.includes("update") && value.includes("buffer")) {
    return true;
  }
  if (value.includes("set") && value.includes("buffer")) {
    return true;
  }
  return false;
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
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.valueOf())) {
        return parsed.toLocaleString();
      }
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([innerKey, val]) => `${formatKey(innerKey)}: ${formatValue(val)}`)
      .join(", ");
  }
  return String(value);
}
