"use client";

import { useCallback, useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";

import CustomerV2AuthShell from "@/components/customer-v2/auth-shell";
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker";
import { http } from "@/lib/http";

const CITY_OPTIONS = [
  { label: "Mysore", code: "MYS" },
  { label: "Bangalore", code: "BLR" },
];

const resolveCityCode = (value: string) => {
  const match = CITY_OPTIONS.find(
    (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ? match.code : "MYS";
};

export default function CustomerV2RegistrationPage() {
  const [formData, setFormData] = useState({
    referredBy: "",
    primaryMobile: "",
    alternativeMobile: "",
    name: "",
    recipientName: "",
    paymentFrequency: "Daily",
    email: "",
    houseApartmentNo: "",
    writtenAddress: "",
    city: "",
    cityCode: "",
    pinCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    addressType: "",
    routeAssignment: "",
    isDefault: true,
  });

  const router = useRouter();
  const [addressType, setAddressType] = useState("");
  const [otherAddressName, setOtherAddressName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      setFormData((prev) => {
        if (name === "latitude" || name === "longitude") return { ...prev, [name]: value };

        if (name === "primaryMobile" || name === "alternativeMobile") {
          let newValue = value.startsWith("+91 ") ? value.slice(4) : value;
          if (newValue.startsWith("+91")) newValue = newValue.slice(3);
          newValue = newValue.replace(/\D/g, "").slice(0, 10);
          return { ...prev, [name]: newValue };
        }

        if (name === "pinCode") return { ...prev, [name]: value.replace(/\D/g, "").slice(0, 6) };
        if (name === "email") return { ...prev, [name]: value.toLowerCase() };

        return { ...prev, [name]: value };
      });
    },
    [],
  );

  const handleAddressTypeChange = (value: string) => {
    setAddressType(value);
    setFormData((prev) => ({ ...prev, addressType: value }));
    if (value !== "Other") setOtherAddressName("");
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "city") {
      setFormData((prev) => ({ ...prev, city: value, cityCode: resolveCityCode(value) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");

    const formattedData = {
      referred_by: formData.referredBy || null,
      primary_mobile: formData.primaryMobile,
      alternative_mobile: formData.alternativeMobile || null,
      name: formData.name,
      recipient_name: formData.recipientName,
      payment_frequency: formData.paymentFrequency || "Daily",
      email: formData.email || null,
      house_apartment_no: formData.houseApartmentNo || null,
      written_address: formData.writtenAddress,
      city: formData.city,
      city_code: formData.cityCode || resolveCityCode(formData.city),
      pin_code: formData.pinCode,
      latitude: formData.latitude !== null ? parseFloat(String(formData.latitude)) : 0,
      longitude: formData.longitude !== null ? parseFloat(String(formData.longitude)) : 0,
      address_type: formData.addressType || "Home",
      route_assignment: formData.routeAssignment || null,
      is_default: formData.isDefault ?? true,
    };

    try {
      const response = await http.post("/api/register", formattedData as Record<string, unknown>);
      const data = await response.json();
      setIsSubmitting(false);

      if (response.ok) {
        setIsRegistered(true);
        return;
      }

      if (data.detail && data.detail.includes("Duplicate entry")) {
        setErrorMessage("This phone number is already registered. Please use a different number.");
        return;
      }
      setErrorMessage(data.detail || "Something went wrong. Please try again.");
    } catch {
      setIsSubmitting(false);
      setErrorMessage("Failed to send request. Please check your connection and try again.");
    }
  };

  const memoizedGoogleMap = useMemo(
    () => <GoogleMapPicker onLocationSelect={handleLocationSelect} />,
    [],
  );

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-[#8D4925]";
  const labelClass = "block text-sm font-semibold text-gray-700";

  return (
    <CustomerV2AuthShell
      links={[
        { href: "/customer-v2/login", label: "Login" },
        { href: "/customer-v2/register", label: "Register", active: true },
      ]}
    >
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="mb-10">
          <h1
            className="mb-2 text-4xl font-bold text-[#3D3028]"
            style={{ fontFamily: "var(--font-v2-playfair)" }}
          >
            Customer Registration
          </h1>
          <p className="text-gray-600">
            Join our community for healthy, home-cooked South Indian meals delivered to your
            doorstep.
          </p>
        </div>

        <div className="rounded-2xl border border-[#8D4925]/10 bg-white p-8 shadow-sm md:p-10">
          <form className="space-y-10" onSubmit={handleSubmit}>
            <fieldset disabled={isRegistered} className="space-y-10 disabled:opacity-80">
              <section>
                <h2 className="mb-6 text-xl font-bold text-[#3D3028]">Personal Information</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="name">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputClass}
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="referredBy">
                      Referred By (Optional)
                    </label>
                    <input
                      className={inputClass}
                      id="referredBy"
                      name="referredBy"
                      value={formData.referredBy}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="primaryMobile">
                      Primary Mobile <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 px-4 font-medium text-gray-500">
                        +91
                      </span>
                      <input
                        className={`${inputClass} rounded-l-none`}
                        id="primaryMobile"
                        name="primaryMobile"
                        type="tel"
                        value={formData.primaryMobile}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="alternativeMobile">
                      Alternative Mobile (Optional)
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 px-4 font-medium text-gray-500">
                        +91
                      </span>
                      <input
                        className={`${inputClass} rounded-l-none`}
                        id="alternativeMobile"
                        name="alternativeMobile"
                        type="tel"
                        value={formData.alternativeMobile}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-100 pt-8">
                <h2 className="mb-6 text-xl font-bold text-[#3D3028]">Delivery Information</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="recipientName">
                      Deliver To / Food Receiver Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputClass}
                      id="recipientName"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="addressType">
                      Address Type
                    </label>
                    <select
                      className={inputClass}
                      id="addressType"
                      value={addressType}
                      onChange={(e) => handleAddressTypeChange(e.target.value)}
                    >
                      <option value="">Select address type</option>
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                    {addressType === "Other" ? (
                      <div className="space-y-2">
                        <label className={labelClass} htmlFor="otherAddressName">
                          Other Address Name
                        </label>
                        <input
                          className={inputClass}
                          id="otherAddressName"
                          value={otherAddressName}
                          onChange={(e) => setOtherAddressName(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-100 pt-8">
                <h2 className="mb-6 text-xl font-bold text-[#3D3028]">Address Details</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="houseApartmentNo">
                      House / Apartment Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputClass}
                      id="houseApartmentNo"
                      name="houseApartmentNo"
                      value={formData.houseApartmentNo}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass} htmlFor="writtenAddress">
                      Full Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className={`${inputClass} min-h-[100px]`}
                      id="writtenAddress"
                      name="writtenAddress"
                      value={formData.writtenAddress}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className={labelClass} htmlFor="city">
                        City <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={inputClass}
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleSelectChange("city", e.target.value)}
                      >
                        <option value="">Select city</option>
                        {CITY_OPTIONS.map((option) => (
                          <option key={option.code} value={option.label}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className={labelClass} htmlFor="pinCode">
                        Pin Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputClass}
                        id="pinCode"
                        name="pinCode"
                        value={formData.pinCode}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={labelClass}>Pin Google Maps Location</label>
                    {memoizedGoogleMap}
                    {formData.latitude && formData.longitude ? (
                      <p className="text-sm text-gray-500">
                        Selected Location: {formData.latitude}, {formData.longitude}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-100 pt-8">
                <h2 className="mb-6 text-xl font-bold text-[#3D3028]">Email Information</h2>
                <div className="space-y-2">
                  <label className={labelClass} htmlFor="email">
                    Email Address (Optional)
                  </label>
                  <input
                    className={inputClass}
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-gray-500">
                    Payment receipts and subscription updates will be sent to this email address if
                    provided.
                  </p>
                </div>
              </section>
            </fieldset>

            <div className="border-t border-gray-100 pt-8">
              {!isRegistered ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#8D4925] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#7a3f20] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    {isSubmitting ? "Registering..." : "Register Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/customer-v2/login")}
                    className="w-full rounded-xl border-2 border-gray-200 px-8 py-3.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => router.push("/customer-v2/login")}
                    className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    Go to Login
                  </button>
                  <p className="text-sm font-semibold text-green-700">
                    User registered successfully!
                  </p>
                </div>
              )}
              {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
            </div>
          </form>
        </div>
      </main>
    </CustomerV2AuthShell>
  );
}
