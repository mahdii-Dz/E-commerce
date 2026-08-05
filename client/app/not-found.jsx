'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { ContextProvider } from './context/Context';

export default function RootNotFound() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return (
      <div dir="rtl" lang="ar" className="w-full h-screen flex flex-col items-center justify-center text-center px-4 bg-background">
        <p className="text-primary text-7xl lg:text-8xl font-bold leading-none">404</p>
        <h1 className="text-2xl lg:text-3xl font-semibold mt-4">الصفحة غير موجودة</h1>
        <p className="text-secondary mt-2 text-sm lg:text-base">
          عذراً، الصفحة التي تبحث عنها غير متوفرة في لوحة التحكم.
        </p>
        <Link
          href="/admin"
          className="mt-8 bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
        >
          العودة إلى لوحة التحكم
        </Link>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="ar" className="font-sans antialiased bg-background w-full max-w-full min-h-screen">
      <ContextProvider>
        <NavBar />
        <main style={{ paddingTop: 'calc(var(--navbar-offset, 96px) + 16px)' }}>
          <div className="w-full min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
            <p className="text-primary text-7xl lg:text-8xl font-bold leading-none">404</p>
            <h1 className="text-2xl lg:text-3xl font-semibold mt-4">الصفحة غير موجودة</h1>
            <p className="text-secondary mt-2 text-sm lg:text-base">
              عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
            </p>
            <Link
              href="/"
              className="mt-8 bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              العودة إلى الرئيسية
            </Link>
          </div>
        </main>
        <Footer />
      </ContextProvider>
    </div>
  );
}