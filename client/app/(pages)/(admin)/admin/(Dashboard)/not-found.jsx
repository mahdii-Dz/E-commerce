import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-primary text-7xl lg:text-8xl font-bold leading-none">404</p>
      <h1 className="text-2xl lg:text-3xl font-semibold mt-4">الصفحة غير موجودة</h1>
      <p className="text-secondary mt-2 text-sm lg:text-base">
        عذراً، الصفحة التي تبحث عنها غير متوفرة في لوحة التحكم.
      </p>
      <Link
        href="/admin/dashboard"
        className="mt-8 bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
      >
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}