"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { http } from "@/lib/http";
import { Download, RefreshCw } from "lucide-react";

interface LogEntry {
  log_id: number;
  admin_id: number;
  action_type: string;
  entity_type: string;
  entity_id: number;
  description: string | null;
  timestamp: string;
  admin_name?: string | null;
  customer_id?: number | null;
}

const actionOptions = ["All", "ADD", "UPDATE", "DELETE"] as const;
const entityOptions = ["All", "ITEM", "COMBO", "ADDON", "CATEGORY"] as const;

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminIdFilter, setAdminIdFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState<(typeof actionOptions)[number]>("All");
  const [entityFilter, setEntityFilter] =
    useState<(typeof entityOptions)[number]>("All");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (adminIdFilter !== "All") {
      params.set("admin_id", adminIdFilter);
    }
    if (actionFilter !== "All") {
      params.set("action_type", actionFilter);
    }
    if (entityFilter !== "All") {
      params.set("entity_type", entityFilter);
    }
    const query = params.toString();
    const res = await http.get(`/api/logs${query ? `?${query}` : ""}`);
    if (res.ok) {
      const data = (await res.json()) as LogEntry[];
      setLogs(data);
    } else {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminIdFilter, actionFilter, entityFilter]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const term = search.toLowerCase();
    return logs.filter((log) =>
      [
        log.description ?? "",
        String(log.admin_id),
        log.action_type,
        log.entity_type,
        String(log.entity_id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [logs, search]);

  const handleExport = () => {
    const csv = [
      [
        "Timestamp",
        "Admin",
        "Action",
        "Entity",
        "Entity ID",
        "Description",
      ].join(","),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
          log.admin_name ?? log.admin_id,
          log.action_type,
          log.entity_type,
          log.entity_id,
          `"${(log.description ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `admin-logs-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout activePage="logs">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Logs &amp; Audit Trail</CardTitle>
              <CardDescription>
                Review administrator activity across items, combos, addons, and categories.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdminIdFilter("All");
                  setActionFilter("All");
                  setEntityFilter("All");
                  setSearch("");
                  fetchLogs();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button size="sm" onClick={handleExport} disabled={!filteredLogs.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <span className="block text-sm font-medium text-muted-foreground">
                  Admin ID
                </span>
                <Input
                  placeholder="All"
                  value={adminIdFilter === "All" ? "" : adminIdFilter}
                  onChange={(event) =>
                    setAdminIdFilter(event.target.value.trim() || "All")
                  }
                />
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-muted-foreground">
                  Action Type
                </span>
                <Select
                  value={actionFilter}
                  onValueChange={(value) => setActionFilter(value as typeof actionFilter)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-muted-foreground">
                  Entity Type
                </span>
                <Select
                  value={entityFilter}
                  onValueChange={(value) => setEntityFilter(value as typeof entityFilter)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-muted-foreground">
                  Search Description
                </span>
                <Input
                  placeholder="Search logs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.log_id}>
                        <TableCell>{format(new Date(log.timestamp), "dd MMM yyyy, hh:mm a")}</TableCell>
                        <TableCell>
                          {log.admin_name ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {log.admin_name}
                              </span>
                              {typeof log.customer_id === "number" && (
                                <span className="text-xs text-muted-foreground">
                                  Customer ID · {log.customer_id}
                                </span>
                              )}
                            </div>
                          ) : (
                            log.admin_id
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.entity_type}</TableCell>
                        <TableCell>{log.entity_id}</TableCell>
                        <TableCell>{log.description ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
