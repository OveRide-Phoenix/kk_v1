export const normalizeOrderStatusKey = (status?: string | null) => {
  const raw = (status ?? "").trim().toLowerCase();
  const base = raw
    .replace(/\(payment due\)/g, "")
    .replace(/\s+-\s+payment due/g, "")
    .trim();

  if (!base) return "confirmed";
  if (
    [
      "pending",
      "payment due",
      "awaiting payment",
      "confirmed - payment due",
      "confirmed but needs to pay",
      "confirmed",
      "preparing",
      "processing",
    ].includes(base)
  ) {
    return "confirmed";
  }
  if (["dispatched", "in progress", "on the way", "out for delivery", "en route"].includes(base)) {
    return "dispatched";
  }
  if (["delivered", "completed", "complete"].includes(base)) {
    return "delivered";
  }
  if (["cancelled", "canceled"].includes(base)) {
    return "cancelled";
  }
  return base;
};

export const orderStatusLabel = (status?: string | null) => {
  const key = normalizeOrderStatusKey(status);
  if (key === "confirmed") return "Confirmed";
  if (key === "dispatched") return "Dispatched";
  if (key === "delivered") return "Delivered";
  if (key === "cancelled") return "Cancelled";
  return key
    .split(/\s+/)
    .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join(" ");
};

export const paymentStatusLabel = (paid?: boolean | null) => {
  return paid ? "Payment Done" : "Payment Due";
};
