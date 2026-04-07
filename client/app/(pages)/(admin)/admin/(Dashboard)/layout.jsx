'use client';

import { DashBoardSideBar } from "@/components/DashBoardSideBar";
import { Roboto } from "next/font/google";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { useState, useEffect, useCallback } from "react";
import { Menu } from "lucide-react";

const RobotoSans = Roboto({
    variable: "--font-Roboto-sans",
    subsets: ["latin"],
});



export default function RootLayout({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Close mobile sidebar on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);



    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    const toggleMobileSidebar = () => {
        setMobileSidebarOpen(prev => !prev);
    };

    const closeMobileSidebar = useCallback(() => {
        setMobileSidebarOpen(false);
    }, []);

    return (
        <AdminAuthGuard>
            <div
                className={`${RobotoSans.variable} antialiased bg-background w-full h-auto`}
            >
                <div className="w-full h-auto flex">
                    {/* Mobile menu button */}
                    <button
                        type="button"
                        onClick={toggleMobileSidebar}
                        className="md:hidden fixed top-4 left-4 z-40 p-4 bg-white border-2 border-[#FA3145] rounded-xl shadow-lg hover:bg-gray-50 pointer-events-auto touch-manipulation"
                        aria-label="Toggle menu"
                    >
                        <Menu size={22} className="text-[#FA3145]" />
                    </button>

                    <DashBoardSideBar
                        isCollapsed={sidebarCollapsed}
                        isMobileOpen={mobileSidebarOpen}
                        closeMobileSidebar={closeMobileSidebar}
                        toggleSidebar={toggleSidebar}
                    />

                    {/* Main content area */}
                    <main
                        className={`
                            flex-1
                            ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
                            ml-0
                            w-full
                            transition-all duration-300
                        `}
                    >
                        {children}
                    </main>
                </div>
            </div>
        </AdminAuthGuard>
    );
}
