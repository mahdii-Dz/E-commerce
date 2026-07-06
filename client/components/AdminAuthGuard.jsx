'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AdminAuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/check');
        const data = await res.json();

        if (!data.authenticated) {
          setIsAuthenticated(false);
          router.replace('/admin');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        router.replace('/admin');
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();

    // Refresh session every 25 minutes to keep it alive
    intervalRef.current = setInterval(checkAuth, 25 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary">جاري التحقق من الصلاحية...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return children;
}
