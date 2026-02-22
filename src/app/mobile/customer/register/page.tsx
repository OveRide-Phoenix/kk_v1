"use client";

import { ArrowLeft, CircleUserRound, Mail, MapPin, Phone } from "lucide-react";
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";

const CITY_OPTIONS = [
  { label: "Mysore", code: "MYS" },
  { label: "Bangalore", code: "BLR" },
] as const;

const PAYMENT_FREQUENCIES = ["Daily", "Weekly", "Monthly"] as const;

const resolveCityCode = (value: string) => {
  const match = CITY_OPTIONS.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
  return match ? match.code : "MYS";
};

export default function MobileCustomerRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const handleBack = () => {
    const idx = typeof window !== "undefined" ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof idx === "number" && idx > 0) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  const [form, setForm] = useState({
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
    addressType: "Home",
    isDefault: true,
  });
  const [otherAddressName, setOtherAddressName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onLocationSelect = (lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const mapView = useMemo(() => <GoogleMapPicker onLocationSelect={onLocationSelect} />, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "primaryMobile" || name === "alternativeMobile") {
      const digitsOnly = value.replace(/\D/g, "");
      const withoutCountryCode = digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
      const cleaned = withoutCountryCode.slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    if (name === "pinCode") {
      setForm((prev) => ({ ...prev, pinCode: value.replace(/\D/g, "").slice(0, 6) }));
      return;
    }

    if (name === "email") {
      setForm((prev) => ({ ...prev, email: value.toLowerCase() }));
      return;
    }

    if (name === "city") {
      setForm((prev) => ({ ...prev, city: value, cityCode: resolveCityCode(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (form.primaryMobile.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Primary mobile must be exactly 10 digits.",
      });
      return;
    }

    if (form.alternativeMobile && form.alternativeMobile.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid alternative mobile",
        description: "Alternative mobile must be exactly 10 digits.",
      });
      return;
    }

    if (form.pinCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid pin code",
        description: "Pin code must be exactly 6 digits.",
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      referred_by: form.referredBy.trim() || null,
      primary_mobile: form.primaryMobile,
      alternative_mobile: form.alternativeMobile || null,
      name: form.name,
      recipient_name: form.recipientName,
      payment_frequency: form.paymentFrequency || "Daily",
      email: form.email || null,
      house_apartment_no: form.houseApartmentNo || null,
      written_address: form.writtenAddress,
      city: form.city,
      city_code: form.cityCode || resolveCityCode(form.city),
      pin_code: form.pinCode,
      latitude: form.latitude ?? 0,
      longitude: form.longitude ?? 0,
      address_type: form.addressType === "Other" ? otherAddressName || "Other" : form.addressType,
      route_assignment: null,
      is_default: form.isDefault,
    };

    try {
      const response = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = (data as { detail?: string }).detail;
        const message = detail && detail.includes("Duplicate entry")
          ? "This phone number is already registered."
          : detail || "Registration failed. Please try again.";

        toast({
          variant: "destructive",
          title: "Registration failed",
          description: message,
        });
        return;
      }

      toast({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
        duration: 1800,
      });
      setTimeout(() => {
        router.push("/mobile/customer/login/phone");
      }, 1200);
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Could not reach server. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-dvh w-full overflow-x-hidden`}
      style={{ backgroundColor: mobilePalette.background, fontFamily: "var(--font-mobile-work-sans), sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[448px] pb-8">
        <header className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full"
            aria-label="Back"
          >
            <ArrowLeft color="#0F172A" size={20} />
          </button>
          <h1 className="text-center text-lg font-bold text-[#0F172A]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Create Your Account</h1>
        </header>

        <section className="px-6 pb-4 pt-6">
          <h2 className="text-[32px] font-bold tracking-[-0.8px] text-[#8D4A25]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Join Kuteera Kitchen</h2>
          <p className="mt-2 text-base leading-6 text-[#475569]">Sign up to start your healthy food subscription journey.</p>
        </section>

        <form className="flex flex-col gap-5 px-6 pb-8 pt-2" onSubmit={onSubmit}>
          <InputField icon={<CircleUserRound size={18} color="#8D4A25" />} label="Customer Name *" name="name" value={form.name} placeholder="John Doe" onChange={handleChange} required />
          <InputField
            icon={<Phone size={18} color="#8D4A25" />}
            label="Referred By"
            name="referredBy"
            value={form.referredBy}
            placeholder="Name"
            onChange={handleChange}
          />

          <InputField
            icon={<Phone size={18} color="#8D4A25" />}
            label="Primary Mobile *"
            name="primaryMobile"
            type="tel"
            value={form.primaryMobile ? `+91 ${form.primaryMobile}` : ""}
            placeholder="+91"
            onChange={handleChange}
            required
          />
          <InputField
            icon={<Phone size={18} color="#8D4A25" />}
            label="Alternative Mobile"
            name="alternativeMobile"
            type="tel"
            value={form.alternativeMobile ? `+91 ${form.alternativeMobile}` : ""}
            placeholder="+91"
            onChange={handleChange}
          />

          <InputField icon={<CircleUserRound size={18} color="#8D4A25" />} label="Receiver Name *" name="recipientName" value={form.recipientName} placeholder="Food receiver" onChange={handleChange} required />

          <SelectField label="Payment Frequency" name="paymentFrequency" value={form.paymentFrequency} onChange={handleChange} options={PAYMENT_FREQUENCIES.map((f) => ({ value: f, label: f }))} />

          <SelectField
            label="Address Type"
            name="addressType"
            value={form.addressType}
            onChange={handleChange}
            options={[
              { value: "Home", label: "Home" },
              { value: "Work", label: "Work" },
              { value: "Other", label: "Other" },
            ]}
          />

          {form.addressType === "Other" ? (
            <InputField label="Other Address Name" name="otherAddressName" value={otherAddressName} placeholder="Gym / Parents Home / etc" onChange={(e) => setOtherAddressName(e.target.value)} />
          ) : null}

          <InputField icon={<MapPin size={18} color="#8D4A25" />} label="House/Apartment *" name="houseApartmentNo" value={form.houseApartmentNo} placeholder="Flat/House number" onChange={handleChange} required />

          <TextAreaField label="Written Address *" name="writtenAddress" value={form.writtenAddress} placeholder="Street, locality, landmark" onChange={handleChange} required />

          <SelectField
            label="City *"
            name="city"
            value={form.city}
            onChange={handleChange}
            options={CITY_OPTIONS.map((c) => ({ value: c.label, label: c.label }))}
            required
          />

          <InputField label="Pin Code *" name="pinCode" type="tel" value={form.pinCode} placeholder="6 digits" onChange={handleChange} required />

          <InputField icon={<Mail size={18} color="#8D4A25" />} label="Email" name="email" type="email" value={form.email} placeholder="example@mail.com" onChange={handleChange} />

          <div className="space-y-2">
            <span className="block pl-1 text-sm font-semibold text-[#1E293B]">Google Maps Location</span>
            {mapView}
            {form.latitude !== null && form.longitude !== null ? (
              <p className="text-xs text-[#64748B]">Selected: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}</p>
            ) : null}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-[#8D4A25]/20 bg-white px-4 py-3 text-sm text-[#1E293B]">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              className="h-4 w-4 accent-[#8D4A25]"
            />
            Set as default address
          </label>

          <p className="px-4 text-center text-[13px] leading-[21px] text-[#64748B]">
            By creating an account, you agree to our <span className="font-medium text-[#8D4A25] underline">Terms of Service</span> and <span className="font-medium text-[#8D4A25] underline">Privacy Policy</span>.
          </p>

          <button type="submit" className="h-14 w-full rounded-2xl bg-[#8D4A25] text-lg font-bold text-white shadow-[0px_10px_15px_-3px_rgba(141,74,37,0.2),0px_4px_6px_-4px_rgba(141,74,37,0.2)] disabled:opacity-60" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

          <p className="pb-4 pt-1 text-center text-sm text-[#475569]">
            Already have an account? <Link href="/mobile/customer/login/phone" className="font-bold text-[#8D4A25]">Login</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

type InputFieldProps = {
  icon?: ReactNode;
  label: string;
  name: string;
  placeholder: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

function InputField({ icon, label, name, placeholder, value, onChange, type = "text", required = false }: InputFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block pl-1 text-sm font-semibold text-[#1E293B]">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="h-14 w-full rounded-2xl border border-[#8D4A25] bg-transparent px-4 pr-11 text-base text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
        />
        {icon ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">{icon}</span> : null}
      </div>
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, required = false }: { label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block pl-1 text-sm font-semibold text-[#1E293B]">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="h-14 w-full rounded-2xl border border-[#8D4A25] bg-transparent px-4 text-base text-[#0F172A] outline-none"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({ label, name, value, placeholder, onChange, required = false }: { label: string; name: string; value: string; placeholder: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block pl-1 text-sm font-semibold text-[#1E293B]">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="min-h-[96px] w-full rounded-2xl border border-[#8D4A25] bg-transparent px-4 py-3 text-base text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
      />
    </label>
  );
}
