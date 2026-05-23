"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, User, Menu, Search, LogOut, SwitchCamera, X, BellRing, Trash2 } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { useAuthStore, type RoleSummary } from "@/store/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AskDialog } from "@/components/nl/ask-dialog";
import { getCityLabel, normalizeCityCode } from "@/config/cities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationStore } from "@/store/notifications";
import { formatDistanceToNow } from "date-fns";

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigateAttempt?: (href: string) => boolean;
}

export function AdminLayout({ children, activePage, onNavigateAttempt }: AdminLayoutProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setRoleState = useAuthStore((state) => state.setRoleState);
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const setAdminCity = useAuthStore((state) => state.setAdminCity);
  const router = useRouter();
  const { toast } = useToast();
  const normalizedAdminCity = normalizeCityCode(adminCity);
  const adminCityLabel = getCityLabel(normalizedAdminCity);
  const eligibleCities = useMemo(() => {
    const raw =
      Array.isArray(user?.eligible_city_codes) && user?.eligible_city_codes.length
        ? user?.eligible_city_codes
        : user?.city_code
          ? [user.city_code]
          : [adminCity];
    return Array.from(
      new Set(
        raw
          .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
          .map((code) => normalizeCityCode(code)),
      ),
    );
  }, [user?.eligible_city_codes, user?.city_code, adminCity]);

  const handleCityChange = useCallback(
    (value: string) => {
      if (!value) return;
      setAdminCity(value);
    },
    [setAdminCity],
  );

  const [isHydrated, setIsHydrated] = useState(false);
  const displayName =
    isHydrated && typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : "Admin";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const sessionWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionExpiryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tokenVersion, setTokenVersion] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const markAllNotificationsAsRead = useNotificationStore((state) => state.markAllAsRead);
  const markNotificationAsRead = useNotificationStore((state) => state.markAsRead);
  const clearNotification = useNotificationStore((state) => state.clearNotification);
  const clearAllNotifications = useNotificationStore((state) => state.clearAll);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const clearSessionTimers = useCallback(() => {
    if (sessionWarningTimeoutRef.current) {
      clearTimeout(sessionWarningTimeoutRef.current);
      sessionWarningTimeoutRef.current = null;
    }
    if (sessionExpiryTimeoutRef.current) {
      clearTimeout(sessionExpiryTimeoutRef.current);
      sessionExpiryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (notificationsOpen && unreadNotifications > 0) {
      markAllNotificationsAsRead();
    }
  }, [notificationsOpen, unreadNotifications, markAllNotificationsAsRead]);

  useEffect(() => {
    if (!isHydrated) return;

    const checkLowStock = async () => {
      try {
        const params = new URLSearchParams({ city_code: normalizedAdminCity });
        const res = await fetch(`/api/backend/menu/low-stock-alerts?${params}`);
        if (!res.ok) return;
        const items = (await res.json()) as {
          menu_item_id: number;
          item_name: string;
          available_qty: number;
          final_qty: number;
        }[];
        items.forEach((item) => {
          const id = `low-stock-${item.menu_item_id}`;
          const isSoldOut = item.available_qty === 0;
          addNotification({
            id,
            title: isSoldOut ? `${item.item_name} — Sold Out` : `${item.item_name} — Low Stock`,
            message: isSoldOut
              ? "No units remaining on today's menu."
              : `Only ${item.available_qty} of ${item.final_qty} units left.`,
            severity: isSoldOut ? "error" : "warning",
            href: "/admin/dailymenusetup",
          });
        });
      } catch {
        // ignore network errors silently
      }
    };

    // Check once on mount, then re-check whenever the customer cart signals a new order
    checkLowStock();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "kk_last_order_ts") {
        checkLowStock();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isHydrated, normalizedAdminCity, addNotification]);

  const handleLogout = useCallback(async () => {
    clearSessionTimers();
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }, [clearSessionTimers, logout, router]);

  const handleSessionExpired = useCallback(() => {
    setSessionDialogOpen(false);
    handleLogout();
  }, [handleLogout]);

  const handleRefreshSession = useCallback(async () => {
    const refreshToken = (() => {
      try {
        return localStorage.getItem("refresh_token");
      } catch {
        return null;
      }
    })();

    if (!refreshToken) {
      toast({
        title: "Session expired",
        description: "Unable to refresh session. Please log in again.",
        variant: "destructive",
      });
      handleSessionExpired();
      return;
    }

    try {
      const response = await fetch("/api/backend/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.access_token) {
        throw new Error(
          typeof data?.detail === "string" ? data.detail : "Failed to refresh session",
        );
      }

      try {
        localStorage.setItem("access_token", data.access_token);
      } catch {
        /* ignore storage errors */
      }

      setSessionDialogOpen(false);
      clearSessionTimers();
      setTokenVersion((prev) => prev + 1);

      try {
        const meRes = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meRes.ok) {
          const userInfo = await meRes.json();
          setUser(userInfo);
        }
      } catch {
        /* ignore */
      }

      toast({ title: "Session extended", description: "You are still signed in." });
    } catch (error) {
      toast({
        title: "Session refresh failed",
        description: error instanceof Error ? error.message : "Unable to refresh session.",
        variant: "destructive",
      });
      handleSessionExpired();
    }
  }, [clearSessionTimers, handleSessionExpired, setUser, toast]);

  // Check if we're on mobile and set initial collapsed state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const formatNotificationTimestamp = useCallback((timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  }, []);

  const getSeverityClasses = useCallback((severity: string) => {
    switch (severity) {
      case "warning":
        return "border-amber-200 bg-amber-50";
      case "error":
        return "border-destructive/30 bg-destructive/10";
      case "success":
        return "border-emerald-200 bg-emerald-50";
      default:
        return "border-border bg-muted/30";
    }
  }, []);

  const handleNotificationClick = useCallback(
    (notificationId: string, href?: string) => {
      markNotificationAsRead(notificationId);
      if (href) {
        router.push(href);
        setNotificationsOpen(false);
      }
    },
    [markNotificationAsRead, router],
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    clearSessionTimers();

    const token = (() => {
      try {
        return localStorage.getItem("access_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      setSessionDialogOpen(false);
      return;
    }

    const payload = decodeJwt(token);
    const exp = typeof payload?.exp === "number" ? payload.exp * 1000 : null;
    if (!exp) {
      setSessionDialogOpen(false);
      return;
    }

    const now = Date.now();
    const msUntilExpiry = exp - now;

    if (msUntilExpiry <= 0) {
      handleSessionExpired();
      return;
    }

    const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes before expiry
    const warningDelay = Math.max(0, msUntilExpiry - WARNING_THRESHOLD_MS);

    sessionWarningTimeoutRef.current = setTimeout(() => {
      setSessionDialogOpen(true);
    }, warningDelay);

    sessionExpiryTimeoutRef.current = setTimeout(() => {
      handleSessionExpired();
    }, msUntilExpiry);

    setSessionDialogOpen(false);

    return () => {
      clearSessionTimers();
    };
  }, [clearSessionTimers, handleSessionExpired, isHydrated, tokenVersion]);

  const handleSwitchToCustomer = useCallback(async () => {
    if (!user?.phone) {
      toast({
        title: "Unable to switch",
        description: "This admin account is missing a phone number.",
        variant: "destructive",
      });
      return;
    }

    const digitsOnly = user.phone.replace(/\D/g, "");
    if (!digitsOnly) {
      toast({
        title: "Unable to switch",
        description: "Could not determine the admin phone number.",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

    try {
      const response = await fetch("/api/backend/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          admin_password: null,
          city_code: normalizedAdminCity,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const message =
          typeof data?.detail === "string"
            ? data.detail
            : typeof data?.msg === "string"
              ? data.msg
              : "Failed to switch to customer view.";
        throw new Error(message);
      }

      try {
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
        }
        if (data.refresh_token) {
          localStorage.setItem("refresh_token", data.refresh_token);
        }
      } catch {
        /* ignore storage errors */
      }

      const resolvedUser = data.user ?? null;
      const roleDetails: RoleSummary[] = Array.isArray(resolvedUser?.role_details)
        ? resolvedUser.role_details
        : Array.isArray(data.role_details)
          ? data.role_details
          : [];
      const adminRoleIds = roleDetails
        .filter((detail) => detail.code === "admin")
        .map((detail) => Number(detail.role_id))
        .filter((value) => Number.isFinite(value));

      const roles = Array.isArray(resolvedUser?.roles)
        ? resolvedUser.roles
        : Array.isArray(data.user?.roles)
          ? data.user.roles
          : [];
      const roleCodes = Array.isArray(resolvedUser?.role_codes)
        ? resolvedUser.role_codes
        : Array.isArray(data.role_codes)
          ? data.role_codes
          : [];

      const normalisedRoleCodes = (roleCodes as Array<string | number>)
        .map((code) => (typeof code === "string" ? code : String(code)))
        .filter((code) => code !== "admin");
      const normalisedRoles = (roles as Array<string | number>)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.trunc(value))
        .filter((value) => !adminRoleIds.includes(value));

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("kk-switching-to-customer", "1");
        } catch {
          /* ignore sessionStorage issues */
        }
      }

      setRoleState(normalisedRoles, normalisedRoleCodes);

      setTokenVersion((prev) => prev + 1);

      if (resolvedUser) {
        const adjustedUser = {
          ...resolvedUser,
          roles: normalisedRoles,
          role_codes: normalisedRoleCodes,
        };
        setUser(adjustedUser);
      } else {
        try {
          const token = localStorage.getItem("access_token");
          const meRes = await fetch("/api/backend/auth/me", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (meRes.ok) {
            const me = await meRes.json();
            const adjustedMe = {
              ...me,
              roles: normalisedRoles,
              role_codes: normalisedRoleCodes,
            };
            setUser(adjustedMe);
          }
        } catch {
          /* ignore */
        }
      }

      setAdminCity(normalizedAdminCity);

      toast({
        title: "Switched to customer view",
        description: "You can return to the admin panel from the customer navigation.",
      });

      router.push("/customer-v2/home");
    } catch (error) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("kk-switching-to-customer");
        } catch {
          /* ignore storage errors */
        }
      }
      toast({
        title: "Switch failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [normalizedAdminCity, router, setAdminCity, setRoleState, setUser, toast, user]);

  const getPageTitle = () => {
    switch (activePage) {
      case "dashboard":
        return "Dashboard Overview";
      case "productmgmt":
        return "Product Management";
      case "customermgmt":
        return "Customer Management";
      case "dailymenusetup":
        return "Daily Menu Setup";
      case "production":
        return "Kitchen Production Planning";
      case "packing":
        return "Packing Plan";
      case "reports":
        return "Reports & Analytics";
      case "ordertest":
        return "Developer · Order Test";
      case "dbschema":
        return "Developer · DB Schema";
      case "dev-auto-menu":
        return "Developer · Auto Menu";
      case "dev-api-docs":
        return "Developer · API Docs";
      case "discounts":
        return "Discount Rules";
      case "account":
        return "My Account";
      default:
        return "Dashboard";
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activePage={activePage}
          setActivePage={() => {}}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onNavigateAttempt={onNavigateAttempt}
        />

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
              </div>

              <nav className="flex items-center space-x-4">
                {eligibleCities.length > 1 ? (
                  <Select value={normalizedAdminCity} onValueChange={handleCityChange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleCities.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getCityLabel(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="hidden sm:flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    City: {adminCityLabel}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAskOpen(true)}
                  aria-label="Search across Kuteera Kitchen"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSwitchToCustomer}
                  aria-label="Switch to customer view"
                >
                  <SwitchCamera className="h-5 w-5" />
                </Button>
                <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label="View notifications"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="flex items-center justify-between border-b px-4 py-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-primary" />
                        Notifications
                      </p>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-2">
                          {unreadNotifications > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto text-xs"
                              onClick={markAllNotificationsAsRead}
                            >
                              Mark all read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto text-xs"
                            onClick={() => {
                              clearAllNotifications();
                              setNotificationsOpen(false);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Clear all
                          </Button>
                        </div>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        No notifications yet.
                      </div>
                    ) : (
                      <ScrollArea className="max-h-80">
                        <ul className="divide-y">
                          {notifications.map((notification) => (
                            <li key={notification.id} className="px-2 py-1">
                              <div
                                className={`flex items-start gap-3 rounded-md border px-3 py-2 shadow-sm ${getSeverityClasses(notification.severity)}`}
                              >
                                <button
                                  type="button"
                                  className="flex flex-1 flex-col text-left"
                                  onClick={() =>
                                    handleNotificationClick(notification.id, notification.href)
                                  }
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      {notification.title}
                                    </span>
                                    <span className="text-[10px] uppercase text-muted-foreground">
                                      {formatNotificationTimestamp(notification.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {notification.message}
                                  </p>
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    clearNotification(notification.id);
                                  }}
                                  aria-label="Dismiss notification"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" className="flex items-center space-x-2" asChild>
                  <Link
                    href="/admin/account"
                    onClick={(event) => {
                      if (onNavigateAttempt && !onNavigateAttempt("/admin/account")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="hidden md:inline-block">{displayName}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
                  <LogOut className="h-5 w-5" />
                </Button>
              </nav>
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>

      <AskDialog open={askOpen} onOpenChange={setAskOpen} />

      <Dialog open={sessionDialogOpen} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session expiring soon</DialogTitle>
            <DialogDescription>
              Your admin session is about to expire. Stay signed in to keep working or log out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
            <Button onClick={handleRefreshSession}>Stay signed in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function decodeJwt(token: string): { exp?: number } | null {
  try {
    if (typeof window === "undefined") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
