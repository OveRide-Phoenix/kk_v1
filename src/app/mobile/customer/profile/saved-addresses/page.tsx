"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type AddressEntry = {
  address_id: number;
  address_type: string;
  house_apartment_no: string | null;
  written_address: string;
  city: string;
  city_code: string;
  pin_code: string;
  is_default: boolean;
};

export default function MobileCustomerSavedAddressesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [loading, setLoading] = useState(false);
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

  const fetchAddresses = async (customerId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get(`/api/customers/${customerId}/addresses`);
      if (!response.ok) throw new Error("Unable to load addresses");
      setAddresses((await response.json()) as AddressEntry[]);
    } catch {
      setError("Unable to load addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.customer_id) return;
    fetchAddresses(user.customer_id);
  }, [user?.customer_id]);

  const setDefault = async (addressId: number) => {
    if (!user?.customer_id) return;
    try {
      const response = await http.post(
        `/api/customers/${user.customer_id}/addresses/${addressId}/default`,
        {},
      );
      if (!response.ok) throw new Error();
      fetchAddresses(user.customer_id);
    } catch {
      setError("Unable to update default address.");
    }
  };

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
              Saved Addresses
            </h1>
            <span className="h-9 w-9" />
          </div>
        </header>

        {loading ? (
          <p className="rounded-xl bg-white p-4 text-sm text-[#64748b]">Loading addresses...</p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : null}

        <section className="space-y-3">
          {addresses.length === 0 && !loading ? (
            <p className="rounded-xl bg-white p-4 text-sm text-[#64748b]">
              No saved addresses yet.
            </p>
          ) : null}
          {addresses.map((address) => (
            <article
              key={address.address_id}
              className="rounded-xl border border-[#8D4925]/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#8D4925]">
                    {address.address_type}
                    {address.is_default ? " (Default)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-[#475569]">
                    {[
                      address.house_apartment_no,
                      address.written_address,
                      address.city,
                      address.pin_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <MapPin size={18} color="#8D4925" />
              </div>
              {!address.is_default ? (
                <button
                  onClick={() => setDefault(address.address_id)}
                  className="mt-3 rounded-lg border border-[#8D4925]/20 px-3 py-2 text-xs font-bold text-[#8D4925]"
                >
                  Make Default
                </button>
              ) : null}
            </article>
          ))}
        </section>
      </div>

      <MobileCustomerBottomNav active="profile" />
    </main>
  );
}
