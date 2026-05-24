"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Terminal,
  Cpu,
  MemoryStick,
  HardDrive,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gauge,
  Circle,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { http, readJsonResponse } from "@/lib/http";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MetricSeries {
  unit: string;
  usage: Record<string, number>;
}

interface VmInfo {
  id: number;
  hostname: string;
  state: string;
  plan: string;
  cpus: number;
  memory: number; // MB
  disk: number; // MB
  bandwidth: number; // bytes
}

interface MetricsPayload {
  cpu_usage: MetricSeries | null;
  ram_usage: MetricSeries | null;
  disk_space: MetricSeries | null;
  incoming_traffic: MetricSeries | null;
  outgoing_traffic: MetricSeries | null;
  uptime: MetricSeries | null;
}

interface VpsData {
  vm_id: string;
  vm_info: VmInfo;
  metrics: MetricsPayload;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortedPoints(usage: Record<string, number> | undefined): { v: number }[] {
  if (!usage) return [];
  return Object.entries(usage)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => ({ v }));
}

function lastValue(usage: Record<string, number> | undefined): number {
  if (!usage) return 0;
  const entries = Object.entries(usage).sort(([a], [b]) => Number(a) - Number(b));
  return entries.length ? entries[entries.length - 1][1] : 0;
}

function fmtBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(decimals)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(decimals)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(decimals)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(decimals)} KB`;
  return `${bytes} B`;
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getWsUrl(path: string, token: string): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (process.env.NODE_ENV === "development") {
    return `ws://localhost:8000${path}?token=${encodeURIComponent(token)}`;
  }
  return `${proto}//${window.location.host}/api/backend${path}?token=${encodeURIComponent(token)}`;
}

// ─── Circular progress SVG ───────────────────────────────────────────────────

