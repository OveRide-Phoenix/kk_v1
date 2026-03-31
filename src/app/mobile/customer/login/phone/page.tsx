"use client";

import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { getCityLabel, normalizeCityCode, type CityCode } from "@/config/cities";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/store";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";

export default function MobileCustomerLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setUser = useAuthStore((state) => state.setUser);
  const setRoleState = useAuthStore((state) => state.setRoleState);
  const setAdminCity = useAuthStore((state) => state.setAdminCity);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityOptions, setCityOptions] = useState<CityCode[]>([]);
  const [adminPassword, setAdminPassword] = useState("");
  const [canLoginAsAdmin, setCanLoginAsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempt, setLoginAttempt] = useState<"customer" | "admin" | null>(null);
  const [showRegisterHighlight, setShowRegisterHighlight] = useState(false);

  const handlePhoneChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const digitsOnly = value.replace(/\D/g, "");

    let formattedValue = "";
    if (digitsOnly.length > 0) {
      const cleanNumber = digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
      formattedValue = `+91 ${cleanNumber.slice(0, 10)}`;
    }
    setPhoneNumber(formattedValue);

    const numericValue = formattedValue.replace(/\D/g, "").slice(2);

    if (numericValue.length !== 10) {
      setCity("");
      setCityCode("");
      setCityOptions([]);
      setCanLoginAsAdmin(false);
      setAdminPassword("");
      setShowRegisterHighlight(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/backend/api/get-city?phone=${numericValue}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        setCity("");
        setCityCode("");
        setCityOptions([]);
        setCanLoginAsAdmin(false);
        setAdminPassword("");
        setShowRegisterHighlight(true);
        toast({
          variant: "destructive",
          title: "User not found",
          description: data.detail || "User does not exist. Please register.",
        });
        return;
      }

      const normalizedDefault = normalizeCityCode(data.city_code);
      const eligible =
        Array.isArray(data.eligible_city_codes) && data.eligible_city_codes.length
          ? data.eligible_city_codes
          : [normalizedDefault];

      const normalizedEligible = Array.from(
        new Set(
          eligible
            .filter(
              (code: unknown): code is string => typeof code === "string" && code.trim().length > 0,
            )
            .map((code: string) => normalizeCityCode(code)),
        ),
      );

      const preferredCity = normalizedEligible.includes(normalizedDefault)
        ? normalizedDefault
        : (normalizedEligible[0] ?? normalizedDefault);

      setCityOptions(normalizedEligible);
      setCityCode(preferredCity);
      setCity(getCityLabel(preferredCity));
      const adminEnabled = Array.isArray(data.role_codes)
        ? data.role_codes.includes("admin")
        : Boolean(data.is_admin);
      setCanLoginAsAdmin(adminEnabled);
      if (!adminEnabled) {
        setAdminPassword("");
      }
      setShowRegisterHighlight(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Unable to reach the server. Please ensure backend is running.",
      });
      setCity("");
      setCityCode("");
      setCityOptions([]);
      setCanLoginAsAdmin(false);
      setAdminPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cityCode) {
      setCity(getCityLabel(cityCode));
    }
  }, [cityCode]);

  const handleLogin = async (mode: "customer" | "admin") => {
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length !== 12) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number.",
      });
      return;
    }

    const isAdminAttempt = mode === "admin";

    if (!isAdminAttempt && !cityCode.trim()) {
      toast({
        variant: "destructive",
        title: "City required",
        description: "Please select a city to continue.",
      });
      return;
    }

    if (isAdminAttempt) {
      if (!canLoginAsAdmin) {
        toast({
          variant: "destructive",
          title: "Admin access denied",
          description: "This number is not enabled for admin login.",
        });
        return;
      }
      if (!adminPassword.trim()) {
        toast({
          variant: "destructive",
          title: "Password required",
          description: "Please enter admin password.",
        });
        return;
      }
    }

    setIsLoading(true);
    setLoginAttempt(mode);
    try {
      const formattedPhone = digitsOnly.replace(/^91/, "");
      const payload = {
        phone: formattedPhone,
        admin_password: isAdminAttempt ? adminPassword : null,
        city_code: cityCode || undefined,
      };

      const response = await fetch("/api/backend/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: data.detail || data.msg || "Login failed. Try again.",
        });
        return;
      }

      if (data.access_token) localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("remember_me", JSON.stringify(rememberMe));

      let user = null;
      if (data.access_token) {
        const meRes = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meRes.ok) {
          user = await meRes.json();
        }
      }

      const resolvedUser = user ?? data.user ?? null;
      const baseUser = (resolvedUser ?? data.user ?? null) as
        | (Record<string, unknown> & {
            roles?: Array<number | string>;
            role_codes?: Array<string | number>;
            role_details?: Array<{ role_id: number; code: string }>;
          })
        | null;

      const rawRoles = (baseUser?.roles ?? []) as Array<number | string>;
      const rawRoleCodes = (baseUser?.role_codes ?? data.role_codes ?? []) as Array<
        string | number
      >;
      const rawRoleDetails = (baseUser?.role_details ?? data.role_details ?? []) as Array<{
        role_id: number;
        code: string;
      }>;

      const adminRoleIds = rawRoleDetails
        .filter((detail) => detail.code === "admin")
        .map((detail) => Number(detail.role_id))
        .filter((value) => Number.isFinite(value));

      const normalizeIds = (values: Array<string | number>) =>
        values
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
          .map((value) => Math.trunc(value));

      const normalizeCodes = (values: Array<string | number>) =>
        values.map((value) => (typeof value === "string" ? value : String(value)));

      const allRoleIds = normalizeIds(rawRoles);
      const allRoleCodes = normalizeCodes(rawRoleCodes);
      const filteredRoleIds = isAdminAttempt
        ? allRoleIds
        : allRoleIds.filter((id) => !adminRoleIds.includes(id));
      const filteredRoleCodes = isAdminAttempt
        ? allRoleCodes
        : allRoleCodes.filter((code) => code !== "admin");

      if (baseUser) {
        const adjustedUser = {
          ...baseUser,
          roles: filteredRoleIds,
          role_codes: filteredRoleCodes,
        };
        setUser(adjustedUser);
      } else {
        setRoleState(filteredRoleIds, filteredRoleCodes);
      }

      if (isAdminAttempt) {
        const responseCityCode =
          (resolvedUser && typeof resolvedUser.city_code === "string"
            ? resolvedUser.city_code
            : undefined) ||
          (data?.user && typeof data.user.city_code === "string"
            ? data.user.city_code
            : undefined) ||
          (typeof data?.city_code === "string" ? data.city_code : undefined);
        const selectedCity = normalizeCityCode(cityCode || responseCityCode);
        setAdminCity(selectedCity);
      }

      toast({ title: "Login successful", description: "Welcome back." });
      router.push(isAdminAttempt ? "/mobile/admin" : "/mobile/customer/home");
    } catch {
      toast({
        variant: "destructive",
        title: "Login error",
        description: !navigator.onLine
          ? "No internet connection."
          : "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setLoginAttempt(null);
    }
  };

  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-dvh w-full overflow-y-auto [-webkit-overflow-scrolling:touch]`}
      style={{
        backgroundColor: mobilePalette.background,
        fontFamily: "var(--font-mobile-work-sans), sans-serif",
      }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col px-6 pb-10 pt-12">
        <header className="flex flex-col items-center pb-6">
          <div className="rounded-full bg-[#8D4A25]/10 p-3">
            <ShieldCheck size={34} color="#8D4A25" />
          </div>
          <h1
            className="mt-2 text-4xl font-bold text-[#8D4A25]"
            style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
          >
            Kuteera Kitchen
          </h1>
        </header>

        <section className="mb-8 flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-[360px] space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.8px] text-[#8D4A25]">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="h-12 w-full rounded-xl border border-[#8D4A25]/30 bg-white px-3 text-[#0F172A] outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.8px] text-[#8D4A25]">
                City
              </label>
              {cityOptions.length > 1 ? (
                <select
                  value={cityCode || cityOptions[0] || ""}
                  onChange={(e) => {
                    const value = e.target.value as CityCode;
                    setCityCode(value);
                    setCity(getCityLabel(value));
                  }}
                  className="h-12 w-full rounded-xl border border-[#8D4A25]/30 bg-white px-3 text-[#3A2618] outline-none"
                >
                  {cityOptions.map((option) => (
                    <option key={option} value={option}>
                      {getCityLabel(option)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={city}
                  placeholder="Auto-filled after phone"
                  className="h-12 w-full rounded-xl border border-[#8D4A25]/30 bg-[#f9f6ef] px-3 text-[#3A2618] outline-none"
                />
              )}
            </div>

            {canLoginAsAdmin ? (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.8px] text-[#8D4A25]">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#8D4A25]/30 bg-white px-3 pr-10 text-[#0F172A] outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D4A25]"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-2 pt-1 text-sm text-[#475569]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 accent-[#8D4A25]"
              />
              Remember me
            </label>

            <div
              className={`grid gap-2 ${canLoginAsAdmin ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
            >
              <button
                type="button"
                onClick={() => handleLogin("customer")}
                disabled={isLoading || !phoneNumber}
                className="flex h-14 w-full items-center justify-center rounded-full bg-[#8D4A25] text-lg font-bold text-white shadow-[0px_10px_15px_-3px_rgba(141,74,37,0.2),0px_4px_6px_-4px_rgba(141,74,37,0.2)] disabled:opacity-60"
              >
                {isLoading && loginAttempt === "customer"
                  ? "Logging in..."
                  : canLoginAsAdmin
                    ? "Login as Customer"
                    : "Login with Phone"}
              </button>

              {canLoginAsAdmin ? (
                <button
                  type="button"
                  onClick={() => handleLogin("admin")}
                  disabled={isLoading || !phoneNumber}
                  className="flex h-14 w-full items-center justify-center rounded-full bg-[#463028] text-lg font-bold text-white shadow-[0px_10px_15px_-3px_rgba(70,48,40,0.2),0px_4px_6px_-4px_rgba(70,48,40,0.2)] disabled:opacity-60"
                >
                  {isLoading && loginAttempt === "admin" ? "Logging in..." : "Login as Admin"}
                </button>
              ) : null}
            </div>

            <Link
              href="/mobile/customer/register"
              className={`flex h-14 w-full items-center justify-center rounded-full border-2 border-[#8D4A25] text-lg font-bold text-[#8D4A25] transition-all ${
                showRegisterHighlight ? "ring-2 ring-red-400 shadow-lg shadow-red-500/25" : ""
              }`}
            >
              New? Create Account
            </Link>
          </div>
        </section>

        <footer className="pt-4">
          <div className="flex items-center justify-center gap-3 border-t border-[#8D4A25]/10 py-4">
            <div className="rounded-full bg-[#1B4332]/10 p-1.5">
              <ShieldCheck size={18} color="#1B4332" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1B4332]">
              FSSAI Certified & Hygienic
            </p>
            <div className="h-2 w-2 rounded-full bg-[#1B4332]" />
          </div>
          <p className="text-center text-xs text-[#94A3B8]">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </footer>
      </div>
    </main>
  );
}
