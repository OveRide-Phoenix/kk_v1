"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ReceiptText, User } from "lucide-react";

type MobileCustomerBottomNavProps = {
  active: "home" | "orders" | "plans" | "profile";
  onNavigate?: (href: string) => boolean;
};

const items = [
  { key: "home", label: "Home", href: "/mobile/customer/home", icon: Home },
  { key: "orders", label: "Order", href: "/mobile/customer/order", icon: ReceiptText },
  { key: "plans", label: "Plans", href: "/mobile/customer/subscription/manage", icon: CalendarDays },
  { key: "profile", label: "Profile", href: "/mobile/customer/profile", icon: User },
] as const;

export function MobileCustomerBottomNav({ active, onNavigate }: MobileCustomerBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[448px] -translate-x-1/2 items-center justify-between border-t border-[rgba(141,73,37,0.1)] bg-[rgba(253,250,241,0.95)] px-8 pb-8 pt-3 backdrop-blur-md">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key || pathname === item.href;

        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-col items-center gap-1"
            onClick={(event) => {
              if (!onNavigate) return;
              const allowed = onNavigate(item.href);
              if (!allowed) event.preventDefault();
            }}
          >
            <Icon size={18} color={isActive ? "#8D4925" : "rgba(141,73,37,0.35)"} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.9px]"
              style={{ color: isActive ? "#8D4925" : "rgba(141,73,37,0.35)" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
