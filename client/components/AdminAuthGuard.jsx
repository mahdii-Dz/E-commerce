'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { hasPermission, getFirstPermittedPage } from '@/lib/permissions';

const WorkerContext = createContext(null);

export function useWorker() {
  return useContext(WorkerContext);
}

export function AdminAuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const handleUnauthorized = useCallback(() => {
    setWorker(null);
    setLoading(false);
    router.replace('/admin');
  }, [router]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/shop/workers/check');
      const data = await res.json();
      if (data.authenticated && data.worker) {
        setWorker(data.worker);
        return data.worker;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    checkAuth().then((w) => {
      if (!w) {
        handleUnauthorized();
        return;
      }
      if (!hasPermission(w.permissions, w.role, pathname)) {
        const page = getFirstPermittedPage(w.permissions, w.role);
        setRedirecting(true);
        router.replace(page);
        return;
      }
      setRedirecting(false);
      setLoading(false);
    });
  }, [checkAuth, handleUnauthorized, pathname, router]);

  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl" lang="ar">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary text-sm">جاري التحقق من الصلاحية...</p>
        </div>
      </div>
    );
  }

  if (!worker) return null;

  return (
    <WorkerContext.Provider value={worker}>
      {children}
    </WorkerContext.Provider>
  );
}
