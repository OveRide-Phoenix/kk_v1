"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format as formatDate } from "date-fns";
import { Crown, FileText, Loader2, Mail, MapPin, PencilLine, Plus, User2 } from "lucide-react";

import { useSearchParams } from "next/navigation";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker";
import { http } from "@/lib/http";
import { normalizeOrderStatusKey, orderStatusLabel } from "@/lib/order-status";

const CITY_OPTIONS = [
  { label: "Mysore", code: "MYS" },
  { label: "Bangalore", code: "BLR" },
];

const CITY_LABELS: Record<string, string> = {
  MYS: "Mysore",
  BLR: "Bangalore",
};

const resolveCityCode = (value: string) => {
  const match = CITY_OPTIONS.find(
    (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ? match.code : "MYS";
};

interface CustomerProfile {
  customer_id: number;
  referred_by?: string | null;
  primary_mobile: string;
  alternative_mobile?: string | null;
  name: string;
  recipient_name: string;
  payment_frequency?: string | null;
  email?: string | null;
  house_apartment_no?: string | null;
  written_address: string;
  city: string;
  pin_code: string;
  latitude?: number | null;
  longitude?: number | null;
  address_type?: string | null;
  route_assignment?: string | null;
  created_at?: string | null;
  is_admin?: boolean | number;
  roles?: number[] | null;
  role_codes?: string[] | null;
  admin_is_active?: boolean;
}

interface AddressEntry {
  address_id: number;
  address_type: string;
  house_apartment_no: string | null;
  written_address: string;
  city: string;
  city_code: string;
  pin_code: string;
  is_default: boolean;
  latitude?: number | null;
  longitude?: number | null;
  route_assignment?: string | null;
}

type OrderItem = {
  item_name: string;
  quantity: number;
  price: number;
};

type OrderSummary = {
  order_id: number;
  created_at: string | null;
  total_price: number;
  status: string;
  payment_status?: string;
  payment_method: string;
  order_type?: string | null;
  address: {
    label: string;
    line: string;
    city: string;
    pin_code: string;
  };
  items: OrderItem[];
};

type AddressFormState = {
  address_type: string;
  house_apartment_no: string;
  written_address: string;
  city: string;
  city_code: string;
  pin_code: string;
  latitude: string;
  longitude: string;
  route_assignment: string;
  is_default: boolean;
};

const PAYMENT_OPTIONS = ["Daily", "Weekly", "Monthly"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const createAddressForm = (overrides: Partial<AddressFormState> = {}): AddressFormState => ({
  address_type: overrides.address_type ?? "Home",
  house_apartment_no: overrides.house_apartment_no ?? "",
  written_address: overrides.written_address ?? "",
  city: overrides.city ?? "",
  city_code: overrides.city_code ?? "",
  pin_code: overrides.pin_code ?? "",
  latitude: overrides.latitude ?? "",
  longitude: overrides.longitude ?? "",
  route_assignment: overrides.route_assignment ?? "",
  is_default: overrides.is_default ?? false,
});

export default function AccountPage() {
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isAdminStore = useAuthStore((state) => state.isAdmin);

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [activeSection, setActiveSection] = useState<"profile" | "addresses" | "orders" | "help">(
    "profile",
  );

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalMode, setAddressModalMode] = useState<"create" | "edit">("create");
  const [addressEditingId, setAddressEditingId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(createAddressForm());
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [cityChangeAlert, setCityChangeAlert] = useState<{
    cityCode: string;
    city?: string;
  } | null>(null);
  const [billOrderId, setBillOrderId] = useState<number | null>(null);

  useEffect(() => {
    const section = searchParams.get("section");
    if (
      section === "profile" ||
      section === "addresses" ||
      section === "orders" ||
      section === "help"
    ) {
      setActiveSection(section);
      return;
    }
    setActiveSection("profile");
  }, [searchParams]);

  useHydrateAuthUser();

  const customerId = user?.customer_id;
  const currentCityLabel = useMemo(() => {
    if (!user?.city_code) return "this city";
    return CITY_LABELS[user.city_code] ?? user.city_code;
  }, [user?.city_code]);

  const fetchProfile = useCallback(async () => {
    if (!customerId) return;
    const response = await http.get(`/get-customer/${customerId}`);
    if (!response.ok) {
      throw new Error("Unable to load profile");
    }
    const data = (await response.json()) as CustomerProfile;
    setProfile(data);
    setForm(data);
  }, [customerId]);

  const fetchAddresses = useCallback(async () => {
    if (!customerId) return [];
    const response = await http.get(`/api/customers/${customerId}/addresses`);
    if (!response.ok) {
      throw new Error("Unable to load addresses");
    }
    const data = (await response.json()) as AddressEntry[];
    setAddresses(data);
    return data;
  }, [customerId]);

  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const response = await http.get(`/api/customers/${customerId}/orders`);
      if (!response.ok) {
        throw new Error("Unable to load order history");
      }
      const data = (await response.json()) as OrderSummary[];
      setOrders(data.map((order) => ({ ...order, order_type: order.order_type ?? "one_time" })));
    } catch {
      setOrders([]);
      setOrdersError("Unable to load your order history right now.");
    } finally {
      setOrdersLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchProfile(), fetchAddresses()]);
      } catch {
        if (!cancelled) {
          setError("Unable to load your account details. Please try again later.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [customerId, fetchProfile, fetchAddresses, fetchOrders]);

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? null,
    [addresses],
  );
  const otherAddresses = useMemo(
    () => addresses.filter((address) => !address.is_default),
    [addresses],
  );

  const mapEmbedUrl = useMemo(() => {
    if (!profile) return null;
    const hasCoordinates =
      profile.latitude !== null &&
      profile.longitude !== null &&
      profile.latitude !== undefined &&
      profile.longitude !== undefined &&
      Math.abs(profile.latitude) + Math.abs(profile.longitude) > 0;

    if (hasCoordinates) {
      return `https://maps.google.com/maps?q=${profile.latitude},${profile.longitude}&z=15&output=embed`;
    }

    const query = [
      profile.house_apartment_no,
      profile.written_address,
      profile.city,
      profile.pin_code,
    ]
      .filter(Boolean)
      .join(", ");
    if (!query) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  }, [profile]);

  const billOrder = useMemo(
    () => orders.find((order) => order.order_id === billOrderId) ?? null,
    [orders, billOrderId],
  );

  const sortedOrders = useMemo(() => {
    const getTimestamp = (order: OrderSummary) => {
      if (order.created_at) {
        const parsed = new Date(order.created_at).getTime();
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return order.order_id;
    };
    return [...orders].sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      const matchesStatus =
        orderStatusFilter === "all" || normalizeOrderStatusKey(order.status) === orderStatusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        String(order.order_id),
        order.status,
        order.order_type ?? "",
        order.address.label,
        order.address.line,
        ...order.items.map((item) => item.item_name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [orderSearch, orderStatusFilter, sortedOrders]);

  const readOnlyFieldClasses =
    "disabled:bg-[#f6f0e9] disabled:border-[#e4d6ca] disabled:text-[#463028] disabled:opacity-100 disabled:placeholder:text-[#9c8576]";
  const readOnlySelectClasses =
    "disabled:bg-[#f6f0e9] disabled:border-[#e4d6ca] disabled:text-[#463028] disabled:opacity-100 disabled:[&>span]:text-[#9c8576]";

  const profileHasAdminRole = Array.isArray(profile?.role_codes)
    ? profile.role_codes.includes("admin")
    : Boolean(profile?.is_admin);

  const isAdmin = useMemo(() => {
    const userWithRoles = user as { role_codes?: string[]; roleCodes?: string[] } | null;
    const userRoleCodes = Array.isArray(userWithRoles?.role_codes)
      ? userWithRoles.role_codes
      : Array.isArray(userWithRoles?.roleCodes)
        ? userWithRoles.roleCodes
        : [];
    return Boolean(isAdminStore || profileHasAdminRole || userRoleCodes.includes("admin"));
  }, [isAdminStore, profileHasAdminRole, user]);

  const handleChange = (key: keyof CustomerProfile, value: string) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        referred_by: form.referred_by ?? null,
        primary_mobile: form.primary_mobile,
        alternative_mobile: form.alternative_mobile ?? null,
        name: form.name.trim(),
        recipient_name: form.recipient_name.trim(),
        payment_frequency: form.payment_frequency ?? "Daily",
        email: form.email ?? null,
        house_apartment_no: form.house_apartment_no ?? null,
        written_address: form.written_address.trim(),
        city: form.city.trim(),
        pin_code: form.pin_code,
        latitude: form.latitude ?? 0,
        longitude: form.longitude ?? 0,
        address_type: form.address_type ?? "Home",
        route_assignment: form.route_assignment ?? null,
        is_default: true,
      };

      const response = await http.put(
        `/update-customer/${profile.customer_id}`,
        payload as Record<string, unknown>,
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update account");
      }

      await fetchProfile();
      await fetchAddresses();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your account right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddressModalClose = () => {
    setAddressModalOpen(false);
    setAddressFormError(null);
    setAddressForm(createAddressForm());
    setAddressEditingId(null);
  };

  const openCreateAddressModal = () => {
    setAddressModalMode("create");
    setAddressEditingId(null);
    setAddressForm(
      createAddressForm({
        city: form?.city ?? "",
        city_code: form?.city ? resolveCityCode(form.city) : "",
        pin_code: form?.pin_code ?? "",
        latitude:
          profile?.latitude != null
            ? String(profile.latitude)
            : defaultAddress?.latitude != null
              ? String(defaultAddress.latitude)
              : "",
        longitude:
          profile?.longitude != null
            ? String(profile.longitude)
            : defaultAddress?.longitude != null
              ? String(defaultAddress.longitude)
              : "",
      }),
    );
    setAddressFormError(null);
    setAddressModalOpen(true);
  };

  const openEditAddressModal = (entry: AddressEntry) => {
    setAddressModalMode("edit");
    setAddressEditingId(entry.address_id);
    setAddressForm(
      createAddressForm({
        address_type: entry.address_type ?? "Home",
        house_apartment_no: entry.house_apartment_no ?? "",
        written_address: entry.written_address ?? "",
        city: entry.city ?? "",
        city_code: entry.city_code ?? "",
        pin_code: entry.pin_code ?? "",
        latitude:
          entry.latitude !== null && entry.latitude !== undefined ? String(entry.latitude) : "",
        longitude:
          entry.longitude !== null && entry.longitude !== undefined ? String(entry.longitude) : "",
        route_assignment: entry.route_assignment ?? "",
        is_default: entry.is_default,
      }),
    );
    setAddressFormError(null);
    setAddressModalOpen(true);
  };

  const handleAddressLocationSelect = useCallback((lat: number, lng: number) => {
    setAddressForm((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  }, []);

  const handleAddressSubmit = async () => {
    if (!customerId) return;
    setAddressSubmitting(true);
    setAddressFormError(null);

    try {
      const latitudeRaw = addressForm.latitude.trim();
      const longitudeRaw = addressForm.longitude.trim();
      let latitude: number | null = null;
      if (latitudeRaw.length > 0) {
        const parsedLatitude = Number(latitudeRaw);
        if (Number.isNaN(parsedLatitude)) {
          throw new Error("Latitude must be a valid number.");
        }
        latitude = parsedLatitude;
      }

      let longitude: number | null = null;
      if (longitudeRaw.length > 0) {
        const parsedLongitude = Number(longitudeRaw);
        if (Number.isNaN(parsedLongitude)) {
          throw new Error("Longitude must be a valid number.");
        }
        longitude = parsedLongitude;
      }

      const payload = {
        address_type: addressForm.address_type.trim() || "Home",
        house_apartment_no: addressForm.house_apartment_no.trim() || null,
        written_address: addressForm.written_address.trim(),
        city: addressForm.city.trim(),
        city_code: addressForm.city_code.trim() || resolveCityCode(addressForm.city),
        pin_code: addressForm.pin_code.trim(),
        latitude,
        longitude,
        route_assignment: addressForm.route_assignment.trim() || null,
        is_default: addressForm.is_default,
      };

      const path =
        addressModalMode === "create"
          ? `/api/customers/${customerId}/addresses`
          : `/api/customers/${customerId}/addresses/${addressEditingId}`;

      const response = await (addressModalMode === "create"
        ? http.post(path, payload as Record<string, unknown>)
        : http.put(path, payload as Record<string, unknown>));

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to save address.");
      }

      await Promise.all([fetchAddresses(), fetchProfile()]);
      handleAddressModalClose();
    } catch (err) {
      setAddressFormError(err instanceof Error ? err.message : "Unable to save address.");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    if (!customerId) return;
    try {
      const response = await http.post(
        `/api/customers/${customerId}/addresses/${addressId}/default`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to update default address.");
      }
      const updatedAddresses = await fetchAddresses();
      await fetchProfile();
      const newDefault =
        updatedAddresses?.find((address) => address.is_default) ??
        updatedAddresses?.find((address) => address.address_id === addressId);
      if (newDefault?.city_code && user?.city_code && newDefault.city_code !== user.city_code) {
        setCityChangeAlert({
          cityCode: newDefault.city_code,
          city: newDefault.city,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update default address.");
    }
  };

  const handlePrintBill = useCallback(() => {
    if (!billOrder || typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    const generatedAt = formatDate(new Date(), "PPP p");
    const orderDate = billOrder.created_at
      ? formatDate(new Date(billOrder.created_at), "PPP p")
      : "N/A";

    const itemsRows = billOrder.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.item_name}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(
              item.price,
            )}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(
              item.price * item.quantity,
            )}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${billOrder.order_id} • Kuteera Kitchen</title>
          <style>
            body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 32px; color: #2c1810; }
            h1 { margin-bottom: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .meta { margin-top: 24px; font-size: 14px; color: #5f4339; }
            .footer { margin-top: 40px; font-size: 12px; color: #8d6e63; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Kuteera Kitchen</h1>
          <p class="meta">Order #${billOrder.order_id} • ${orderDate}</p>
          <p class="meta">Generated: ${generatedAt}</p>
          <p class="meta">Deliver to: ${billOrder.address.label} – ${[
            billOrder.address.line,
            billOrder.address.city,
            billOrder.address.pin_code,
          ]
            .filter(Boolean)
            .join(", ")}</p>
          <table>
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Rate</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <h2 style="text-align:right;margin-top:16px;">Total: ${formatCurrency(
            billOrder.total_price,
          )}</h2>
          <div class="footer">
            Thank you for dining with Kuteera Kitchen. Warm meals, delivered with care.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [billOrder]);

  const editingDefaultAddress =
    addressModalMode === "edit" && defaultAddress?.address_id === addressEditingId;

  const modalCoordinates = useMemo(() => {
    const parseCoord = (value: string | null | undefined) => {
      if (!value) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric !== 0 ? numeric : null;
    };

    const parsedLat = parseCoord(addressForm.latitude);
    const parsedLng = parseCoord(addressForm.longitude);
    if (parsedLat !== null && parsedLng !== null) {
      return { lat: parsedLat, lng: parsedLng };
    }

    if (addressModalMode === "edit" && addressEditingId) {
      const target = addresses.find((address) => address.address_id === addressEditingId);
      if (target && target.latitude != null && target.longitude != null) {
        return { lat: Number(target.latitude), lng: Number(target.longitude) };
      }
    }

    const fallbackLat =
      profile?.latitude ??
      defaultAddress?.latitude ??
      (addresses.length ? (addresses[0].latitude ?? null) : null);
    const fallbackLng =
      profile?.longitude ??
      defaultAddress?.longitude ??
      (addresses.length ? (addresses[0].longitude ?? null) : null);

    if (fallbackLat != null && fallbackLng != null) {
      return { lat: Number(fallbackLat), lng: Number(fallbackLng) };
    }

    return { lat: 12.9716, lng: 77.5946 };
  }, [
    addressForm.latitude,
    addressForm.longitude,
    addressModalMode,
    addressEditingId,
    addresses,
    defaultAddress,
    profile,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#8d6e63]">
        Loading your account…
      </div>
    );
  }

  if (!form || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#c75b39]">
        {error ?? "No customer information available."}
      </div>
    );
  }

  const sectionTitle =
    activeSection === "profile"
      ? "Profile Info"
      : activeSection === "addresses"
        ? "Address Book"
        : activeSection === "orders"
          ? "Order History"
          : "Help Center";

  const sectionDescription =
    activeSection === "profile"
      ? "Update your personal details and contact info"
      : activeSection === "addresses"
        ? "Manage your default and saved delivery addresses."
        : activeSection === "orders"
          ? "Manage and track all your orders in one place."
          : "Reach support quickly for order or subscription issues.";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Settings</p>
          <h1
            className="mt-1 flex items-center gap-2 text-3xl font-bold text-[#8D4925]"
            style={{ fontFamily: "var(--font-v2-playfair)" }}
          >
            {sectionTitle}
            {isAdmin && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700"
                title="Admin"
                aria-label="Admin"
              >
                <Crown className="h-3 w-3" />
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{sectionDescription}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="w-full lg:w-72">
          <p className="mb-4 px-4 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
            Settings
          </p>
          <nav className="space-y-1 rounded-2xl border border-[#8D4925]/10 bg-white p-3">
            <button
              type="button"
              onClick={() => setActiveSection("profile")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                activeSection === "profile"
                  ? "bg-[#8D4925]/10 font-bold text-[#8D4925]"
                  : "font-medium text-gray-600 hover:bg-[#8D4925]/5"
              }`}
            >
              <User2 className="h-4 w-4" />
              Profile Info
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("addresses")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                activeSection === "addresses"
                  ? "bg-[#8D4925]/10 font-bold text-[#8D4925]"
                  : "font-medium text-gray-600 hover:bg-[#8D4925]/5"
              }`}
            >
              <MapPin className="h-4 w-4" />
              Address Book
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("orders")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                activeSection === "orders"
                  ? "bg-[#8D4925]/10 font-bold text-[#8D4925]"
                  : "font-medium text-gray-600 hover:bg-[#8D4925]/5"
              }`}
            >
              <FileText className="h-4 w-4" />
              Order History
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("help")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                activeSection === "help"
                  ? "bg-[#8D4925]/10 font-bold text-[#8D4925]"
                  : "font-medium text-gray-600 hover:bg-[#8D4925]/5"
              }`}
            >
              <Mail className="h-4 w-4" />
              Help Center
            </button>
          </nav>
        </aside>

        <section className="min-w-0 flex-1 space-y-8 lg:pt-9">
          {activeSection === "profile" ? (
            <div className="rounded-3xl border border-[#8D4925]/10 bg-white p-6 md:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={!isEditing}
                    className={readOnlyFieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={!isEditing}
                    className={readOnlyFieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={form.primary_mobile}
                    disabled
                    className={readOnlyFieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="altPhone"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Alternate Mobile
                  </Label>
                  <Input
                    id="altPhone"
                    value={form.alternative_mobile ?? ""}
                    onChange={(e) => handleChange("alternative_mobile", e.target.value)}
                    disabled={!isEditing}
                    className={readOnlyFieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="recipient"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Recipient Name
                  </Label>
                  <Input
                    id="recipient"
                    value={form.recipient_name}
                    onChange={(e) => handleChange("recipient_name", e.target.value)}
                    disabled={!isEditing}
                    className={readOnlyFieldClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                    Payment Frequency
                  </Label>
                  <Select
                    value={form.payment_frequency ?? "Daily"}
                    onValueChange={(value) => handleChange("payment_frequency", value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className={readOnlySelectClasses}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setForm(profile);
                        setIsEditing(false);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {activeSection === "addresses" ? (
            <div className="rounded-3xl border border-[#8D4925]/10 bg-white p-6 md:p-8">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-[#463028]">
                      Default Address
                    </CardTitle>
                    {defaultAddress ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditAddressModal(defaultAddress)}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border border-brand-subtle bg-white p-4 text-sm">
                      <p className="font-semibold text-[#463028]">
                        {profile.address_type ?? "Home"}
                      </p>
                      <p className="mt-1 text-[#8d6e63]">
                        {[
                          profile.house_apartment_no,
                          profile.written_address,
                          profile.city,
                          profile.pin_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    {mapEmbedUrl ? (
                      <div className="overflow-hidden rounded-lg border border-brand-subtle">
                        <iframe
                          title="Default delivery location"
                          src={mapEmbedUrl}
                          width="100%"
                          height="200"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full"
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-[#463028]">
                      Address Book
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={openCreateAddressModal}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add New
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {otherAddresses.length === 0 ? (
                      <p className="text-sm text-[#8d6e63]">No additional saved addresses.</p>
                    ) : (
                      otherAddresses.slice(0, 3).map((address) => (
                        <div
                          key={address.address_id}
                          className="rounded-lg border border-brand-subtle bg-white p-3 text-xs"
                        >
                          <p className="font-semibold text-[#463028]">{address.address_type}</p>
                          <p className="mt-1 text-[#8d6e63]">
                            {[
                              address.house_apartment_no,
                              address.written_address,
                              address.city,
                              address.pin_code,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditAddressModal(address)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetDefaultAddress(address.address_id)}
                            >
                              Make Default
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {activeSection === "orders" ? (
            <div className="rounded-3xl border border-[#8D4925]/10 bg-white p-6 md:p-8">
              <div className="mb-3">
                <div />
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order id or item..."
                />
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOrderSearch("");
                    setOrderStatusFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              </div>

              {ordersLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[#8d6e63]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading order history…
                </div>
              ) : ordersError ? (
                <p className="py-6 text-sm text-[#c75b39]">{ordersError}</p>
              ) : filteredOrders.length === 0 ? (
                <p className="py-6 text-sm text-[#8d6e63]">No orders match the current filters.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#FAF7F0]">
                      <tr>
                        <th className="px-4 py-3 font-bold text-gray-500">Order ID</th>
                        <th className="px-4 py-3 font-bold text-gray-500">Date</th>
                        <th className="px-4 py-3 font-bold text-gray-500">Status</th>
                        <th className="px-4 py-3 font-bold text-gray-500">Type</th>
                        <th className="px-4 py-3 font-bold text-gray-500">Items</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-500">Total</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.map((order) => {
                        const statusKey = normalizeOrderStatusKey(order.status);
                        const badgeClass =
                          statusKey === "delivered"
                            ? "bg-emerald-100 text-emerald-700"
                            : statusKey === "dispatched"
                              ? "bg-indigo-100 text-indigo-700"
                              : statusKey === "confirmed"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-gray-100 text-gray-700";

                        return (
                          <tr key={order.order_id} className="hover:bg-[#FAF7F0]/70">
                            <td className="px-4 py-4 font-semibold text-[#463028]">
                              #{order.order_id}
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                              {order.created_at
                                ? formatDate(new Date(order.created_at), "PPP")
                                : "Scheduled"}
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={`${badgeClass} border-0`}>
                                {orderStatusLabel(order.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                              {order.order_type ?? "one_time"}
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                              {order.items
                                .slice(0, 2)
                                .map((item) => item.item_name)
                                .join(", ")}
                              {order.items.length > 2 ? "..." : ""}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-[#8D4925]">
                              {formatCurrency(order.total_price)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Button size="sm" onClick={() => setBillOrderId(order.order_id)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Bill
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "help" ? (
            <div className="rounded-3xl border border-[#8D4925]/10 bg-white p-6 md:p-8">
              <div className="grid gap-3 md:grid-cols-2">
                <a
                  href="#"
                  className="rounded-2xl border border-[#8D4925]/10 bg-white p-4 text-sm font-medium text-gray-700 transition-colors hover:bg-[#FAF7F0]"
                >
                  Chat on WhatsApp
                </a>
                <a
                  href="#"
                  className="rounded-2xl border border-[#8D4925]/10 bg-white p-4 text-sm font-medium text-gray-700 transition-colors hover:bg-[#FAF7F0]"
                >
                  Email Support
                </a>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <Dialog
        open={addressModalOpen}
        onOpenChange={(open) => (open ? null : handleAddressModalClose())}
      >
        <DialogContent className="w-full max-w-4xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {addressModalMode === "create" ? "Add new address" : "Edit address"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address_type">Label</Label>
                <Input
                  id="address_type"
                  value={addressForm.address_type}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, address_type: e.target.value }))
                  }
                  placeholder="Home, Office…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_house">House / apartment</Label>
                <Input
                  id="address_house"
                  value={addressForm.house_apartment_no}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, house_apartment_no: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line">Address</Label>
              <Textarea
                id="address_line"
                value={addressForm.written_address}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, written_address: e.target.value }))
                }
                className="min-h-[120px] w-full resize-none border border-input/60 bg-secondary/40 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address_city">City</Label>
                <Select
                  value={addressForm.city}
                  onValueChange={(value) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      city: value,
                      city_code: resolveCityCode(value),
                    }))
                  }
                >
                  <SelectTrigger id="address_city">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_pin">PIN code</Label>
                <Input
                  id="address_pin"
                  value={addressForm.pin_code}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, pin_code: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Map location</Label>
              <GoogleMapPicker
                key={`${addressModalMode}-${addressEditingId ?? "new"}-${addressModalOpen}`}
                lat={modalCoordinates.lat}
                lng={modalCoordinates.lng}
                onLocationSelect={handleAddressLocationSelect}
              />
              <p className="text-xs text-[#8d6e63]">
                {addressForm.latitude && addressForm.longitude
                  ? `Selected: ${Number(addressForm.latitude).toFixed(5)}, ${Number(addressForm.longitude).toFixed(5)}`
                  : "Drag the pin or search to choose an exact delivery point."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_route">Route assignment</Label>
              <Input
                id="address_route"
                value={addressForm.route_assignment}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, route_assignment: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/10 p-3">
              <div>
                <p className="text-sm font-medium text-[#463028]">Set as default address</p>
                <p className="text-xs text-[#8d6e63]">
                  We&apos;ll use this address for future deliveries automatically.
                </p>
              </div>
              <Switch
                checked={addressForm.is_default}
                onCheckedChange={(checked) =>
                  setAddressForm((prev) => ({ ...prev, is_default: checked }))
                }
                disabled={editingDefaultAddress}
                aria-readonly={editingDefaultAddress}
              />
            </div>
            {addressFormError && <p className="text-sm text-destructive">{addressFormError}</p>}
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={handleAddressModalClose}
              disabled={addressSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddressSubmit} disabled={addressSubmitting}>
              {addressSubmitting ? "Saving…" : "Save address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={billOrderId !== null}
        onOpenChange={(open) => (!open ? setBillOrderId(null) : null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order bill</DialogTitle>
          </DialogHeader>
          {billOrder ? (
            <div className="space-y-4 text-sm text-[#463028]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8d6e63]">
                <span>Order #{billOrder.order_id}</span>
                <span>
                  {billOrder.created_at
                    ? formatDate(new Date(billOrder.created_at), "PPP p")
                    : "Scheduled"}
                </span>
              </div>
              <div className="rounded-lg border border-brand-subtle bg-white p-3 text-xs text-[#8d6e63]">
                <p className="font-medium text-[#463028]">Deliver to {billOrder.address.label}</p>
                <p>
                  {[billOrder.address.line, billOrder.address.city, billOrder.address.pin_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="space-y-2">
                {billOrder.items.map((item) => (
                  <div
                    key={`${billOrder.order_id}-${item.item_name}`}
                    className="flex justify-between text-xs"
                  >
                    <span>
                      {item.item_name} × {item.quantity}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <p className="text-right font-semibold">
                Total: {formatCurrency(billOrder.total_price)}
              </p>
              <DialogFooter className="mt-2 flex gap-2">
                <Button variant="outline" onClick={() => setBillOrderId(null)}>
                  Close
                </Button>
                <Button onClick={handlePrintBill}>
                  <FileText className="mr-2 h-4 w-4" />
                  Print bill
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="text-sm text-[#8d6e63]">Unable to load this order.</p>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(cityChangeAlert)}
        onOpenChange={(open) => {
          if (!open) {
            setCityChangeAlert(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Default address updated</AlertDialogTitle>
            <AlertDialogDescription>
              {cityChangeAlert
                ? `You've set your default address in ${
                    cityChangeAlert.city ||
                    CITY_LABELS[cityChangeAlert.cityCode] ||
                    cityChangeAlert.cityCode
                  }. You'll continue seeing menus for ${currentCityLabel} until you log out and sign back in.`
                : "You'll continue seeing the current city's menu until you log out and sign in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCityChangeAlert(null)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
