'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { getFirstPermittedPage } from "@/lib/permissions";

function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  return { values, errors, isSubmitting, setIsSubmitting, setErrors, handleChange, resetForm, setValues };
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in z-50`}>
      <div className="flex items-center gap-2">
        <span>{type === 'success' ? '✓' : '✕'}</span>
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="mr-2 hover:opacity-75">×</button>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const { values, errors, isSubmitting, setIsSubmitting, setErrors, handleChange } = useForm({
    email: '',
    password: ''
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/shop/workers/check');
        const data = await res.json();
        if (data.authenticated && data.worker) {
          const page = getFirstPermittedPage(data.worker.permissions, data.worker.role)
          router.replace(page)
          return
        }
      } catch {
      } finally {
        setIsChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!values.email.trim()) validationErrors.email = 'البريد الإلكتروني مطلوب';
    if (!values.password.trim()) validationErrors.password = 'كلمة المرور مطلوبة';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/shop/workers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const page = getFirstPermittedPage(data.worker.permissions, data.worker.role)
        router.push(page)
      } else {
        showToast(data.error || 'بيانات الدخول غير صحيحة', 'error');
      }
    } catch {
      showToast('حدث خطأ في الاتصال', 'error');
    }

    setIsSubmitting(false);
  }, [values, setErrors, showToast, router]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit(e);
    }
  }, [isSubmitting, handleSubmit]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary">جاري التحقق من الصلاحية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4" dir="rtl" lang="ar">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 shadow-lg">
            <Image src='/Logo.png' alt='Logo' width={64} height={64} className="rounded-xl" />
          </div>
          <h3 className='text-xl lg:text-xl font-semibold truncate'>La Maison D'or</h3>
          <h1 className="text-2xl font-bold text-gray-900">لوحة الإدارة</h1>
          <p className="text-gray-500 mt-2 text-sm">دخول آمن مطلوب</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="أدخل البريد الإلكتروني"
              disabled={isSubmitting}
              className={`
                w-full px-4 py-3 rounded-xl border-2 bg-gray-50
                transition-all duration-200 outline-none
                ${errors.email ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:bg-white'}
                placeholder:text-gray-400 text-gray-900
              `}
              autoComplete="email"
              autoFocus
            />
            {errors.email && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">كلمة المرور</label>

            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="أدخل كلمة المرور"
                disabled={isSubmitting}
                className={`
                  w-full px-4 py-3 rounded-xl border-2 bg-gray-50
                  transition-all duration-200 outline-none
                  ${errors.password ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:bg-white'}
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                  placeholder:text-gray-400 text-gray-900
                `}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {errors.password && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !values.email.trim() || !values.password.trim()}
            className={`
              w-full py-3 px-4 rounded-xl font-semibold text-white
              transform transition-all duration-200
              flex items-center justify-center gap-2
              ${isSubmitting || !values.email.trim() || !values.password.trim()
                ? 'bg-gray-400 cursor-not-allowed opacity-70'
                : 'bg-[#EEC910] hover:bg-[#D4B80F] hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                <span>جار التحقق...</span>
              </>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>
      </div>

      <footer className="mt-8 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} شركتك. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
