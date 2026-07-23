'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FileSpreadsheet, Plus, Trash2, Eye, ExternalLink, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import axios from 'axios'

function DetailsModal({ sheet, credentialInfo, onClose }) {
  if (!sheet) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        <h3 className="text-lg font-semibold mb-4">تفاصيل الملف</h3>

        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">بيانات الملف</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">اسم الملف</span>
                <span className="font-medium">{sheet.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">معرف الملف</span>
                <span className="font-medium text-left dir-ltr text-xs">{sheet.file_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">اسم الصفحة</span>
                <span className="font-medium">{sheet.paper_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الحالة</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sheet.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {sheet.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">تاريخ الإضافة</span>
                <span className="font-medium text-xs">{new Date(sheet.created_at).toLocaleDateString('ar-DZ')}</span>
              </div>
            </div>
          </div>

          {credentialInfo && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">بيانات الاعتماد</p>
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
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, confirmText = 'حذف', cancelText = 'إلغاء' }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white transition-colors text-sm font-medium ${confirmText === 'استبدال' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AddonsPage() {
  const router = useRouter();
  const [hasCredentials, setHasCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [credentialInfo, setCredentialInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [detailSheet, setDetailSheet] = useState(null);
  const [detailCredential, setDetailCredential] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [credentialFile, setCredentialFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkCredentials();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkCredentials = async () => {
    try {
      const res = await axios.get('/api/shop/sheets/credentials');
      setHasCredentials(true);
      setCredentialInfo(res.data);
      fetchSheets();
    } catch {
      setHasCredentials(false);
      setLoading(false);
    }
  };

  const fetchSheets = async () => {
    try {
      const res = await axios.get('/api/shop/sheets');
      setSheets(res.data.sheets);
      setStats(res.data.stats);
    } catch (err) {
      showToast('فشل في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialUpload = async () => {
    if (!credentialFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('credential', credentialFile);
      await axios.post('/api/shop/sheets/credentials', formData);
      showToast('تم رفع ملف الاعتماد بنجاح');
      setCredentialFile(null);
      setHasCredentials(true);
      const credRes = await axios.get('/api/shop/sheets/credentials');
      setCredentialInfo(credRes.data);
      fetchSheets();
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل في رفع الملف', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!credentialFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('credential', credentialFile);
      formData.append('replace', 'true');
      await axios.post('/api/shop/sheets/credentials', formData);
      showToast('تم استبدال ملف الاعتماد بنجاح');
      setReplaceTarget(null);
      setCredentialFile(null);
      setHasCredentials(true);
      const credRes = await axios.get('/api/shop/sheets/credentials');
      setCredentialInfo(credRes.data);
      fetchSheets();
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل في استبدال الملف', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDetails = async (sheet) => {
    try {
      const res = await axios.get(`/api/shop/sheets/${sheet.id}`);
      setDetailSheet(res.data.sheet);
      setDetailCredential(res.data.credentialInfo);
    } catch {
      showToast('فشل في تحميل التفاصيل', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`/api/shop/sheets/${deleteTarget.id}`);
      showToast('تم حذف الملف بنجاح');
      setDeleteTarget(null);
      fetchSheets();
    } catch {
      showToast('فشل في حذف الملف', 'error');
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full pt-6 px-9 pb-16 gap-6 relative flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (hasCredentials === false) {
    return (
      <div className="w-full pt-6 px-9 pb-16 gap-6 relative">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {toast.message}
          </div>
        )}

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Image src="/sheets.png" alt="Google Sheets" width={40} height={40} />
            <h1 className="text-2xl font-bold">Google Sheet</h1>
          </div>
          <p className="text-gray-500">ربط المتجر بجداول بيانات Google لإرسال الطلبات تلقائياً</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/MURkwrExUcc"
                title="شرح ربط Google Sheets"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center">
            <Upload size={40} className="text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4 text-center">قم برفع ملف الاعتماد JSON الخاص بحساب الخدمة</p>

            <div
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#34A853] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#34A853'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '';
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith('.json')) setCredentialFile(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => setCredentialFile(e.target.files[0])}
              />
              {credentialFile ? (
                <div className="flex items-center justify-center gap-2 text-[#34A853]">
                  <CheckCircle size={20} />
                  <span className="text-sm font-medium">{credentialFile.name}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">اسحب الملف هنا أو اضغط للاختيار</p>
              )}
            </div>

            <button
              onClick={handleCredentialUpload}
              disabled={!credentialFile || uploading}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#34A853] text-white font-medium text-sm hover:bg-[#2d9249] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'جاري الرفع...' : 'رفع الملف'}
            </button>
          </div>
        </div>
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

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Image src="/sheets.png" alt="Google Sheets" width={32} height={32} />
          <h1 className="text-xl font-bold">Google Sheet ادارة</h1>
        </div>
        <button
          onClick={() => router.push('/admin/addons/google-sheets/add')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#34A853] text-white rounded-xl hover:bg-[#2d9249] transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          إضافة ملف جديد
        </button>
      </div>

      {credentialInfo && !replaceTarget && (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[#16a34a]">بيانات الاعتماد</p>
            <button
              onClick={() => setReplaceTarget('pending')}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium underline"
            >
              استبدال
            </button>
          </div>
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

      {replaceTarget && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center mb-6">
          <Upload size={40} className="text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-4 text-center">اختر ملف الاعتماد JSON الجديد</p>

          <div
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#34A853] transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#34A853'; }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '';
              const file = e.dataTransfer.files[0];
              if (file && file.name.endsWith('.json')) setCredentialFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => setCredentialFile(e.target.files[0])}
            />
            {credentialFile ? (
              <div className="flex items-center justify-center gap-2 text-[#34A853]">
                <CheckCircle size={20} />
                <span className="text-sm font-medium">{credentialFile.name}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">اسحب الملف هنا أو اضغط للاختيار</p>
            )}
          </div>

          <div className="flex gap-3 mt-4 w-full">
            <button
              onClick={() => { setReplaceTarget(null); setCredentialFile(null); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={handleReplaceConfirm}
              disabled={!credentialFile || uploading}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'جاري الاستبدال...' : 'تأكيد الاستبدال'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">المجموع</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">النشط</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">غير النشط</p>
          <p className="text-2xl font-bold text-gray-400">{stats.inactive}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">اسم الملف</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">معرف الملف</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">اسم الصفحة</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">الحالة</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">تاريخ الإضافة</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sheets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">لا توجد ملفات مضافة بعد</td>
                </tr>
              ) : (
                sheets.map(sheet => (
                  <tr key={sheet.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{sheet.file_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dir-ltr">{sheet.file_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{sheet.paper_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sheet.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {sheet.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(sheet.created_at).toLocaleDateString('ar-DZ')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(sheet)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="التفاصيل"
                        >
                          <Eye size={16} className="text-gray-500" />
                        </button>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${sheet.file_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="فتح في Google Sheets"
                        >
                          <ExternalLink size={16} className="text-gray-500" />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(sheet)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailSheet && (
        <DetailsModal
          sheet={detailSheet}
          credentialInfo={detailCredential}
          onClose={() => { setDetailSheet(null); setDetailCredential(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`هل أنت متأكد من حذف الملف "${deleteTarget.file_name}"؟`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
