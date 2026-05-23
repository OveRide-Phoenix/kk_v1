"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { ChevronDown, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { getCityLabel, normalizeCityCode, type CityCode } from "@/config/cities";
import { useAuthStore } from "@/store/store";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-lv2-playfair",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lv2-jakarta",
});

export default function LoginV2Page() {
  const router = useRouter();
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
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePhoneChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "");

    let formattedValue = "";
    if (digitsOnly.length > 0) {
      const cleanNumber = digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
      formattedValue = `+91 ${cleanNumber.slice(0, 10)}`;
    }
    setPhoneNumber(formattedValue);
    setErrorMessage("");

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
        setErrorMessage(data.detail || "User not found. Please register.");
        return;
      }

      const normalizedDefault = normalizeCityCode(data.city_code);
      const eligible =
        Array.isArray(data.eligible_city_codes) && data.eligible_city_codes.length
          ? data.eligible_city_codes
          : [normalizedDefault];

      const normalizedEligible: CityCode[] = Array.from(
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
      if (!adminEnabled) setAdminPassword("");
      setShowRegisterHighlight(false);
    } catch {
      setErrorMessage("Unable to reach the server. Please check your connection.");
      setCity("");
      setCityCode("");
      setCityOptions([]);
      setCanLoginAsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cityCode) setCity(getCityLabel(cityCode));
  }, [cityCode]);

  const handleLogin = async (mode: "customer" | "admin") => {
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length !== 12) {
      setErrorMessage("Please enter a valid 10-digit phone number.");
      return;
    }
    const isAdminAttempt = mode === "admin";
    if (!isAdminAttempt && !cityCode.trim()) {
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

      if (!response.ok) {
        setErrorMessage(data.detail || data.msg || "Login failed. Try again.");
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
        if (meRes.ok) user = await meRes.json();
      }

      const resolvedUser = user ?? data.user ?? null;
      const baseUser = (resolvedUser ?? data.user ?? null) as
        | (Record<string, unknown> & {
            roles?: Array<number | string>;
            role_codes?: Array<string | number>;
            role_details?: Array<{
              role_id: number;
              code: string;
              name: string;
              description?: string | null;
              is_system?: boolean;
            }>;
          })
        | null;

      const rawRoles = (baseUser?.roles ?? []) as Array<number | string>;
      const rawRoleCodes = (baseUser?.role_codes ?? data.role_codes ?? []) as Array<
        string | number
      >;
      const rawRoleDetails = (baseUser?.role_details ?? data.role_details ?? []) as Array<{
        role_id: number;
        code: string;
        name: string;
        description?: string | null;
        is_system?: boolean;
      }>;

      const adminRoleIds = rawRoleDetails
        .filter((d) => d.code === "admin")
        .map((d) => Number(d.role_id))
        .filter((v) => Number.isFinite(v));

      const normalizeIds = (vals: Array<string | number>) =>
        vals.map(Number).filter(Number.isFinite).map(Math.trunc);
      const normalizeCodes = (vals: Array<string | number>) =>
        vals.map((v) => (typeof v === "string" ? v : String(v)));

      const allRoleIds = normalizeIds(rawRoles);
      const allRoleCodes = normalizeCodes(rawRoleCodes);
      const filteredRoleIds = isAdminAttempt
        ? allRoleIds
        : allRoleIds.filter((id) => !adminRoleIds.includes(id));
      const filteredRoleCodes = isAdminAttempt
        ? allRoleCodes
        : allRoleCodes.filter((c) => c !== "admin");

      if (baseUser) {
        setUser({ ...baseUser, roles: filteredRoleIds, role_codes: filteredRoleCodes });
      } else {
        setRoleState(filteredRoleIds, filteredRoleCodes);
      }

      if (isAdminAttempt) {
        const responseCityCode =
          (resolvedUser && typeof resolvedUser.city_code === "string"
            ? resolvedUser.city_code
            : undefined) || (typeof data?.city_code === "string" ? data.city_code : undefined);
        setAdminCity(normalizeCityCode(cityCode || responseCityCode));
      }

      router.push(isAdminAttempt ? "/admin" : "/customer-v2/home");
    } catch {
      setErrorMessage(
        !navigator.onLine ? "No internet connection." : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setLoginAttempt(null);
    }
  };

  return (
    <div
      className={`${playfair.variable} ${jakarta.variable}`}
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "var(--font-lv2-jakarta), sans-serif",
        background: "#fdfaf1",
      }}
    >
      {/* ── Left panel: image + branding ── */}
      <div
        className="login-left-panel"
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
          background: "linear-gradient(90deg, #8D4925 0%, #5C2D0E 50%, #3A1A08 100%)",
        }}
      >
        {/* Logo top-left */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Image
            src="/images/logo/kk-white.svg"
            alt="KK"
            width={88}
            height={56}
            style={{ width: 88, height: "auto" }}
          />
          <span
            style={{
              fontFamily: "var(--font-lv2-playfair), serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#fdfaf1",
            }}
          >
            Kuteera Kitchen
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "48px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-lv2-playfair), serif",
              fontSize: "clamp(28px, 3vw, 40px)",
              fontWeight: 700,
              color: "#fdfaf1",
              lineHeight: 1.2,
              marginBottom: 16,
              maxWidth: 420,
            }}
          >
            Home cooked meals, delivered to your doorstep.
          </h2>
          <p style={{ color: "rgba(253,250,241,0.72)", fontSize: 15, lineHeight: 1.7 }}>
            Authentic, wholesome food from our kitchen — every single day.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 36,
              padding: "12px 18px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              width: "fit-content",
            }}
          >
            <ShieldCheck size={18} color="#ffc06a" />
            <span style={{ color: "#ffc06a", fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
              FSSAI Certified &amp; Hygienic
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div
        className="login-right-panel"
        style={{
          width: 480,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 40px",
          overflowY: "auto",
        }}
      >
        {/* Mobile-only logo */}
        <div
          className="login-mobile-logo"
          style={{
            display: "none",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: "rgba(141,73,37,0.1)",
              borderRadius: "50%",
              padding: 12,
              marginBottom: 8,
            }}
          >
            <ShieldCheck size={32} color="#8D4925" />
          </div>
          <span
            style={{
              fontFamily: "var(--font-lv2-playfair), serif",
              fontSize: 24,
              fontWeight: 700,
              color: "#8D4925",
            }}
          >
            Kuteera Kitchen
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-lv2-playfair), serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#3A2618",
            marginBottom: 6,
          }}
        >
          Welcome back
        </h1>
        <p style={{ color: "#6B5344", fontSize: 14, marginBottom: 36 }}>
          Enter your phone number to sign in or create an account.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Phone */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                color: "#8D4925",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91"
              value={phoneNumber}
              onChange={handlePhoneChange}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "1.5px solid rgba(141,73,37,0.25)",
                padding: "0 14px",
                fontSize: 15,
                color: "#3A2618",
                background: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* City */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                color: "#8D4925",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              City
            </label>
            {cityOptions.length > 1 ? (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setCityDropdownOpen((o) => !o)}
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 12,
                    border: `1.5px solid ${cityDropdownOpen ? "#8D4925" : "rgba(141,73,37,0.25)"}`,
                    padding: "0 40px 0 14px",
                    fontSize: 15,
                    color: "#3A2618",
                    background: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                    transition: "border-color 0.15s",
                  }}
                >
                  {getCityLabel((cityCode || cityOptions[0] || "") as CityCode)}
                  <ChevronDown
                    size={16}
                    color="#8D4925"
                    style={{
                      position: "absolute",
                      right: 14,
                      top: "50%",
                      transform: `translateY(-50%) rotate(${cityDropdownOpen ? 180 : 0}deg)`,
                      transition: "transform 0.2s",
                      flexShrink: 0,
                    }}
                  />
                </button>

                {cityDropdownOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 10 }}
                      onClick={() => setCityDropdownOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        borderRadius: 12,
                        border: "1.5px solid rgba(141,73,37,0.25)",
                        overflow: "hidden",
                        zIndex: 20,
                        boxShadow: "0 8px 24px rgba(141,73,37,0.12)",
                      }}
                    >
                      {cityOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setCityCode(opt);
                            setCity(getCityLabel(opt));
                            setCityDropdownOpen(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "13px 14px",
                            textAlign: "left",
                            fontSize: 15,
                            color: cityCode === opt ? "#8D4925" : "#3A2618",
                            background: cityCode === opt ? "rgba(141,73,37,0.06)" : "transparent",
                            border: "none",
                            borderBottom: "1px solid rgba(141,73,37,0.08)",
                            cursor: "pointer",
                            fontWeight: cityCode === opt ? 600 : 400,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxSizing: "border-box",
                          }}
                        >
                          <span style={{ width: 16, flexShrink: 0, color: "#8D4925" }}>
                            {cityCode === opt ? "✓" : ""}
                          </span>
                          {getCityLabel(opt)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <input
                type="text"
                readOnly
                value={city}
                placeholder="Auto-filled after phone"
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1.5px solid rgba(141,73,37,0.25)",
                  padding: "0 14px",
                  fontSize: 15,
                  color: "#3A2618",
                  background: "#f9f6ef",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>

          {/* Admin password */}
          {canLoginAsAdmin && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#8D4925",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Admin Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 12,
                    border: "1.5px solid rgba(141,73,37,0.25)",
                    padding: "0 44px 0 14px",
                    fontSize: 15,
                    color: "#3A2618",
                    background: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#8D4925",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Remember me */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: "#6B5344",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: "#8D4925", width: 16, height: 16 }}
            />
            Remember me
          </label>

          {/* Error */}
          {errorMessage && (
            <p
              style={{
                fontSize: 13,
                color: "#dc2626",
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.15)",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              {errorMessage}
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => handleLogin("customer")}
              disabled={isLoading || !phoneNumber}
              style={{
                height: 52,
                borderRadius: 100,
                background: "#8D4925",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                border: "none",
                cursor: isLoading || !phoneNumber ? "not-allowed" : "pointer",
                opacity: isLoading || !phoneNumber ? 0.6 : 1,
                boxShadow:
                  "0 10px 15px -3px rgba(141,73,37,0.2), 0 4px 6px -4px rgba(141,73,37,0.2)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isLoading && loginAttempt === "customer" ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Logging in...
                </>
              ) : canLoginAsAdmin ? (
                "Login as Customer"
              ) : (
                "Login with Phone"
              )}
            </button>

            {canLoginAsAdmin && (
              <button
                type="button"
                onClick={() => handleLogin("admin")}
                disabled={isLoading || !phoneNumber}
                style={{
                  height: 52,
                  borderRadius: 100,
                  background: "#463028",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  border: "none",
                  cursor: isLoading || !phoneNumber ? "not-allowed" : "pointer",
                  opacity: isLoading || !phoneNumber ? 0.6 : 1,
                  boxShadow:
                    "0 10px 15px -3px rgba(70,48,40,0.2), 0 4px 6px -4px rgba(70,48,40,0.2)",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isLoading && loginAttempt === "admin" ? (
                  <>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Logging in...
                  </>
                ) : (
                  "Login as Admin"
                )}
              </button>
            )}

            <Link
              href="/register"
              style={{
                height: 52,
                borderRadius: 100,
                border: `2px solid ${showRegisterHighlight ? "#ef4444" : "#8D4925"}`,
                color: showRegisterHighlight ? "#ef4444" : "#8D4925",
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: showRegisterHighlight ? "0 0 0 3px rgba(239,68,68,0.2)" : "none",
              }}
            >
              New? Create Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid rgba(141,73,37,0.1)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ background: "rgba(27,67,50,0.1)", borderRadius: "50%", padding: 6 }}>
              <ShieldCheck size={16} color="#1B4332" />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.8,
                color: "#1B4332",
                textTransform: "uppercase",
              }}
            >
              FSSAI Certified &amp; Hygienic
            </span>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4332" }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#94A3B8" }}>
            By continuing, you agree to our Terms &amp; Privacy Policy
          </p>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { width: 100% !important; padding: 32px 24px !important; justify-content: flex-start !important; padding-top: 48px !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `,
        }}
      />
    </div>
  );
}
