'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AdminAuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/check');
        const data = await res.json();

        if (!data.authenticated) {
          // Redirect to login
          router.replace('/admin');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        // Network error - assume not authenticated
        router.replace('/admin');
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return children;
}
