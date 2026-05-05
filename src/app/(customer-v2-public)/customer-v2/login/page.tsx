"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import CustomerV2AuthShell from "@/components/customer-v2/auth-shell"
import { getCityLabel, normalizeCityCode, type CityCode } from "@/config/cities"
import { useAuthStore } from "@/store/store"

export default function CustomerV2LoginPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [city, setCity] = useState("")
  const [cityCode, setCityCode] = useState("")
  const [cityOptions, setCityOptions] = useState<CityCode[]>([])
  const setUser = useAuthStore((state) => state.setUser)
  const setRoleState = useAuthStore((state) => state.setRoleState)
  const setAdminCity = useAuthStore((state) => state.setAdminCity)
  const [adminPassword, setAdminPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [showRegisterHighlight, setShowRegisterHighlight] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [canLoginAsAdmin, setCanLoginAsAdmin] = useState(false)
  const [loginAttempt, setLoginAttempt] = useState<"customer" | "admin" | null>(null)

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "")
    let formattedValue = ""

    if (digitsOnly.length > 0) {
      const cleanNumber = digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly
      formattedValue = `+91 ${cleanNumber.slice(0, 10)}`
    }

    setPhoneNumber(formattedValue)
    const numericValue = formattedValue.replace(/\D/g, "").slice(2)

    if (numericValue.length === 10) {
      setErrorMessage("")
      setIsLoading(true)
      try {
        const response = await fetch(`/api/backend/api/get-city?phone=${numericValue}`, { credentials: "include" })
        const data = await response.json()

        if (response.ok) {
          const normalizedDefault = normalizeCityCode(data.city_code)
          const eligible = Array.isArray(data.eligible_city_codes) && data.eligible_city_codes.length
            ? data.eligible_city_codes
            : [normalizedDefault]

          const normalizedEligible: CityCode[] = Array.from(
            new Set(
              eligible
                .filter((code: unknown): code is string => typeof code === "string" && code.trim().length > 0)
                .map((code: string) => normalizeCityCode(code)),
            ),
          )

          setCityOptions(normalizedEligible)
          const preferredCity = normalizedEligible.includes(normalizedDefault)
            ? normalizedDefault
            : (normalizedEligible[0] ?? normalizedDefault)
          setCityCode(preferredCity)
          setCity(getCityLabel(preferredCity))

          const adminEnabled = Array.isArray(data.role_codes) ? data.role_codes.includes("admin") : Boolean(data.is_admin)
          setCanLoginAsAdmin(adminEnabled)
          if (!adminEnabled) {
            setAdminPassword("")
          }
          setShowRegisterHighlight(false)
        } else {
          setErrorMessage(data.detail || "User does not exist. Please register.")
          setCity("")
          setCityCode("")
          setCityOptions([])
          setCanLoginAsAdmin(false)
          setAdminPassword("")
          setShowRegisterHighlight(true)
        }
      } catch {
        setErrorMessage("Unable to reach the server. Please ensure the backend is running.")
        setCity("")
        setCityCode("")
        setCityOptions([])
        setCanLoginAsAdmin(false)
        setShowRegisterHighlight(false)
      } finally {
        setIsLoading(false)
      }
    } else {
      setErrorMessage("")
      setCity("")
      setCityCode("")
      setCityOptions([])
      setCanLoginAsAdmin(false)
      setAdminPassword("")
    }
  }

  useEffect(() => {
    if (cityCode) {
      setCity(getCityLabel(cityCode))
    }
  }, [cityCode])

  const handleLogin = async (mode: "customer" | "admin") => {
    const digitsOnly = phoneNumber.replace(/\D/g, "")
    if (digitsOnly.length !== 12) {
      setErrorMessage("Please enter a valid 10-digit phone number")
      return
    }

    const isAdminAttempt = mode === "admin"
    if (!isAdminAttempt && cityCode.trim().length === 0) {
      setErrorMessage("Please select a city to continue.")
      return
    }
    if (isAdminAttempt) {
      if (!canLoginAsAdmin) {
        setErrorMessage("This number is not enabled for admin access.")
        return
      }
      if (!adminPassword.trim()) {
        setErrorMessage("Please enter your admin password.")
        return
      }
    }

    setErrorMessage("")
    setIsLoading(true)
    setLoginAttempt(mode)

    try {
      const formattedPhone = digitsOnly.replace(/^91/, "")
      const payload = {
        phone: formattedPhone,
        admin_password: isAdminAttempt ? adminPassword : null,
        city_code: cityCode || undefined,
      }

      const response = await fetch("/api/backend/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        setErrorMessage(data.detail || data.msg || "Login failed. Try again.")
        return
      }

      if (data.access_token) localStorage.setItem("access_token", data.access_token)
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token)
      localStorage.setItem("remember_me", JSON.stringify(rememberMe))

      let user = null
      if (data.access_token) {
        const meRes = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        if (meRes.ok) user = await meRes.json()
      }

      const resolvedUser = user ?? data.user ?? null
      const baseUser = (resolvedUser ?? data.user ?? null) as
        | (Record<string, unknown> & {
            roles?: Array<number | string>
            role_codes?: Array<string | number>
            role_details?: Array<{ role_id: number; code: string; name: string; description?: string | null; is_system?: boolean }>
          })
        | null

      const rawRoles = (baseUser?.roles ?? []) as Array<number | string>
      const rawRoleCodes = (baseUser?.role_codes ?? data.role_codes ?? []) as Array<string | number>
      const rawRoleDetails = (baseUser?.role_details ?? data.role_details ?? []) as Array<{
        role_id: number
        code: string
        name: string
        description?: string | null
        is_system?: boolean
      }>

      const adminRoleIds = rawRoleDetails
        .filter((detail) => detail.code === "admin")
        .map((detail) => Number(detail.role_id))
        .filter((value) => Number.isFinite(value))

      const allRoleIds = rawRoles
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.trunc(value))
      const allRoleCodes = rawRoleCodes.map((value) => (typeof value === "string" ? value : String(value)))

      const isAdminLoginRequested = mode === "admin"
      const filteredRoleIds = isAdminLoginRequested ? allRoleIds : allRoleIds.filter((id) => !adminRoleIds.includes(id))
      const filteredRoleCodes = isAdminLoginRequested ? allRoleCodes : allRoleCodes.filter((code) => code !== "admin")

      if (isAdminLoginRequested) {
        const responseCityCode =
          (resolvedUser && typeof resolvedUser.city_code === "string" ? resolvedUser.city_code : undefined) ||
          (data?.user && typeof data.user.city_code === "string" ? data.user.city_code : undefined) ||
          (typeof data?.city_code === "string" ? data.city_code : undefined)
        setAdminCity(normalizeCityCode(cityCode || responseCityCode))
      }

      if (baseUser) {
        const adjustedUser = {
          ...baseUser,
          roles: filteredRoleIds,
          role_codes: filteredRoleCodes,
        }
        setUser(adjustedUser)
      } else {
        setRoleState(filteredRoleIds, filteredRoleCodes)
      }

      router.push(mode === "admin" ? "/admin" : "/customer-v2/home")
    } catch (error) {
      console.error("Login error:", error)
      setErrorMessage(!navigator.onLine ? "No internet connection. Please check your network." : "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
      setLoginAttempt(null)
    }
  }

  return (
    <CustomerV2AuthShell
      links={[
        { href: "/customer-v2/login", label: "Login", active: true },
        { href: "/customer-v2/register", label: "Register" },
      ]}
    >
      <main className="flex min-h-[calc(100vh-220px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[500px] rounded-2xl border border-[#8D4925]/10 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] md:p-10">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-[#3D3028]">Welcome back</h1>
            <p className="text-sm text-gray-500">Enter your phone number and city to login or register</p>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#3D3028]" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+91"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                className="w-full rounded-xl border border-transparent bg-[#EFF3FF] px-4 py-3.5 text-[#3D3028] outline-none transition focus:border-[#8D4925]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#3D3028]" htmlFor="city">
                City
              </label>
              {cityOptions.length > 1 ? (
                <select
                  id="city"
                  value={cityCode || cityOptions[0] || ""}
                  onChange={(e) => {
                    setCityCode(e.target.value as CityCode)
                    setCity(getCityLabel(e.target.value))
                  }}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[#3D3028] outline-none transition focus:border-[#8D4925]"
                >
                  {cityOptions.map((option) => (
                    <option key={option} value={option}>
                      {getCityLabel(option)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="city"
                  type="text"
                  value={city}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[#3D3028]"
                />
              )}
            </div>

            {canLoginAsAdmin ? (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#3D3028]" htmlFor="adminPassword">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-[#EFF3FF] px-4 py-3.5 pr-11 text-[#3D3028] outline-none transition focus:border-[#8D4925]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-[#8D4925]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-3">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#8D4925] focus:ring-[#8D4925]/30"
              />
              <span className="text-sm font-medium text-[#3D3028]">Remember me</span>
            </label>

            <div className={`grid gap-3 pt-1 ${canLoginAsAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                type="button"
                onClick={() => void handleLogin("customer")}
                disabled={!phoneNumber || isLoading}
                className="rounded-xl bg-[#8D4925] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#8D4925]/20 transition hover:bg-[#7a3f20] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading && loginAttempt === "customer" ? "Logging in..." : canLoginAsAdmin ? "Login as Customer" : "Login"}
              </button>
              {canLoginAsAdmin ? (
                <button
                  type="button"
                  onClick={() => void handleLogin("admin")}
                  disabled={isLoading}
                  className="rounded-xl bg-[#3D3028] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-[#2e241f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading && loginAttempt === "admin" ? "Logging in..." : "Login as Admin"}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => router.push("/customer-v2/register")}
              className={`w-full rounded-xl border-2 border-[#8D4925]/20 px-5 py-3.5 text-sm font-bold text-[#8D4925] transition hover:bg-[#8D4925]/5 ${
                showRegisterHighlight ? "ring-2 ring-red-400 shadow-lg shadow-red-500/20" : ""
              }`}
            >
              Register
            </button>

            {errorMessage ? <p className="pt-1 text-center text-sm text-red-600">{errorMessage}</p> : null}
          </form>
        </div>
      </main>
    </CustomerV2AuthShell>
  )
}
