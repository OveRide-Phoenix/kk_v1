"use client";

import { useRouter } from "next/navigation";
import {
  Home,
  Package,
  Users,
  Calendar,
  Utensils,
  Menu,
  ShoppingCart,
  FileText,
  BarChart3,
  LogOut,
  Code2,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activePage: string;
    setActivePage: (page: string) => void;
    collapsed?: boolean;
    setCollapsed?: (collapsed: boolean) => void;
}

const primaryNavigationItems = [
    { name: "Dashboard", icon: Home, href: "/admin", id: "dashboard" },
    { name: "Product Management", icon: Package, href: "/admin/productmgmt", id: "productmgmt" },
    { name: "Customer Management", icon: Users, href: "/admin/customermgmt", id: "customermgmt" },
    { name: "Daily Menu Setup", icon: Calendar, href: "/admin/dailymenusetup", id: "dailymenusetup" },
    { name: "Kitchen Production", icon: Utensils, href: "/admin/production", id: "production" },
    { name: "Order History", icon: ShoppingCart, href: "/admin/order-history", id: "orders" },
    { name: "Logs & Audit", icon: FileText, href: "/admin/logs", id: "logs" },
    { name: "Reports & Analytics", icon: BarChart3, href: "/admin/reports", id: "reports" },
];

const developerNavigationItems = [
  { name: "Place Order", icon: Code2, href: "/admin/ordertest", id: "ordertest" },
  { name: "DB Schema", icon: Database, href: "/developer/db-schema", id: "dbschema" },
];

const Sidebar: React.FC<SidebarProps> = ({ 
    sidebarOpen, 
    setSidebarOpen, 
    activePage, 
    setActivePage,
    collapsed = false,
    setCollapsed = () => {}
}) => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    
    // Only render the component after it's mounted on the client
    useEffect(() => {
        setMounted(true);
    }, []);
    
    // If not mounted yet, render a placeholder with the same dimensions
    if (!mounted) {
        return (
            <aside className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-20' : 'w-64'} bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative`}>
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                        <span className={`text-lg font-bold ${collapsed ? 'hidden' : 'block'}`}>Kuteera Kitchen</span>
                        {collapsed && <span className="text-lg font-bold">KK</span>}
                    </div>
                    <nav className="flex-1 overflow-y-auto py-4 px-2">
                        {/* Placeholder for navigation items */}
                    </nav>
                </div>
            </aside>
        );
    }

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-20' : 'w-64'} bg-card border-r border-border transform transition-all duration-200 ease-in-out 
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
            <div className="h-full flex flex-col">
                <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                    <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hidden md:flex" 
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    <span className={`text-lg font-bold ${collapsed ? 'hidden' : 'block'}`}>Kuteera Kitchen</span>
                    {collapsed && <span className="text-lg font-bold">KK</span>}
                    <div className="flex items-center">
                        
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="md:hidden" 
                            onClick={() => setSidebarOpen(false)}
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-2">
                    <ul className="space-y-1">
                        {primaryNavigationItems.map((item) => (
                            <li key={item.name}>
                                <Button
                                    variant={activePage === item.id ? "default" : "ghost"}
                                    className={`w-full ${collapsed ? 'justify-center p-2' : 'justify-start'}`}
                                    onClick={() => {
                                        setActivePage(item.id);
                                        router.push(item.href);
                                        setSidebarOpen(false);
                                    }}
                                    title={collapsed ? item.name : undefined}
                                >
                                    <item.icon className={collapsed ? "h-5 w-5" : "mr-2 h-5 w-5"} />
                                    {!collapsed && <span>{item.name}</span>}
                                </Button>
                            </li>
                        ))}
                    </ul>
                    {developerNavigationItems.length > 0 && (
                      <div className={`mt-6 space-y-1 ${collapsed ? "flex flex-col items-center" : ""}`}>
                        {!collapsed && (
                          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Developer Tools
                          </p>
                        )}
                        <ul className="space-y-1 w-full">
                          {developerNavigationItems.map((item) => (
                            <li key={item.name}>
                              <Button
                                variant={activePage === item.id ? "default" : "ghost"}
                                className={`w-full ${collapsed ? "justify-center p-2" : "justify-start"}`}
                                onClick={() => {
                                  setActivePage(item.id);
                                  router.push(item.href);
                                  setSidebarOpen(false);
                                }}
                                title={collapsed ? item.name : undefined}
                              >
                                <item.icon className={collapsed ? "h-5 w-5" : "mr-2 h-5 w-5"} />
                                {!collapsed && <span>{item.name}</span>}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;
