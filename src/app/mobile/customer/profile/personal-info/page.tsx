"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type CustomerProfile = {
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
};

export default function MobileCustomerPersonalInfoPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState<CustomerProfile | null>(null);
  const [initialForm, setInitialForm] = useState<CustomerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleBack = () => {
    const canGoBack =
      typeof window !== "undefined" &&
      (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0 ||
        window.history.length > 1);
    if (canGoBack) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  useHydrateAuthUser();

  useEffect(() => {
    if (!user?.customer_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get(`/get-customer/${user.customer_id}`);
        if (!response.ok) throw new Error("Unable to load profile");
        const data = (await response.json()) as CustomerProfile;
        if (!cancelled) {
          setForm(data);
          setInitialForm(data);
        }
      } catch {
        if (!cancelled) setError("Unable to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.customer_id]);

  const update = (key: keyof CustomerProfile, value: string) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  const onSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
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

      const response = await http.put(`/update-customer/${form.customer_id}`, payload);
      if (!response.ok) throw new Error("Unable to save");
      setMessage("Saved successfully.");
      setInitialForm(form);
      setIsEditing(false);
    } catch {
      setError("Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onCancelEdit = () => {
    if (initialForm) setForm(initialForm);
    setIsEditing(false);
    setError(null);
    setMessage(null);
  };

  const phoneDisplay = (value?: string | null) =>
    value ? `+91 ${value.replace(/\D/g, "").slice(-10)}` : "";

  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-28`}
      style={{ backgroundColor: mobilePalette.background }}
    >
      <div className="mx-auto w-full max-w-[448px] px-4">
        <header className="sticky top-0 z-20 bg-[rgba(253,250,241,0.95)] py-4 backdrop-blur-md">
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-full"
            >
              <ArrowLeft size={20} color="#8D4925" />
            </button>
            <h1
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
            >
              Personal Info
            </h1>
            <span className="h-9 w-9" />
          </div>
        </header>

        {loading ? (
          <p className="rounded-xl bg-white p-4 text-sm text-[#64748b]">Loading profile...</p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>
        ) : null}

        {form ? (
          <section className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="h-10 rounded-lg border border-[#8D4925]/20 px-4 text-xs font-bold text-[#8D4925]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="h-10 rounded-lg bg-[#8D4925] px-4 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="h-10 rounded-lg border border-[#8D4925]/20 px-4 text-xs font-bold text-[#8D4925]"
                >
                  Edit
                </button>
              )}
            </div>

            <Field
              label="Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={!isEditing}
            />
            <Field
              label="Receiver Name"
              value={form.recipient_name}
              onChange={(e) => update("recipient_name", e.target.value)}
              disabled={!isEditing}
            />
            <Field label="Primary Mobile" value={phoneDisplay(form.primary_mobile)} disabled />
            <Field
              label="Alternative Mobile"
              value={phoneDisplay(form.alternative_mobile)}
              disabled
            />
            <Field
              label="Email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value)}
              disabled={!isEditing}
            />
            <Field
              label="Referred By"
              value={form.referred_by ?? ""}
              onChange={(e) => update("referred_by", e.target.value)}
              disabled={!isEditing}
            />
          </section>
        ) : null}
      </div>

      <MobileCustomerBottomNav active="profile" />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block rounded-xl border border-[#8D4925]/10 bg-white p-3">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8D4925]/70">
        {label}
      </span>
      <input
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={disabled}
        className="h-8 w-full border-0 bg-transparent text-sm text-[#1e293b] outline-none disabled:cursor-not-allowed disabled:text-[#64748b]"
      />
    </label>
  );
}
