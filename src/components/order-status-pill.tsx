"use client";

import { Badge } from "@/components/ui/badge";
import { normalizeOrderStatusKey, orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { cn } from "@/lib/utils";

type OrderStatusPillProps = {
  status: string | null | undefined;
  paid?: boolean | null;
  showPaymentForConfirmed?: boolean;
  className?: string;
};

export const getOrderStatusPillClassName = (status: string | null | undefined) => {
  const normalized = normalizeOrderStatusKey(status);
  if (normalized === "confirmed") {
    return "border border-sky-200 bg-sky-50 text-sky-700";
  }
  if (normalized === "dispatched") {
    return "border border-indigo-200 bg-indigo-50 text-indigo-700";
  }
  if (normalized === "delivered") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "cancelled") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border border-slate-200 bg-slate-50 text-slate-700";
};

export const getOrderStatusPillLabel = (
  status: string | null | undefined,
  paid?: boolean | null,
  showPaymentForConfirmed: boolean = false,
) => {
  const label = orderStatusLabel(status);
  if (showPaymentForConfirmed && normalizeOrderStatusKey(status) === "confirmed") {
    return `${label} - ${paymentStatusLabel(Boolean(paid))}`;
  }
  return label;
};

export function OrderStatusPill({
  status,
  paid,
  showPaymentForConfirmed = false,
  className,
}: OrderStatusPillProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getOrderStatusPillClassName(status),
        className,
      )}
    >
      {getOrderStatusPillLabel(status, paid, showPaymentForConfirmed)}
    </Badge>
  );
}
