"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activePage, setActivePage] = useState("admin"); // Default to "admin" or any initial route

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
                activePage={activePage} 
                setActivePage={setActivePage} 
            />
            <div className="flex-1">
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