function RingChart({
  pct,
  color = "#6366f1",
  size = 56,
}: {
  pct: number;
  color?: string;
  size?: number;
}) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
    </svg>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Spark({ points, color }: { points: { v: number }[]; color: string }) {
  if (points.length < 2) return <div className="h-12 w-full" />;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          dot={false}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

type CardVariant = "spark" | "ring";

function MetricCard({
  icon: Icon,
  label,
  primary,
  secondary,
  variant,
  points,
  pct,
  sparkColor,
  ringColor,
}: {
  icon: React.ElementType;
  label: string;
  primary: string;
  secondary?: string;
  variant: CardVariant;
  points?: { v: number }[];
  pct?: number;
  sparkColor?: string;
  ringColor?: string;
}) {
  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
          {variant === "ring" && pct !== undefined && (
            <RingChart pct={pct} color={ringColor ?? "#6366f1"} />
          )}
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{primary}</span>
          {secondary && <span className="ml-1 text-sm text-muted-foreground">/ {secondary}</span>}
        </div>
        {variant === "spark" && points && points.length >= 2 && (
          <div className="mt-1">
            <Spark points={points} color={sparkColor ?? "#6366f1"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Terminal component ───────────────────────────────────────────────────────

function VpsTerminal({ token }: { token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    async function init() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      await import("@xterm/xterm/css/xterm.css");

      if (!mounted || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#0d1117",
          foreground: "#e6edf3",
          cursor: "#58a6ff",
          selectionBackground: "#264f78",
          black: "#0d1117",
          brightBlack: "#484f58",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4",
          brightWhite: "#ffffff",
        },
        scrollback: 5000,
        allowTransparency: false,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      termRef.current = term;
      fitRef.current = fit;

      const wsUrl = getWsUrl("/api/dev/vps/terminal", token);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        const { cols, rows } = term;
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
        term.write("\r\n\x1b[32mConnected to VPS terminal.\x1b[0m\r\n\r\n");
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data));
        } else {
          term.write(String(event.data));
        }
      };

      ws.onerror = () => {
        term.write("\r\n\x1b[31mWebSocket error — check nginx WebSocket proxy config.\x1b[0m\r\n");
      };

      ws.onclose = () => {
        if (mounted) {
          term.write("\r\n\x1b[33mConnection closed.\x1b[0m\r\n");
        }
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const handleResize = () => {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          const { cols, rows } = term;
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const cleanup = init();

    return () => {
      mounted = false;
      cleanup.then((fn) => fn?.());
      wsRef.current?.close();
      termRef.current?.dispose();
    };
  }, [token]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VpsMonitorPage() {
  const [data, setData] = useState<VpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [termOpen, setTermOpen] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    try {
      setToken(localStorage.getItem("access_token") ?? "");
    } catch {
      setToken("");
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get("/api/dev/vps/metrics");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const payload = await readJsonResponse<VpsData>(res);
      setData(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch VPS metrics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const id = setInterval(() => void fetchMetrics(), 30_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const vm = data?.vm_info;
  const m = data?.metrics;

  const cpuPoints = sortedPoints(m?.cpu_usage?.usage);
  const cpuLast = lastValue(m?.cpu_usage?.usage);

  const ramLast = lastValue(m?.ram_usage?.usage);
  const ramTotalBytes = (vm?.memory ?? 0) * 1024 * 1024;
  const ramPct = ramTotalBytes > 0 ? (ramLast / ramTotalBytes) * 100 : 0;
  const ramPoints = sortedPoints(m?.ram_usage?.usage).map(({ v }) => ({
    v: ramTotalBytes > 0 ? (v / ramTotalBytes) * 100 : 0,
  }));

  const diskLast = lastValue(m?.disk_space?.usage);
  const diskTotalBytes = (vm?.disk ?? 0) * 1024 * 1024;
  const diskPct = diskTotalBytes > 0 ? (diskLast / diskTotalBytes) * 100 : 0;

  const inPoints = sortedPoints(m?.incoming_traffic?.usage);
  const inLast = lastValue(m?.incoming_traffic?.usage);

  const outPoints = sortedPoints(m?.outgoing_traffic?.usage);
  const outLast = lastValue(m?.outgoing_traffic?.usage);

  const bwTotalBytes = vm?.bandwidth ?? 0;
  const bwUsed = inLast + outLast;
  const bwPct = bwTotalBytes > 0 ? (bwUsed / bwTotalBytes) * 100 : 0;

  const stateColor =
    vm?.state === "running"
      ? "bg-emerald-100 text-emerald-700"
      : vm?.state === "stopped"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <AdminLayout activePage="dev-vps">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">VPS Monitor</h2>
            {vm && (
              <p className="text-sm text-muted-foreground">
                {vm.hostname} · {vm.plan} · {vm.cpus} vCPU · {fmtBytes(ramTotalBytes)} RAM
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {vm && (
              <Badge className={stateColor} variant="outline">
                <Circle className="mr-1 h-2 w-2 fill-current" />
                {vm.state}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchMetrics()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Metrics grid */}
        {!error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              icon={Cpu}
              label="CPU usage"
              primary={loading ? "—" : fmtPct(cpuLast)}
              variant="spark"
              points={cpuPoints}
              sparkColor="#6366f1"
            />
            <MetricCard
              icon={MemoryStick}
              label="Memory usage"
              primary={loading ? "—" : fmtPct(ramPct)}
              secondary={loading ? undefined : fmtBytes(ramTotalBytes)}
              variant="spark"
              points={ramPoints}
              sparkColor="#6366f1"
            />
            <MetricCard
              icon={HardDrive}
              label="Disk usage"
              primary={loading ? "—" : fmtBytes(diskLast)}
              secondary={loading ? undefined : fmtBytes(diskTotalBytes)}
              variant="ring"
              pct={diskPct}
              ringColor="#6366f1"
            />
            <MetricCard
              icon={ArrowDownToLine}
              label="Incoming traffic"
              primary={loading ? "—" : fmtBytes(inLast)}
              variant="spark"
              points={inPoints.map(({ v }) => ({ v: v / 1024 }))}
              sparkColor="#ef4444"
            />
            <MetricCard
              icon={ArrowUpFromLine}
              label="Outgoing traffic"
              primary={loading ? "—" : fmtBytes(outLast)}
              variant="spark"
              points={outPoints.map(({ v }) => ({ v: v / 1024 }))}
              sparkColor="#6366f1"
            />
            <MetricCard
              icon={Gauge}
              label="Bandwidth"
              primary={loading ? "—" : fmtBytes(bwUsed)}
              secondary={loading ? undefined : fmtBytes(bwTotalBytes)}
              variant="ring"
              pct={bwPct}
              ringColor="#6366f1"
            />
          </div>
        )}

        {/* Terminal */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between bg-muted/40 px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Terminal
            </div>
            <Button
              size="sm"
              variant={termOpen ? "destructive" : "default"}
              onClick={() => setTermOpen((v) => !v)}
            >
              {termOpen ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Terminal className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
          </div>
          {termOpen && token ? (
            <div className="h-[480px] bg-[#0d1117] p-2">
              <VpsTerminal token={token} />
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground bg-muted/10">
              {termOpen && !token
                ? "Waiting for auth token…"
                : "Click Connect to open a live bash session on the VPS."}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
