"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCityLabel, normalizeCityCode, type CityCode } from "@/config/cities";
import { useAuthStore } from "@/store/store";
import CustomerNavBar from "@/components/customer-nav-bar";

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityOptions, setCityOptions] = useState<CityCode[]>([]);
  const setUser = useAuthStore((state) => state.setUser);
  const setRoleState = useAuthStore((state) => state.setRoleState);
  const [adminPassword, setAdminPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showRegisterHighlight, setShowRegisterHighlight] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [canLoginAsAdmin, setCanLoginAsAdmin] = useState(false);
  const [loginAttempt, setLoginAttempt] = useState<"customer" | "admin" | null>(null);

  // When phone number changes, fetch city and role information when 10 digits are present.
  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Remove all non-digit characters including +91
    const digitsOnly = value.replace(/\D/g, "");

    let formattedValue = "";
    if (digitsOnly.length > 0) {
      // Remove any leading 91 if present
      const cleanNumber = digitsOnly.startsWith("91")
        ? digitsOnly.slice(2)
        : digitsOnly;

      // Add +91 prefix and limit to 10 digits
      formattedValue = "+91 " + cleanNumber.slice(0, 10);
    }

    setPhoneNumber(formattedValue);

    // Extract only the digits after +91 for API calls
    const numericValue = formattedValue.replace(/\D/g, "").slice(2);

    if (numericValue.length === 10) {
      setErrorMessage("");
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/backend/api/get-city?phone=${numericValue}`,
          { credentials: "include" }
        );
        const data = await response.json();
        if (response.ok) {
          const normalizedDefault = normalizeCityCode(data.city_code);
          const eligible = Array.isArray(data.eligible_city_codes) && data.eligible_city_codes.length
            ? data.eligible_city_codes
            : [normalizedDefault];
          const normalizedEligible = Array.from(
            new Set(
              eligible
                .filter((code: unknown): code is string => typeof code === "string" && code.trim().length > 0)
                .map((code: string) => normalizeCityCode(code)),
            ),
          );
          setCityOptions(normalizedEligible);
          const preferredCity =
            normalizedEligible.includes(normalizedDefault) ? normalizedDefault : normalizedEligible[0] ?? normalizedDefault;
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
        } else {
          setErrorMessage(
            data.detail || "User does not exist. Please register."
          );
          setCity("");
          setCityCode("");
          setCityOptions([]);
          setCanLoginAsAdmin(false);
          setAdminPassword("");
          setShowRegisterHighlight(true);
        }
      } catch {
        setErrorMessage("Unable to reach the server. Please ensure the backend is running.");
        setCity("");
        setCityCode("");
        setCityOptions([]);
        setCanLoginAsAdmin(false);
        setShowRegisterHighlight(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Remove the validation message during typing
      setErrorMessage("");
      setCity("");
      setCityCode("");
      setCanLoginAsAdmin(false);
      setAdminPassword("");
      setAdminPassword("");
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
      setErrorMessage("Please enter a valid 10-digit phone number");
      return;
    }
    const isAdminAttempt = mode === "admin";
    if (!isAdminAttempt && cityCode.trim().length === 0) {
      setErrorMessage("Please select a city to continue.");
      return;
    }
    if (isAdminAttempt) {
      if (!canLoginAsAdmin) {
        setErrorMessage("This number is not enabled for admin access.");
        return;
      }
      if (!adminPassword.trim()) {
        setErrorMessage("Please enter your admin password.");
        return;
      }
    }

    setErrorMessage("");
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

      if (response.ok) {
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
        const rawRoleCodes = (baseUser?.role_codes ?? data.role_codes ?? []) as Array<string | number>;
        const rawRoleDetails = (baseUser?.role_details ?? data.role_details ?? []) as Array<
          { role_id: number; code: string }
        >;

        const adminRoleIds = rawRoleDetails
          .filter((detail) => detail.code === "admin")
          .map((detail) => Number(detail.role_id))
          .filter((value) => Number.isFinite(value));

        const normaliseIds = (values: Array<string | number>) =>
          values
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
            .map((value) => Math.trunc(value));

        const normaliseCodes = (values: Array<string | number>) =>
          values.map((value) => (typeof value === "string" ? value : String(value)));

        const allRoleIds = normaliseIds(rawRoles);
        const allRoleCodes = normaliseCodes(rawRoleCodes);

        const isAdminLoginRequested = mode === "admin";
        const filteredRoleIds = isAdminLoginRequested
          ? allRoleIds
          : allRoleIds.filter((id) => !adminRoleIds.includes(id));
        const filteredRoleCodes = isAdminLoginRequested
          ? allRoleCodes
          : allRoleCodes.filter((code) => code !== "admin");

        if (baseUser) {
          const adjustedUser = isAdminLoginRequested
            ? baseUser
            : {
                ...baseUser,
                roles: filteredRoleIds,
                role_codes: filteredRoleCodes,
              };
          setUser(adjustedUser);
        } else {
          setRoleState(filteredRoleIds, filteredRoleCodes);
        }

        const destination = mode === "admin" ? "/admin" : "/customer/home";
        router.push(destination);
      } else {
        const errorDetail = data.detail || data.msg || "Login failed. Try again.";
        setErrorMessage(errorDetail);
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage(
        !navigator.onLine
          ? "No internet connection. Please check your network."
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
      setLoginAttempt(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canLoginAsAdmin) {
      void handleLogin("admin");
      return;
    }
    void handleLogin("customer");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CustomerNavBar unauthLinks={[{ href: "/register", label: "Register" }]} />

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-24">
        <form
          className="w-full max-w-md"
          onSubmit={handleSubmit}
        >
          <Card className="border-primary/20">
            <CardHeader>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your phone number and city to login or register
            </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  required
                />
              </div>
              {cityOptions.length > 1 ? (
                <div className="space-y-2 pt-4">
                  <Label htmlFor="city-select">City</Label>
                  <Select
                    value={cityCode || cityOptions[0] || ""}
                    onValueChange={(value) => {
                      setCityCode(value as CityCode);
                      setCity(getCityLabel(value));
                    }}
                  >
                    <SelectTrigger id="city-select">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {getCityLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 pt-4">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" type="text" value={city} readOnly />
                </div>
              )}
              {canLoginAsAdmin && (
                <div className="space-y-2 pt-4">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter admin password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300"
                  title="Remember me"
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember me
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="w-full bg-primary"
                  onClick={() => handleLogin("customer")}
                  disabled={!phoneNumber || isLoading}
                >
                  {isLoading && loginAttempt === "customer" ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    canLoginAsAdmin ? "Login as Customer" : "Login"
                  )}
                </Button>
                {canLoginAsAdmin && (
                  <Button
                    type="button"
                    className="w-full bg-[#463028] text-white hover:bg-[#342118]"
                    onClick={() => handleLogin("admin")}
                    disabled={!canLoginAsAdmin || isLoading}
                  >
                    {isLoading && loginAttempt === "admin" ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Logging in...</span>
                      </div>
                    ) : (
                      "Login as Admin"
                    )}
                  </Button>
                )}
              </div>
              <Button
                type="button"
                className={`w-full transition-all ${
                  showRegisterHighlight
                    ? "shadow-lg shadow-red-500/25 ring-2 ring-red-400"
                    : ""
                }`}
                variant="outline"
                onClick={() => router.push("/register")}
              >
                Register
              </Button>
              {errorMessage && (
                <p className="text-red-600 text-sm text-center mt-6">
                  {errorMessage}
                </p>
              )}
              <button type="submit" className="hidden" aria-hidden="true" />
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}
