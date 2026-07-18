'use client';

import { DashBoardSideBar } from "@/components/DashBoardSideBar";
import { Roboto } from "next/font/google";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
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

    // Save and restore scroll position per admin page
    const pathname = usePathname();

    useEffect(() => {
        history.scrollRestoration = 'manual';

        const saved = sessionStorage.getItem(`admin_scroll_${pathname}`);
        if (saved) {
            const y = parseInt(saved, 10);
            let attempts = 0;
            const tryRestore = () => {
                window.scrollTo(0, y);
                if (++attempts < 20) requestAnimationFrame(tryRestore);
            };
            requestAnimationFrame(tryRestore);
        }

        let saveTimer;
        const onScroll = () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                sessionStorage.setItem(`admin_scroll_${pathname}`, window.scrollY);
            }, 150);
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        const saveImmediate = () => {
            clearTimeout(saveTimer);
            sessionStorage.setItem(`admin_scroll_${pathname}`, window.scrollY);
        };
        window.addEventListener('beforeunload', saveImmediate);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') saveImmediate();
        });

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('beforeunload', saveImmediate);
            document.removeEventListener('visibilitychange', saveImmediate);
            clearTimeout(saveTimer);
        };
    }, [pathname]);



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
                dir="rtl"
                lang="ar"
                className={`${RobotoSans.variable} antialiased bg-background w-full h-auto`}
            >
                <div className="w-full h-auto flex">
                    {/* Mobile menu button */}
                    <button
                        type="button"
                        onClick={toggleMobileSidebar}
                        className="md:hidden fixed top-4 right-4 z-40 p-4 bg-white border-2 border-[#FA3145] rounded-xl shadow-lg hover:bg-gray-50 pointer-events-auto touch-manipulation"
                        aria-label="فتح القائمة"
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
                            flex-1 min-w-0
                            ${sidebarCollapsed ? 'md:mr-20' : 'md:mr-64'}
                            mr-0
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
