'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function AddGoogleSheetPage() {
  const router = useRouter();
  const [credentialInfo, setCredentialInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    file_name: '',
    file_id: '',
    paper_name: '',
    is_active: true,
  });

  useEffect(() => {
    fetchCredentialInfo();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCredentialInfo = async () => {
    try {
      const res = await axios.get('/api/shop/sheets/credentials');
      setCredentialInfo(res.data);
    } catch {
      showToast('لا توجد بيانات اعتماد. قم برفع ملف الاعتماد أولاً.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.file_name || !formData.file_id || !formData.paper_name) {
      showToast('جميع الحقول مطلوبة', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/api/shop/sheets', formData);
      showToast('تم إضافة الملف بنجاح');
      setTimeout(() => router.push('/admin/addons'), 800);
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل في إضافة الملف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full pt-6 px-9 pb-16 gap-6 relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.message}
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors text-sm"
      >
        <ArrowRight size={16} className="rotate-180" />
        العودة
      </button>

      <div className="flex items-center gap-3 mb-8">
        <Image src="/sheets.png" alt="Google Sheets" width={32} height={32} />
        <h1 className="text-xl font-bold">إضافة ملف جديد</h1>
      </div>

      {credentialInfo && (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-5 mb-6">
          <p className="text-xs font-medium text-[#16a34a] mb-3">بيانات الاعتماد</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">النوع</span>
              <span className="font-medium">{credentialInfo.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">المشروع</span>
              <span className="font-medium text-left dir-ltr text-xs">{credentialInfo.project_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">البريد الإلكتروني</span>
              <span className="font-medium text-left dir-ltr text-xs">{credentialInfo.client_email}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="aspect-video">
          <iframe
            src="https://www.youtube.com/embed/2zwCO5Vfkdk"
            title="شرح إعداد Google Sheets"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم الملف</label>
          <input
            type="text"
            value={formData.file_name}
            onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
            placeholder="مثال: طلات المتجر"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#34A853] focus:ring-2 focus:ring-[#34A853]/20 outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">معرف الملف (File ID)</label>
          <input
            type="text"
            value={formData.file_id}
            onChange={(e) => setFormData({ ...formData, file_id: e.target.value })}
            placeholder="معرف جدول البيانات من رابط Google Sheets"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#34A853] focus:ring-2 focus:ring-[#34A853]/20 outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم الصفحة (Sheet Name)</label>
          <input
            type="text"
            value={formData.paper_name}
            onChange={(e) => setFormData({ ...formData, paper_name: e.target.value })}
            placeholder="مثال: Sheet1"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#34A853] focus:ring-2 focus:ring-[#34A853]/20 outline-none transition-all text-sm"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-gray-700">الحالة</span>
          <button
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={`relative w-12 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-[#34A853]' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.is_active ? 'translate-x-5.5' : 'translate-x-0.1'}`} />
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full py-3 rounded-xl bg-[#34A853] text-white font-medium hover:bg-[#2d9249] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? 'جاري الحفظ...' : 'تأكيد'}
      </button>
    </div>
  );
}
