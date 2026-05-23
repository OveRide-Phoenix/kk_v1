import CustomerGuard from "@/components/customer-guard"
import CustomerV2Shell from "@/components/customer-v2/shell"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CustomerGuard>
      <CustomerV2Shell>{children}</CustomerV2Shell>
    </CustomerGuard>
  )
}
