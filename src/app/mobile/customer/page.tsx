import Link from "next/link";

export default function MobileCustomerIndexPage() {
  return (
    <main className="min-h-screen bg-[#FDFAF1] p-6">
      <div className="mx-auto max-w-[448px] rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[#8D4A25]">Mobile Customer Screens</h1>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/login">
            Login Landing
          </Link>
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/login/phone">
            Login Form
          </Link>
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/register">
            Customer Registration
          </Link>
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/home">
            Home Dashboard
          </Link>
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/order">
            Daily Menu
          </Link>
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/subscription/manage">
            Manage Subscription
          </Link>
          <Link prefetch={false} className="rounded-xl border border-[#8D4A25]/20 px-4 py-3 text-[#8D4A25]" href="/mobile/customer/profile">
            User Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
