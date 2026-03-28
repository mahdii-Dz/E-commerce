'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Breadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  const breadcrumbItems = [
    { label: 'الرئيسية', href: '/' },
    ...paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join('/')}`;

      // Special handling for the "product" segment
      let finalHref = href;
      let label = decodeURIComponent(path);
      
      if (path === 'products') {
        label = 'المنتجات';
        finalHref = '/products/All'; 
      } else if (path === 'product') {
        label = 'المنتج';
        finalHref = '/products/All';
      } else if (path === 'cart') {
        label = 'السلة';
      } else if (path === 'contact') {
        label = 'اتصل بنا';
      }

      const isLast = index === paths.length - 1;

      return {
        label,
        href: finalHref,
        isLast,
      };
    }),
  ];

  return (
    <nav aria-label="Breadcrumb" className="text-gray-500 text-sm">
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <li>
                <span className=" block"><ChevronLeft size={12}/></span>
              </li>
            )}
            <li>
              {item.isLast ? (
                <span className="font-medium text-gray-900">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}