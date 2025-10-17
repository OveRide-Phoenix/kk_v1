import CustomerDailyMenu from "@/components/order";
import { AdminLayout } from "@/components/admin-layout";

export default function OrderTestPage() {
  return (
    <AdminLayout activePage="ordertest">
      <div className="flex flex-col gap-6 items-start">
        <CustomerDailyMenu />
      </div>
    </AdminLayout>
  );
}
