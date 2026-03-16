'use client';

import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const menuItemsData = [
  { icon: LayoutGrid, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Package, label: "All Products", href: "/admin/all-products" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: ImageIcon, label: "Extra", href: "/admin/extra" }
];

export const DashBoardSideBar = () => {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col p-6 fixed top-0 left-0">
      {/* Logo */}
      <div className="text-4xl font-bold text-black mb-12 tracking-tight">
        LOGO
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
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
      
    </aside>
  );
};