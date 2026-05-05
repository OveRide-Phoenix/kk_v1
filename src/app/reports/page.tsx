"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, endOfMonth, format, getDaysInMonth, parseISO, startOfMonth } from "date-fns";
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
  LineChart,
  Line,
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
const MONTHS_TO_SHOW = 18;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyTooltip(value: unknown): string {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "—" : currencyFormatter.format(parsed);
}

function formatNumberTooltip(value: unknown): string {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "—" : numberFormatter.format(parsed);
}

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
  const [comparisonReports, setComparisonReports] = useState<ReportsState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{ start: string; end: string; label: string } | null>(null);
  const [comparisonMetadata, setComparisonMetadata] = useState<{ start: string; end: string; label: string } | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const initialLoadRef = useRef(false);

  const selectedMonth = useMemo(
    () => monthOptions.find((option) => option.value === selectedMonthValue),
    [monthOptions, selectedMonthValue],
  );
  const activeData = reports[activeTab];
  const hasSelectedMonth = Boolean(selectedMonth);

  const fetchReportsForRange = useCallback(async (startDate: Date, endDate: Date): Promise<ReportsState> => {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    const params = new URLSearchParams({ start_date: start, end_date: end }).toString();

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

    const failed = responses.find(
      ({ response }) => !response.ok && response.status !== 404,
    );
    if (failed) {
      throw new Error(
        `Failed to generate ${TAB_LABELS[failed.key as TabKey].toLowerCase()} report (${failed.response.status})`,
      );
    }

    const [salesData, categoryData, customerData, subscriptionData] = await Promise.all([
      salesRes.status === 404 ? Promise.resolve([] as SalesRecord[]) : parseJsonSafe<SalesRecord[]>(salesRes),
      categoryRes.status === 404 ? Promise.resolve([] as CategoryRecord[]) : parseJsonSafe<CategoryRecord[]>(categoryRes),
      customersRes.status === 404 ? Promise.resolve([] as CustomerRecord[]) : parseJsonSafe<CustomerRecord[]>(customersRes),
      subscriptionsRes.status === 404
        ? Promise.resolve([] as SubscriptionRecord[])
        : parseJsonSafe<SubscriptionRecord[]>(subscriptionsRes),
    ]);

    return {
      sales: salesData ?? [],
      category: categoryData ?? [],
      customers: customerData ?? [],
      subscriptions: subscriptionData ?? [],
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedMonth) {
      setError("Please pick a month.");
      return;
    }

    setLoading(true);
    setError(null);
    setComparisonReports(null);
    setComparisonMetadata(null);

    const startDate = selectedMonth.start;
    const endDate = selectedMonth.end;

    try {
      const currentReports = await fetchReportsForRange(startDate, endDate);
      setReports(currentReports);
      setLastGenerated({
        start: format(startDate, "yyyy-MM-dd"),
        end: format(endDate, "yyyy-MM-dd"),
        label: selectedMonth.label,
      });
      setHasGenerated(true);

      const comparisonStart = startOfMonth(addMonths(startDate, -1));
      const comparisonEnd = endOfMonth(addMonths(startDate, -1));

      try {
        const previousReports = await fetchReportsForRange(comparisonStart, comparisonEnd);
        setComparisonReports(previousReports);
        setComparisonMetadata({
          start: format(comparisonStart, "yyyy-MM-dd"),
          end: format(comparisonEnd, "yyyy-MM-dd"),
          label: format(comparisonStart, "MMMM yyyy"),
        });
      } catch (comparisonError) {
        console.warn("Unable to load comparison month report", comparisonError);
        setComparisonReports(null);
        setComparisonMetadata(null);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate the selected report. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, fetchReportsForRange]);

  useEffect(() => {
    if (!initialLoadRef.current && selectedMonth) {
      initialLoadRef.current = true;
      handleGenerate();
    }
  }, [selectedMonth, handleGenerate]);

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

  const salesDailyStats = useMemo(() => {
    if (!reports.sales.length) {
      return [];
    }

    return [...reports.sales]
      .map((entry) => {
        const date = parseISO(entry.date);
        const totalSales = entry.total_sales ?? 0;
        const totalOrders = entry.total_orders ?? 0;
        return {
          dateKey: entry.date,
          label: format(date, "dd MMM"),
          dayOfMonth: date.getDate(),
          total_sales: Number(totalSales.toFixed(2)),
          total_orders: totalOrders,
          average_order_value:
            totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [reports.sales]);

  const comparisonSalesDailyStats = useMemo(() => {
    if (!comparisonReports?.sales?.length) {
      return [];
    }

    return [...comparisonReports.sales]
      .map((entry) => {
        const date = parseISO(entry.date);
        const totalSales = entry.total_sales ?? 0;
        const totalOrders = entry.total_orders ?? 0;
        return {
          dateKey: entry.date,
          label: format(date, "dd MMM"),
          dayOfMonth: date.getDate(),
          total_sales: Number(totalSales.toFixed(2)),
          total_orders: totalOrders,
          average_order_value:
            totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [comparisonReports]);

  const salesComparisonSeries = useMemo(() => {
    if (!salesDailyStats.length && !comparisonSalesDailyStats.length) {
      return [];
    }

    const daySet = new Set<number>();
    salesDailyStats.forEach((entry) => daySet.add(entry.dayOfMonth));
    comparisonSalesDailyStats.forEach((entry) => daySet.add(entry.dayOfMonth));

    const days = Array.from(daySet).sort((a, b) => a - b);

    return days.map((day) => {
      const current = salesDailyStats.find((entry) => entry.dayOfMonth === day);
      const previous = comparisonSalesDailyStats.find((entry) => entry.dayOfMonth === day);
      const dayLabel = `Day ${day.toString().padStart(2, "0")}`;

      return {
        dayLabel,
        current_sales: current?.total_sales,
        previous_sales: previous?.total_sales,
        current_orders: current?.total_orders,
        previous_orders: previous?.total_orders,
        current_aov: current?.average_order_value,
        previous_aov: previous?.average_order_value,
      };
    });
  }, [salesDailyStats, comparisonSalesDailyStats]);

  const salesAggregates = useMemo(() => {
    const currentSales = reports.sales.reduce((sum, entry) => sum + (entry.total_sales ?? 0), 0);
    const currentOrders = reports.sales.reduce((sum, entry) => sum + (entry.total_orders ?? 0), 0);
    const currentAOV = currentOrders > 0 ? currentSales / currentOrders : 0;

    const hasPreviousSales = Boolean(comparisonReports?.sales?.length);
    const previousSales = hasPreviousSales
      ? comparisonReports!.sales.reduce((sum, entry) => sum + (entry.total_sales ?? 0), 0)
      : null;
    const previousOrders = hasPreviousSales
      ? comparisonReports!.sales.reduce((sum, entry) => sum + (entry.total_orders ?? 0), 0)
      : null;
    const previousAOV =
      hasPreviousSales && previousOrders && previousOrders > 0 && previousSales !== null
        ? previousSales / previousOrders
        : null;

    const salesChange =
      previousSales && previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : null;
    const orderChange =
      previousOrders && previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : null;

    return {
      currentSales,
      currentOrders,
      currentAOV,
      previousSales,
      previousOrders,
      previousAOV,
      salesChange,
      orderChange,
    };
  }, [reports.sales, comparisonReports]);

  const forecastMetrics = useMemo(() => {
    if (!selectedMonth) {
      return { expectedNextMonthSales: null, methodLabel: undefined as string | undefined };
    }

    const currentDaysWithSales = salesDailyStats.length;
    const previousDaysWithSales = comparisonSalesDailyStats.length;
    const currentDailyAverage =
      currentDaysWithSales > 0 ? salesAggregates.currentSales / currentDaysWithSales : 0;
    const previousDailyAverage =
      previousDaysWithSales > 0 && salesAggregates.previousSales !== null
        ? salesAggregates.previousSales / previousDaysWithSales
        : null;

    const blendedDailyAverage =
      previousDailyAverage !== null ? (currentDailyAverage + previousDailyAverage) / 2 : currentDailyAverage;

    if (blendedDailyAverage <= 0) {
      return { expectedNextMonthSales: null, methodLabel: undefined };
    }

    const nextMonthStart = startOfMonth(addMonths(selectedMonth.start, 1));
    const expectedNextMonthSales = blendedDailyAverage * getDaysInMonth(nextMonthStart);

    return {
      expectedNextMonthSales,
      methodLabel:
        previousDailyAverage !== null
          ? "Average daily revenue across the last two months"
          : "Based on current month daily run rate",
    };
  }, [selectedMonth, salesAggregates, salesDailyStats, comparisonSalesDailyStats]);

  const loyaltyStats = useMemo(() => {
    if (!reports.customers.length) {
      return {
        totalCustomers: 0,
        newCustomers: 0,
        regularCustomers: 0,
        loyalCustomers: 0,
        returningCustomers: 0,
        returningRate: 0,
        loyalShare: 0,
      };
    }

    let newCustomers = 0;
    let regularCustomers = 0;
    let loyalCustomers = 0;

    reports.customers.forEach((customer) => {
      const orders = customer.total_orders ?? 0;
      if (orders >= 5) {
        loyalCustomers += 1;
      } else if (orders >= 2) {
        regularCustomers += 1;
      } else {
        newCustomers += 1;
      }
    });

    const totalCustomers = newCustomers + regularCustomers + loyalCustomers;
    const returningCustomers = regularCustomers + loyalCustomers;

    return {
      totalCustomers,
      newCustomers,
      regularCustomers,
      loyalCustomers,
      returningCustomers,
      returningRate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
      loyalShare: totalCustomers > 0 ? (loyalCustomers / totalCustomers) * 100 : 0,
    };
  }, [reports.customers]);

  const loyaltySegments = useMemo(() => {
    const segments = [
      { segment: "New", count: loyaltyStats.newCustomers },
      { segment: "Regular", count: loyaltyStats.regularCustomers },
      { segment: "Loyal", count: loyaltyStats.loyalCustomers },
    ];
    return segments.filter((segment) => segment.count > 0);
  }, [loyaltyStats]);

  const monthComparisonChartData = useMemo(() => {
    const rows: Array<{ month: string; total_sales: number; total_orders: number }> = [];
    if (salesAggregates.previousSales !== null && comparisonMetadata) {
      rows.push({
        month: comparisonMetadata.label,
        total_sales: Number(salesAggregates.previousSales.toFixed(2)),
        total_orders: salesAggregates.previousOrders ?? 0,
      });
    }
    if (selectedMonth) {
      rows.push({
        month: selectedMonth.label,
        total_sales: Number(salesAggregates.currentSales.toFixed(2)),
        total_orders: salesAggregates.currentOrders,
      });
    }
    return rows;
  }, [salesAggregates, selectedMonth, comparisonMetadata]);

  const categoryComparisonData = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        currentRevenue: number;
        previousRevenue: number;
        currentItems: number;
        previousItems: number;
      }
    >();

    const ensureEntry = (category: string) => {
      if (!map.has(category)) {
        map.set(category, {
          category,
          currentRevenue: 0,
          previousRevenue: 0,
          currentItems: 0,
          previousItems: 0,
        });
      }
      return map.get(category)!;
    };

    reports.category.forEach((row) => {
      const entry = ensureEntry(row.category_name);
      entry.currentRevenue += row.total_revenue ?? 0;
      entry.currentItems += row.total_items_sold ?? 0;
    });

    comparisonReports?.category?.forEach((row) => {
      const entry = ensureEntry(row.category_name);
      entry.previousRevenue += row.total_revenue ?? 0;
      entry.previousItems += row.total_items_sold ?? 0;
    });

    const values = Array.from(map.values());
    values.sort(
      (a, b) =>
        b.currentRevenue + b.previousRevenue - (a.currentRevenue + a.previousRevenue),
    );

    return values.slice(0, 8);
  }, [reports.category, comparisonReports]);

  const subscriptionComparisonData = useMemo(() => {
    const map = new Map<
      string,
      {
        plan: string;
        currentSubscriptions: number;
        previousSubscriptions: number;
        currentRevenue: number;
        previousRevenue: number;
      }
    >();

    const ensureEntry = (plan: string) => {
      if (!map.has(plan)) {
        map.set(plan, {
          plan,
          currentSubscriptions: 0,
          previousSubscriptions: 0,
          currentRevenue: 0,
          previousRevenue: 0,
        });
      }
      return map.get(plan)!;
    };

    reports.subscriptions.forEach((row) => {
      const entry = ensureEntry(row.plan_type);
      entry.currentSubscriptions += row.total_subscriptions ?? 0;
      entry.currentRevenue += row.total_revenue ?? 0;
    });

    comparisonReports?.subscriptions?.forEach((row) => {
      const entry = ensureEntry(row.plan_type);
      entry.previousSubscriptions += row.total_subscriptions ?? 0;
      entry.previousRevenue += row.total_revenue ?? 0;
    });

    return Array.from(map.values());
  }, [reports.subscriptions, comparisonReports]);

  const topCustomers = useMemo(() => {
    if (!reports.customers.length) {
      return [];
    }

    return [...reports.customers]
      .sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0))
      .slice(0, 10);
  }, [reports.customers]);

  const metricCards = useMemo(() => {
    if (!hasGenerated) {
      return [];
    }

    const formatChange = (value: number | null) => {
      if (value === null) return undefined;
      const sign = value >= 0 ? "+" : "";
      return `${sign}${value.toFixed(1)}%`;
    };

    return [
      {
        title: "Current Month Sales",
        value: currencyFormatter.format(salesAggregates.currentSales),
        helper:
          salesAggregates.salesChange !== null && comparisonMetadata
            ? `MoM change · ${formatChange(salesAggregates.salesChange)} vs ${comparisonMetadata.label}`
            : undefined,
      },
      {
        title: "Total Orders",
        value: numberFormatter.format(salesAggregates.currentOrders),
        helper:
          salesAggregates.orderChange !== null && comparisonMetadata
            ? `MoM change · ${formatChange(salesAggregates.orderChange)} vs ${comparisonMetadata.label}`
            : undefined,
      },
      {
        title: "Returning Customers",
        value: numberFormatter.format(loyaltyStats.returningCustomers),
        helper:
          loyaltyStats.totalCustomers > 0
            ? `${loyaltyStats.returningRate.toFixed(1)}% of active customers`
            : undefined,
      },
      {
        title: "Loyal Customers",
        value: numberFormatter.format(loyaltyStats.loyalCustomers),
        helper:
          loyaltyStats.totalCustomers > 0
            ? `${loyaltyStats.loyalShare.toFixed(1)}% of active customers`
            : undefined,
      },
      {
        title: "Projected Next Month Sales",
        value:
          forecastMetrics.expectedNextMonthSales !== null
            ? currencyFormatter.format(forecastMetrics.expectedNextMonthSales)
            : "—",
        helper: forecastMetrics.methodLabel,
      },
    ];
  }, [hasGenerated, salesAggregates, loyaltyStats, forecastMetrics, comparisonMetadata]);

  const hasDataForActiveTab =
    activeTab === "sales"
      ? salesDailyStats.length > 0 || comparisonSalesDailyStats.length > 0
      : activeData.length > 0;

  const renderTable = () => {
    switch (activeTab) {
      case "sales":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Total Orders</TableHead>
                <TableHead className="text-right">Avg Order Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesDailyStats.map((row) => (
                <TableRow key={row.dateKey}>
                  <TableCell>{row.label}</TableCell>
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

  const renderCharts = () => {
    switch (activeTab) {
      case "sales": {
        if (!salesDailyStats.length && !comparisonSalesDailyStats.length) {
          return (
            <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              No sales data available for the selected month.
            </div>
          );
        }

        return (
          <div className="grid gap-4">
            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Revenue vs previous month</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesComparisonSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayLabel" />
                  <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
                  <Tooltip formatter={formatCurrencyTooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="current_sales"
                    name={selectedMonth?.label ?? "Current month"}
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  {comparisonSalesDailyStats.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey="previous_sales"
                      name={comparisonMetadata?.label ?? "Previous month"}
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Average order value trend</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesComparisonSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dayLabel" />
                    <YAxis tickFormatter={(value: number) => currencyFormatter.format(value)} width={80} />
                    <Tooltip formatter={formatCurrencyTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="current_aov"
                      name={`${selectedMonth?.label ?? "Current"} AOV`}
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    {comparisonSalesDailyStats.length > 0 && (
                      <Line
                        type="monotone"
                        dataKey="previous_aov"
                        name={`${comparisonMetadata?.label ?? "Previous"} AOV`}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Month-over-month sales</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthComparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
                    <Tooltip formatter={formatCurrencyTooltip} />
                    <Legend />
                    <Bar dataKey="total_sales" name="Total Sales" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {monthComparisonChartData.length > 0 && (
              <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Month-over-month order volume</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthComparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value: number) => numberFormatter.format(value)} width={60} />
                    <Tooltip formatter={formatNumberTooltip} />
                    <Legend />
                    <Bar dataKey="total_orders" name="Total Orders" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      }

      case "category": {
        if (!categoryComparisonData.length) {
          return (
            <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              No category insights available for this month.
            </div>
          );
        }

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Revenue by category (MoM)</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
                  <Tooltip formatter={formatCurrencyTooltip} />
                  <Legend />
                  <Bar dataKey="currentRevenue" name={selectedMonth?.label ?? "Current"} fill="#0ea5e9" />
                  {comparisonReports?.category?.length ? (
                    <Bar
                      dataKey="previousRevenue"
                      name={comparisonMetadata?.label ?? "Previous"}
                      fill="#7c3aed"
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Items sold by category (MoM)</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={(value: number) => numberFormatter.format(value)} width={60} />
                  <Tooltip formatter={formatNumberTooltip} />
                  <Legend />
                  <Bar dataKey="currentItems" name={selectedMonth?.label ?? "Current"} fill="#0ea5e9" />
                  {comparisonReports?.category?.length ? (
                    <Bar
                      dataKey="previousItems"
                      name={comparisonMetadata?.label ?? "Previous"}
                      fill="#f97316"
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case "customers": {
        if (!reports.customers.length) {
          return (
            <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              No customer insights available for this month.
            </div>
          );
        }

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Top customers by spend</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="customer_name" />
                  <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
                  <Tooltip formatter={formatCurrencyTooltip} />
                  <Legend />
                  <Bar dataKey="total_spent" name="Total Spend" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Orders by customer</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="customer_name" />
                  <YAxis tickFormatter={(value: number) => numberFormatter.format(value)} width={60} />
                  <Tooltip formatter={formatNumberTooltip} />
                  <Legend />
                  <Bar dataKey="total_orders" name="Total Orders" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {loyaltySegments.length > 0 && (
              <div className="h-72 w-full rounded-lg border bg-muted/20 p-4 lg:col-span-2">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Customer loyalty breakdown</p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={formatNumberTooltip} />
                    <Legend />
                    <Pie data={loyaltySegments} dataKey="count" nameKey="segment" innerRadius={60} outerRadius={110}>
                      {loyaltySegments.map((entry, index) => (
                        <Cell key={entry.segment} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      }

      case "subscriptions": {
        if (!subscriptionComparisonData.length) {
          return (
            <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              No subscription insights available for this month.
            </div>
          );
        }

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Subscriptions by plan (MoM)</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis tickFormatter={(value: number) => numberFormatter.format(value)} width={60} />
                  <Tooltip formatter={formatNumberTooltip} />
                  <Legend />
                  <Bar
                    dataKey="currentSubscriptions"
                    name={selectedMonth?.label ?? "Current"}
                    fill="#0ea5e9"
                  />
                  {comparisonReports?.subscriptions?.length ? (
                    <Bar
                      dataKey="previousSubscriptions"
                      name={comparisonMetadata?.label ?? "Previous"}
                      fill="#7c3aed"
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-72 w-full rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Subscription revenue (MoM)</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis tickFormatter={(value: number) => formatAxisCurrency(value)} width={80} />
                  <Tooltip formatter={formatCurrencyTooltip} />
                  <Legend />
                  <Bar dataKey="currentRevenue" name={selectedMonth?.label ?? "Current"} fill="#22c55e" />
                  {comparisonReports?.subscriptions?.length ? (
                    <Bar
                      dataKey="previousRevenue"
                      name={comparisonMetadata?.label ?? "Previous"}
                      fill="#f97316"
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            No data available.
          </div>
        );
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
                    {renderCharts()}
                    <div className="overflow-x-auto">{renderTable()}</div>
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
