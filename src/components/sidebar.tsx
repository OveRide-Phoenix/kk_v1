"use client";

import { usePathname } from "next/navigation";
import {
    Coffee, Home, Package, Users, Calendar, Utensils, ShoppingCart, FileText, BarChart3, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    activePage: string;
    setActivePage: React.Dispatch<React.SetStateAction<string>>;
}

const navigationItems = [
    { name: "Dashboard", icon: Home, href: "/admin" },
    { name: "Product Management", icon: Package, href: "/admin/productmgmt" },
    { name: "Customer Management", icon: Users, href: "/admin/customers" },
    { name: "Daily Menu Setup", icon: Calendar, href: "/admin/menu" },
    { name: "Kitchen Production", icon: Utensils, href: "/admin/production" },
    { name: "Order History", icon: ShoppingCart, href: "/admin/orders" },
    { name: "Logs & Audit", icon: FileText, href: "/admin/logs" },
    { name: "Reports & Analytics", icon: BarChart3, href: "/admin/reports" },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
    const pathname = usePathname(); // Get current route

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out 
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
            <div className="h-full flex flex-col">
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                    <div className="flex items-center space-x-2">
                        <Coffee className="h-6 w-6 text-primary" />
                        <span className="text-lg font-bold">Kuteera Kitchen</span>
                    </div>
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-4 px-2">
                    <ul className="space-y-1">
                        {navigationItems.map((item) => (
                            <li key={item.name}>
                                <Button
                                    variant={pathname === item.href ? "default" : "ghost"} // Highlight active page
                                    className="w-full justify-start"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="mr-2 h-5 w-5" />
                                    {item.name}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;
