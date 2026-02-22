import MobileCustomerGuard from "@/components/mobile/customer/mobile-customer-guard";

export default function MobileCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MobileCustomerGuard>{children}</MobileCustomerGuard>;
}
