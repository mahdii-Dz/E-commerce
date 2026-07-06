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
import Image from "next/image";

const menuItemsData = [
  { icon: LayoutGrid, label: "لوحة التحكم", href: "/admin/dashboard" },
  { icon: Package, label: "جميع المنتجات", href: "/admin/all-products" },
  { icon: ShoppingCart, label: "الطلبات", href: "/admin/orders" },
  { icon: ImageIcon, label: "إضافات", href: "/admin/extra" },
  { icon: Star, label: "التقييمات", href: "/admin/reviews" }
];

export const DashBoardSideBar = ({ isCollapsed, isMobileOpen, closeMobileSidebar, toggleSidebar }) => {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname && isMobileOpen) {
      closeMobileSidebar();
    }
    previousPathnameRef.current = pathname;
  }, [pathname, isMobileOpen]);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={`
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          transform
          h-screen bg-white border-l border-gray-200 flex flex-col ${isCollapsed ? 'py-6 px-3' : 'p-6'} fixed top-0 right-0 z-50 transition-transform duration-300 ease-in-out
        `}
      >
        <button
          onClick={closeMobileSidebar}
          className="md:hidden absolute top-4 left-4 p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>

        {isCollapsed ? (
          <>
            <div className="flex items-center justify-center mb-6">
              <button
                onClick={toggleSidebar}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-[#FA3145] transition-all cursor-pointer"
                title="توسيع الشريط"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {menuItemsData.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link href={item.href} key={item.label}>
                    <div
                      className={`
                        cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium
                        transition-all duration-200 w-full justify-center px-2
                        ${isActive
                          ? "bg-[#FA3145] text-white shadow-md hover:bg-[#e02a3b]"
                          : "text-gray-700 hover:bg-red-50 hover:text-[#FA3145]"
                        }
                      `}
                      title={item.label}
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
                    </div>
                  </Link>
                );
              })}
            </nav>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-12">
              <div className="text-2xl font-bold text-black tracking-tight">
                <Image src='/Logo.png' alt='Logo' width={40} height={40} />
                <h3 className='text-xl lg:text-xl font-semibold truncate'>La Maison D'or</h3>
              </div>
              <button
                onClick={toggleSidebar}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-red-50 hover:text-[#FA3145] transition-all cursor-pointer"
                title="طي الشريط"
              >
                <ChevronRight size={20} />
              </button>
            </div>
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
                        cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium
                        transition-all duration-200 w-full
                        ${isActive
                          ? "bg-[#FA3145] text-white shadow-md hover:bg-[#e02a3b]"
                          : "text-gray-700 hover:bg-red-50 hover:text-[#FA3145]"
                        }
                      `}
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
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </aside>
    </>
  );
};
