import CustomerGuard from "@/components/customer-guard"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CustomerGuard>{children}</CustomerGuard>
}
