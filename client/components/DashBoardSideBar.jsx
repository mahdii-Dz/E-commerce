'use client';

import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Image as ImageIcon,
  Star,
  X,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const menuItemsData = [
  { icon: LayoutGrid, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Package, label: "All Products", href: "/admin/all-products" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: ImageIcon, label: "Extra", href: "/admin/extra" },
  { icon: Star, label: "Reviews", href: "/admin/reviews" }
];

export const DashBoardSideBar = ({ isCollapsed, isMobileOpen, closeMobileSidebar, toggleSidebar }) => {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState(null);
  const previousPathnameRef = useRef(pathname);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (previousPathnameRef.current !== pathname && isMobileOpen) {
      closeMobileSidebar();
    }
    previousPathnameRef.current = pathname;
  }, [pathname, isMobileOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          transform
          h-screen bg-white border-r border-gray-200 flex flex-col p-6 fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={closeMobileSidebar}
          className="md:hidden absolute top-4 right-4 p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className={`text-2xl font-bold text-black mb-12 tracking-tight ${isCollapsed ? 'hidden' : 'block'}`}>
          LOGO
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          {menuItemsData.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                href={item.href}
                key={item.label}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div
                  className={`
                    cursor-pointer
                    flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium
                    transition-all duration-200 w-full
                    ${isActive
                      ? "bg-[#FA3145] text-white shadow-md hover:bg-[#e02a3b]"
                      : "text-gray-700 hover:bg-red-50 hover:text-[#FA3145]"
                    }
                    ${isCollapsed ? 'justify-center px-2' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon
                    size={20}
                    strokeWidth={2}
                    className={`
                      transition-colors duration-200
                      ${isActive
                        ? "text-white"
                        : hoveredItem === item.label
                          ? "text-[#FA3145]"
                          : "text-gray-500"
                      }
                    `}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Desktop toggle button (bottom) */}
        <button
          onClick={toggleSidebar}
          className="mt-auto hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-red-50 hover:text-[#FA3145] transition-all"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </aside>
    </>
  );
};