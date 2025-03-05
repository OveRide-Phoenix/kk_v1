"use client";

import { useState, useEffect } from "react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Coffee,
    ChevronDown,
    Menu,
    X,
    Home,
    Package,
    Users,
    Calendar,
    Utensils,
    ShoppingCart,
    FileText,
    BarChart3,
    LogOut,
    Bell,
    Settings,
    User,
} from "lucide-react";


// Sample data for dashboard metrics
const dashboardMetrics = {
    totalOrders: 128,
    pendingOrders: 24,
    totalCustomers: 87,
    activeSubscriptions: 62,
    todayRevenue: 24850,
    monthlyRevenue: 345200,
    popularItems: [
        { name: "Anna 350 gms", orders: 42 },
        { name: "Masala Dosa", orders: 38 },
        { name: "South Indian Thali", orders: 31 },
        { name: "Mysore Pak", orders: 27 },
    ],
    recentOrders: [
        {
            id: "ORD-1234",
            customer: "Rahul Sharma",
            items: 3,
            total: 450,
            status: "Delivered",
        },
        {
            id: "ORD-1235",
            customer: "Priya Patel",
            items: 2,
            total: 320,
            status: "In Progress",
        },
        {
            id: "ORD-1236",
            customer: "Amit Kumar",
            items: 5,
            total: 780,
            status: "Pending",
        },
        {
            id: "ORD-1237",
            customer: "Sneha Reddy",
            items: 1,
            total: 150,
            status: "Delivered",
        },
    ],
};

import { useAuthStore } from "@/store/store";


// Navigation items
const navigationItems = [                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            
    { name: "Dashboard", icon: Home, href: "/admin/dashboard" },
    { name: "Product Management", icon: Package, href: "/admin/products" },
    { name: "Customer Management", icon: Users, href: "/admin/customers" },
    { name: "Daily Menu Setup", icon: Calendar, href: "/admin/menu" },
    { name: "Kitchen Production", icon: Utensils, href: "/admin/production" },
    { name: "Order History", icon: ShoppingCart, href: "/admin/orders" },
    { name: "Logs & Audit", icon: FileText, href: "/admin/logs" },
    { name: "Reports & Analytics", icon: BarChart3, href: "/admin/reports" },
];


