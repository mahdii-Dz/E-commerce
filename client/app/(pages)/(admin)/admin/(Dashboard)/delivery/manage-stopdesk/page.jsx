"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
  Check
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useWilayaBaladiyas } from "@/components/useFetchWilayas";

export default function ManageStopDeskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [withStopDesk, setWithStopDesk] = useState([]);
  const [withoutStopDesk, setWithoutStopDesk] = useState([]);

  const { data, isLoading, refetch } = useWilayaBaladiyas(code);

  useEffect(() => {
    if (data && data.baladiyas && Array.isArray(data.baladiyas)) {
      setWithStopDesk(data.baladiyas.filter(b => b.has_stopdesk));
      setWithoutStopDesk(data.baladiyas.filter(b => !b.has_stopdesk));
    }
  }, [data]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addToStopDesk = (baladiya) => {
    setWithoutStopDesk(prev => prev.filter(b => b.id !== baladiya.id));
    setWithStopDesk(prev => [...prev, { ...baladiya, has_stopdesk: 1 }].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const removeFromStopDesk = (baladiya) => {
    setWithStopDesk(prev => prev.filter(b => b.id !== baladiya.id));
    setWithoutStopDesk(prev => [...prev, { ...baladiya, has_stopdesk: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleConfirm = async () => {
    if (!code) return;
    setIsSaving(true);
    try {
      const stopdesk_ids = withStopDesk.map(b => b.id);
      await axios.put(`/api/shop/delivery/wilayas/${code}/stopdesk`, { stopdesk_ids });
      showToast("تم تحديث نقاط التوصيل بنجاح", "success");
      refetch();
      setTimeout(() => router.push('/admin/delivery'), 1500);
    } catch (error) {
      showToast(error.response?.data?.message || "فشل التحديث", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!code) {
    return (
      <div className="w-full pt-6 px-9 pb-16 flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-500">رمز الولاية غير موجود</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full pt-6 px-9 pb-16 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#FA3145]" />
          <p className="text-lg text-gray-600">جار التحميل...</p>
        </div>
      </div>
    );
  }

  const wilayaName = data?.wilaya ? `${data.wilaya.code} - ${data.wilaya.name}` : code;

  return (
    <div className="w-full pt-6 px-9 pb-16 relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FA3145]" />
            <p className="text-lg font-medium text-gray-700">جاري حفظ التغييرات...</p>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between mb-14">
        <Link href="/admin/delivery">
          <button className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-black" />
          </button>
        </Link>
      </header>

      <h1 className="text-3xl font-semibold text-black mb-10">
        إدارة نقطة التوصيل - {wilayaName}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Right Column - With StopDesk (first in source = right in RTL) */}
        <div className="bg-white border-2 border-gray-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
            البلديات بنقطة توصيل ({withStopDesk.length})
          </h2>
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
            {withStopDesk.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">لا توجد بلديات بنقطة توصيل</p>
            ) : (
              withStopDesk.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors group"
                >
                  <span className="text-sm text-gray-700 font-medium">{b.name}</span>
                  <button
                    onClick={() => removeFromStopDesk(b)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"
                    title="إزالة من نقطة التوصيل"
                  >
                    <Minus size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Left Column - Without StopDesk (second in source = left in RTL) */}
        <div className="bg-white border-2 border-gray-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
            البلديات بدون نقطة توصيل ({withoutStopDesk.length})
          </h2>
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
            {withoutStopDesk.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">جميع البلديات تمتلك نقطة توصيل</p>
            ) : (
              withoutStopDesk.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <span className="text-sm text-gray-700">{b.name}</span>
                  <button
                    onClick={() => addToStopDesk(b)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors opacity-0 group-hover:opacity-100"
                    title="إضافة إلى نقطة التوصيل"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-start mt-8">
        <button
          onClick={handleConfirm}
          disabled={isSaving}
          className="px-8 py-3 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Check size={18} />
          )}
          تأكيد
        </button>
      </div>
    </div>
  );
}
