"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Download, Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { http } from "@/lib/http";

type TabKey = "sales" | "category" | "customers" | "subscriptions";

type SalesRecord = {
  date: string;
  total_sales: number;
  total_orders: number;
};

type CategoryRecord = {
  category_name: string;
  total_items_sold: number;
  total_revenue: number;
};

type CustomerRecord = {
  customer_name: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
};

type SubscriptionRecord = {
  plan_type: string;
  total_subscriptions: number;
  total_revenue: number;
};

type ReportsState = {
  sales: SalesRecord[];
  category: CategoryRecord[];
  customers: CustomerRecord[];
  subscriptions: SubscriptionRecord[];
};

type MonthOption = {
  value: string;
  label: string;
  start: Date;
  end: Date;
};

const INITIAL_REPORTS: ReportsState = {
  sales: [],
  category: [],
  customers: [],
  subscriptions: [],
};

const TAB_LABELS: Record<TabKey, string> = {
  sales: "Sales",
  category: "Category",
  customers: "Customers",
  subscriptions: "Subscriptions",
};

const PIE_COLORS = ["#7c3aed", "#0ea5e9", "#f97316", "#22c55e", "#facc15", "#ec4899"];
const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_TO_SHOW = 18;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

function formatAxisCurrency(value: number): string {
  if (value >= 10_000_000) {
    return `${(value / 10_000_000).toFixed(1)}Cr`;
  }
  if (value >= 100_000) {
    return `${(value / 100_000).toFixed(1)}L`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return numberFormatter.format(Math.round(value));
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvRow(values: Array<string | number | null | undefined>): string {
  return values.map((value) => csvEscape(String(value ?? ""))).join(",");
}

async function parseJsonSafe<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ([] as unknown as T);
}

export default function ReportsPage() {
  const monthOptions = useMemo<MonthOption[]>(() => {
    const options: MonthOption[] = [];
    const base = startOfMonth(new Date());
    for (let i = 0; i < MONTHS_TO_SHOW; i += 1) {
      const monthDate = addMonths(base, -i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      options.push({
        value: format(start, "yyyy-MM"),
        label: format(start, "MMMM yyyy"),
        start,
        end,
      });
    }
    return options;
  }, []);
  const [activeTab, setActiveTab] = useState<TabKey>("sales");
  const [selectedMonthValue, setSelectedMonthValue] = useState<string>(() => monthOptions[0]?.value ?? "");
  const [reports, setReports] = useState<ReportsState>(INITIAL_REPORTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{ start: string; end: string; label: string } | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const selectedMonth = useMemo(
    () => monthOptions.find((option) => option.value === selectedMonthValue),
    [monthOptions, selectedMonthValue],
  );
  const activeData = reports[activeTab];
  const hasSelectedMonth = Boolean(selectedMonth);

  const handleGenerate = async () => {
    if (!selectedMonth) {
      setError("Please pick a month.");
      return;
    }

    const startDate = selectedMonth.start;
    const endDate = selectedMonth.end;
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    const params = new URLSearchParams({ start_date: start, end_date: end }).toString();

    setLoading(true);
    setError(null);

    try {
      const [salesRes, categoryRes, customersRes, subscriptionsRes] = await Promise.all([
        http.get(`/api/reports/sales?${params}`),
        http.get(`/api/reports/category?${params}`),
        http.get(`/api/reports/customers?${params}`),
        http.get(`/api/reports/subscriptions?${params}`),
      ]);

      const responses: Array<{ key: TabKey; response: Response }> = [
        { key: "sales", response: salesRes },
        { key: "category", response: categoryRes },
        { key: "customers", response: customersRes },
        { key: "subscriptions", response: subscriptionsRes },
      ];

      const failed = responses.find(({ response }) => !response.ok);
      if (failed) {
        throw new Error(`Failed to generate ${TAB_LABELS[failed.key as TabKey].toLowerCase()} report (${failed.response.status})`);
      }

      const [salesData, categoryData, customerData, subscriptionData] = await Promise.all([
        parseJsonSafe<SalesRecord[]>(salesRes),
        parseJsonSafe<CategoryRecord[]>(categoryRes),
        parseJsonSafe<CustomerRecord[]>(customersRes),
        parseJsonSafe<SubscriptionRecord[]>(subscriptionsRes),
      ]);

      setReports({
        sales: salesData ?? [],
        category: categoryData ?? [],
        customers: customerData ?? [],
        subscriptions: subscriptionData ?? [],
      });
      setLastGenerated({ start, end, label: selectedMonth.label });
      setHasGenerated(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate the selected report. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!hasGenerated || !lastGenerated) {
      return;
    }

    const rows: string[] = [];
    let header: string[] = [];

    switch (activeTab) {
      case "sales":
        header = ["Date", "Total Sales", "Total Orders"];
        rows.push(
          ...reports.sales.map((entry) =>
            buildCsvRow([
              entry.date,
              currencyFormatter.format(entry.total_sales ?? 0),
              numberFormatter.format(entry.total_orders ?? 0),
            ]),
          ),
        );
        break;
      case "category":
        header = ["Category", "Items Sold", "Total Revenue"];
        rows.push(
          ...reports.category.map((entry) =>
            buildCsvRow([
              entry.category_name,
              numberFormatter.format(entry.total_items_sold ?? 0),
              currencyFormatter.format(entry.total_revenue ?? 0),
            ]),
          ),
        );
        break;
      case "customers":
        header = ["Customer", "Orders", "Total Spent", "Last Order Date"];
        rows.push(
          ...reports.customers.map((entry) =>
            buildCsvRow([
              entry.customer_name,
              numberFormatter.format(entry.total_orders ?? 0),
              currencyFormatter.format(entry.total_spent ?? 0),
              entry.last_order_date,
            ]),
          ),
        );
        break;
      case "subscriptions":
        header = ["Plan Type", "Total Subscriptions", "Total Revenue"];
        rows.push(
          ...reports.subscriptions.map((entry) =>
            buildCsvRow([
              entry.plan_type,
              numberFormatter.format(entry.total_subscriptions ?? 0),
              currencyFormatter.format(entry.total_revenue ?? 0),
            ]),
          ),
        );
        break;
    }

    const csv = [header.join(","), ...rows].join("\n");
    const monthSlug = format(parseISO(lastGenerated.start), "yyyy-MM");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-${activeTab}-${monthSlug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const monthlyMetrics = useMemo(() => {
    if (!hasGenerated) {
      return null;
    }

    const totalSales = reports.sales.reduce((sum, entry) => sum + (entry.total_sales ?? 0), 0);
    const totalOrders = reports.sales.reduce((sum, entry) => sum + (entry.total_orders ?? 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const topCategory = reports.category[0];
    const totalSubscriptions = reports.subscriptions.reduce(
      (sum, entry) => sum + (entry.total_subscriptions ?? 0),
      0,
    );
    const subscriptionRevenue = reports.subscriptions.reduce(
      (sum, entry) => sum + (entry.total_revenue ?? 0),
      0,
    );

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      topCategoryName: topCategory?.category_name,
      topCategoryRevenue: topCategory?.total_revenue ?? 0,
      totalSubscriptions,
      subscriptionRevenue,
    };
  }, [reports, hasGenerated]);

  const metricCards = useMemo(() => {
    if (!monthlyMetrics) {
      return [];
    }

    return [
      {
        title: "Total Sales",
        value: currencyFormatter.format(monthlyMetrics.totalSales),
      },
      {
        title: "Total Orders",
        value: numberFormatter.format(monthlyMetrics.totalOrders),
      },
      {
        title: "Avg Order Value",
        value:
          monthlyMetrics.totalOrders > 0
            ? currencyFormatter.format(monthlyMetrics.avgOrderValue)
            : "—",
      },
      {
        title: "Top Category",
        value: monthlyMetrics.topCategoryName ?? "—",
        helper:
          monthlyMetrics.topCategoryName && monthlyMetrics.topCategoryRevenue > 0
            ? `Revenue · ${currencyFormatter.format(monthlyMetrics.topCategoryRevenue)}`
            : undefined,
      },
      {
        title: "Total Subscriptions",
        value: numberFormatter.format(monthlyMetrics.totalSubscriptions),
        helper:
          monthlyMetrics.subscriptionRevenue > 0
            ? `Revenue · ${currencyFormatter.format(monthlyMetrics.subscriptionRevenue)}`
            : undefined,
      },
    ];
  }, [monthlyMetrics]);

  const salesByDayOfWeek = useMemo(() => {
    type SalesByDay = {
      day: string;
      total_sales: number;
      total_orders: number;
      average_order_value: number;
    };

    const result: SalesByDay[] = [];

    if (!reports.sales.length) {
      return result;
    }

    const aggregates = new Map<string, { totalSales: number; totalOrders: number }>();
    for (const entry of reports.sales) {
      const dayKey = format(parseISO(entry.date), "EEE");
      const current = aggregates.get(dayKey) ?? { totalSales: 0, totalOrders: 0 };
      current.totalSales += entry.total_sales ?? 0;
      current.totalOrders += entry.total_orders ?? 0;
      aggregates.set(dayKey, current);
    }

    DAY_ORDER.filter((day) => aggregates.has(day)).forEach((day) => {
      const { totalSales, totalOrders } = aggregates.get(day)!;
      result.push({
        day,
        total_sales: Number(totalSales.toFixed(2)),
        total_orders: totalOrders,
        average_order_value:
          totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0,
      });
    });

    return result;
  }, [reports.sales]);

  const hasDataForActiveTab =
    activeTab === "sales" ? salesByDayOfWeek.length > 0 : activeData.length > 0;

  const renderTable = () => {
    switch (activeTab) {
      case "sales":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Total Orders</TableHead>
                <TableHead className="text-right">Avg Order Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesByDayOfWeek.map((row) => (
                <TableRow key={row.day}>
                  <TableCell>{row.day}</TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(row.total_sales ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {numberFormatter.format(row.total_orders ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.total_orders > 0
                      ? currencyFormatter.format(row.average_order_value ?? 0)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "category":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Items Sold</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.category.map((row) => (
                <TableRow key={row.category_name}>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell className="text-right">
                    {numberFormatter.format(row.total_items_sold ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(row.total_revenue ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "customers":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.customers.map((row) => (
                <TableRow key={row.customer_name}>
                  <TableCell>{row.customer_name}</TableCell>
                  <TableCell className="text-right">
                    {numberFormatter.format(row.total_orders ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(row.total_spent ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.last_order_date
                      ? format(parseISO(row.last_order_date), "dd MMM yyyy")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "subscriptions":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Type</TableHead>
                <TableHead className="text-right">Total Subscriptions</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.subscriptions.map((row) => (
                <TableRow key={row.plan_type}>
                  <TableCell>{row.plan_type}</TableCell>
                  <TableCell className="text-right">
                    {numberFormatter.format(row.total_subscriptions ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(row.total_revenue ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  const renderChart = () => {
    if (activeTab === "sales" && !salesByDayOfWeek.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No data available for the selected month.
        </div>
      );
    }

    if (activeTab !== "sales" && !activeData.length) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No data available for the selected month.
        </div>
      );
    }

    switch (activeTab) {
      case "sales":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis
                yAxisId="sales"
                tickFormatter={(value: number) => formatAxisCurrency(value)}
                width={80}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tickFormatter={(value: number) => numberFormatter.format(value)}
                width={60}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Total Orders") {
                    return [numberFormatter.format(value), name];
                  }
                  return [currencyFormatter.format(value), name];
                }}
              />
              <Legend />
              <Bar yAxisId="sales" dataKey="total_sales" fill="#0ea5e9" name="Total Sales" />
              <Bar yAxisId="orders" dataKey="total_orders" fill="#f97316" name="Total Orders" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "category":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reports.category}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category_name" />
              <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
              <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
              <Legend />
              <Bar dataKey="total_revenue" fill="#7c3aed" name="Total Revenue" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "customers":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reports.customers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="customer_name" />
              <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
              <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
              <Legend />
              <Bar dataKey="total_spent" fill="#0ea5e9" name="Total Spent" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "subscriptions":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value: number) => numberFormatter.format(value)}
                labelFormatter={(label) => String(label)}
              />
              <Legend />
              <Pie
                data={reports.subscriptions}
                dataKey="total_subscriptions"
                nameKey="plan_type"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
              >
                {reports.subscriptions.map((entry, index) => (
                  <Cell key={entry.plan_type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout activePage="reports">
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-6">
            <div className="flex flex-col gap-2">
              <CardTitle>Reports &amp; Analytics</CardTitle>
              <CardDescription>
                Explore revenue trends, category performance, loyal customers, and subscription momentum across any timeframe.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Reporting month</span>
                <Select value={selectedMonthValue} onValueChange={setSelectedMonthValue}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="hidden text-sm font-medium text-muted-foreground sm:block">
                  Report actions
                </span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !hasSelectedMonth}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      "Generate Report"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!hasGenerated}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
              <TabsList className="grid gap-2 sm:w-fit sm:grid-cols-4">
                {Object.entries(TAB_LABELS).map(([key, label]) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{TAB_LABELS[activeTab]} Insights</CardTitle>
              <CardDescription>
                {hasGenerated && lastGenerated
                  ? `Showing data for ${lastGenerated.label}.`
                  : "Generate a report to view detailed analytics."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                Crunching the numbers…
              </div>
            )}

            {!loading && !hasGenerated && (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select a month and generate the report to see insights here.
              </div>
            )}

            {!loading && hasGenerated && (
              <>
                {metricCards.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {metricCards.map(({ title, value, helper }) => (
                      <div
                        key={title}
                        className="rounded-lg border border-border bg-card p-4 shadow-sm"
                      >
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                        {helper && (
                          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hasDataForActiveTab ? (
                  <>
                    <div className="overflow-x-auto">{renderTable()}</div>
                    <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
                      {renderChart()}
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No data found for this month. Try another month.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