export default function AdminDashboard() {
    // These two lines:
    const { isAdmin, setAdmin, setUser, logout } = useAuthStore(); // Destructure the store to get methods
    console.log("In admin dashboard page, global isAdmin is: ",isAdmin);
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activePage, setActivePage] = useState("Dashboard");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
     // Redirect if not an admin
     useEffect(() => {
        if (!isAdmin) {
            console.log("Sign in as an admin");
            router.push("/login"); // Redirect to login page
        }
    }, [isAdmin, router]);


    // and this use effect?
    useEffect(() => {
        const storedIsAdmin = localStorage.getItem("isAdmin");
        const storedUser = localStorage.getItem("user");

        // Check if storedIsAdmin exists and is not null before parsing
        if (storedIsAdmin && storedIsAdmin !== "null" && storedIsAdmin !== "undefined") {
            try {
                const isAdmin = JSON.parse(storedIsAdmin);
                setAdmin(isAdmin); // Use Zustand's setAdmin method
            } catch (error) {
                console.error("Error parsing isAdmin from localStorage", error);
            }
        }

        // Check if storedUser exists and is not null before parsing
        if (storedUser && storedUser !== "null" && storedUser !== "undefined") {
            try {
                const user = JSON.parse(storedUser);
                setUser(user); // Use Zustand's setUser method
            } catch (error) {
                console.error("Error parsing user from localStorage", error);
            }
        }
    }, [setAdmin, setUser]); 

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Handle navigation
    const handleNavigation = (name: string, href: string) => {
        setActivePage(name);
        // In a real app, you would use router.push(href)
        // For this demo, we'll just update the active page
        setMobileMenuOpen(false);
    };

    const handleLogout = () => {
        logout(); // Call the logout function to clear the store
        console.log("Logged out");
        router.push("/login"); // Redirect to login page after logging out
    };

    // Render nothing until isAdmin is true
    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } md:relative md:translate-x-0`}
            >
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                        <div className="flex items-center space-x-2">
                            <Coffee className="h-6 w-6 text-primary" />
                            <span className="text-lg font-bold">
                                Kuteera Kitchen
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto py-4 px-2">
                        <ul className="space-y-1">
                            {navigationItems.map((item) => (
                                <li key={item.name}>
                                    <Button
                                        variant={
                                            activePage === item.name
                                                ? "secondary"
                                                : "ghost"
                                        }
                                        className={`w-full justify-start ${
                                            activePage === item.name
                                                ? "bg-secondary text-secondary-foreground"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            handleNavigation(
                                                item.name,
                                                item.href
                                            )
                                        }
                                    >
                                        <item.icon className="mr-2 h-5 w-5" />
                                        {item.name}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-border">
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-5 w-5" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden mr-2"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold">{activePage}</h1>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon">
                            <Bell className="h-5 w-5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="flex items-center space-x-2"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <span className="hidden md:inline-block">
                                        Admin User
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    My Account
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
                        <div className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-card border-r border-border p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <Coffee className="h-6 w-6 text-primary" />
                                    <span className="text-lg font-bold">
                                        Kuteera Kitchen
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                            <nav>
                                <ul className="space-y-2">
                                    {navigationItems.map((item) => (
                                        <li key={item.name}>
                                            <Button
                                                variant={
                                                    activePage === item.name
                                                        ? "secondary"
                                                        : "ghost"
                                                }
                                                className={`w-full justify-start ${
                                                    activePage === item.name
                                                        ? "bg-secondary text-secondary-foreground"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handleNavigation(
                                                        item.name,
                                                        item.href
                                                    )
                                                }
                                            >
                                                <item.icon className="mr-2 h-5 w-5" />
                                                {item.name}
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Dashboard Content */}
                    {activePage === "Dashboard" && (
                        <div className="space-y-6">
                            {/* Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Total Orders
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {dashboardMetrics.totalOrders}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            <span className="text-green-500">
                                                +12%
                                            </span>{" "}
                                            from last month
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Pending Orders
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {dashboardMetrics.pendingOrders}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            <span className="text-amber-500">
                                                Needs attention
                                            </span>
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Today's Revenue
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(
                                                dashboardMetrics.todayRevenue
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            <span className="text-green-500">
                                                +8%
                                            </span>{" "}
                                            from yesterday
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Active Subscriptions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {
                                                dashboardMetrics.activeSubscriptions
                                            }
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            <span className="text-green-500">
                                                +5
                                            </span>{" "}
                                            new this week
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Charts and Tables */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Popular Items */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Popular Items</CardTitle>
                                        <CardDescription>
                                            Most ordered items this month
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4">
                                            {dashboardMetrics.popularItems.map(
                                                (item, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <span className="font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {item.orders} orders
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                        >
                                            View All Products
                                        </Button>
                                    </CardFooter>
                                </Card>

                                {/* Recent Orders */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Recent Orders</CardTitle>
                                        <CardDescription>
                                            Latest customer orders
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4">
                                            {dashboardMetrics.recentOrders.map(
                                                (order, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="font-medium">
                                                                {order.id}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {order.customer}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium">
                                                                {formatCurrency(
                                                                    order.total
                                                                )}
                                                            </p>
                                                            <span
                                                                className={`text-xs px-2 py-1 rounded-full ${
                                                                    order.status ===
                                                                    "Delivered"
                                                                        ? "bg-green-500/20 text-green-500"
                                                                        : order.status ===
                                                                          "In Progress"
                                                                        ? "bg-blue-500/20 text-blue-500"
                                                                        : "bg-amber-500/20 text-amber-500"
                                                                }`}
                                                            >
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                        >
                                            View All Orders
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                                            onClick={() =>
                                                handleNavigation(
                                                    "Product Management",
                                                    "/admin/products"
                                                )
                                            }
                                        >
                                            <Package className="h-8 w-8" />
                                            <span>Add Product</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                                            onClick={() =>
                                                handleNavigation(
                                                    "Customer Management",
                                                    "/admin/customers"
                                                )
                                            }
                                        >
                                            <Users className="h-8 w-8" />
                                            <span>Add Customer</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                                            onClick={() =>
                                                handleNavigation(
                                                    "Daily Menu Setup",
                                                    "/admin/menu"
                                                )
                                            }
                                        >
                                            <Calendar className="h-8 w-8" />
                                            <span>Update Menu</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                                            onClick={() =>
                                                handleNavigation(
                                                    "Reports & Analytics",
                                                    "/admin/reports"
                                                )
                                            }
                                        >
                                            <BarChart3 className="h-8 w-8" />
                                            <span>View Reports</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Placeholder for other pages */}
                    {activePage !== "Dashboard" && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-2">
                                    {activePage}
                                </h2>
                                <p className="text-muted-foreground">
                                    This module is under development.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
