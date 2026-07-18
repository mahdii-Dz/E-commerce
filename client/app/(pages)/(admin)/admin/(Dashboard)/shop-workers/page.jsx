'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Pencil, Trash2, Plus, X } from 'lucide-react'
import { useWorker } from '@/components/AdminAuthGuard'
import { PERMISSION_LABELS, AVAILABLE_PERMISSIONS } from '@/lib/permissions'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ShopWorkersPage() {
  const router = useRouter()
  const worker = useWorker()
  const [workers, setWorkers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })
  const [loading, setLoading] = useState(true)
  const [viewingWorker, setViewingWorker] = useState(null)
  const [editingWorker, setEditingWorker] = useState(null)
  const [deletingWorker, setDeletingWorker] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', password: '', role: 'worker', permissions: [], status: 'active' })

  const showToast = useCallback((message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/shop/workers')
      const data = await res.json()
      if (data.workers) {
        setWorkers(data.workers)
        setStats(data.stats)
      }
    } catch (err) {
      showToast('فشل في تحميل البيانات', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  const openEditModal = (w) => {
    const perms = Array.isArray(w.permissions) ? w.permissions : []
    setEditForm({
      full_name: w.full_name || '',
      email: w.email || '',
      password: '',
      role: w.role || 'worker',
      permissions: perms.includes('*') ? [...AVAILABLE_PERMISSIONS] : perms,
      status: w.status || 'active',
    })
    setEditingWorker(w)
  }

  const handleEditField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const togglePermission = (key) => {
    setEditForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }))
  }

  const handleSaveEdit = async () => {
    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      showToast('الاسم والبريد الإلكتروني مطلوبان', 'error')
      return
    }

    if (editForm.role === 'worker' && editForm.permissions.length === 0) {
      showToast('يجب اختيار صلاحية واحدة على الأقل للموظف', 'error')
      return
    }
    setSaving(true)
    try {
      const body = {
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
        permissions: editForm.permissions,
        status: editForm.status,
      }
      if (editForm.password.trim()) body.password = editForm.password

      const res = await fetch(`/api/shop/workers/${editingWorker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        showToast('تم تحديث الموظف بنجاح', 'success')
        setEditingWorker(null)
        fetchWorkers()
      } else {
        const err = await res.json()
        showToast(err.error || 'فشل التحديث', 'error')
      }
    } catch {
      showToast('حدث خطأ', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/shop/workers/${deletingWorker.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('تم حذف الموظف', 'success')
        setDeletingWorker(null)
        fetchWorkers()
      } else {
        const err = await res.json()
        showToast(err.error || 'فشل الحذف', 'error')
      }
    } catch {
      showToast('حدث خطأ', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (w, newStatus) => {
    try {
      const res = await fetch(`/api/shop/workers/${w.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchWorkers()
      }
    } catch {
      showToast('فشل تغيير الحالة', 'error')
    }
  }

  const isOwner = worker?.role === 'owner'

  return (
    <main className='w-full pt-6 px-4 sm:px-6 lg:px-9 flex flex-col gap-6 pb-16'>
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg`}>
          {toast.message}
        </div>
      )}

      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>موظفي المتجر</h1>
        <button
          onClick={() => router.push('/admin/shop-workers/add')}
          className='flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#e02a3b] transition-colors'
        >
          <Plus size={20} />
          إضافة موظف
        </button>
      </div>

      <div className='flex flex-col md:flex-row items-stretch gap-6'>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>إجمالي الموظفين</p>
          <h2 className='text-[28px] font-semibold text-primary'>{stats.total}</h2>
        </div>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>الموظفين النشطين</p>
          <h2 className='text-[28px] font-semibold text-green-600'>{stats.active}</h2>
        </div>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>الموظفين غير النشطين</p>
          <h2 className='text-[28px] font-semibold text-gray-500'>{stats.inactive}</h2>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-20'>
          <div className='w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin' />
        </div>
      ) : (
        <div className='bg-white border-2 border-stroke rounded-xl overflow-x-auto'>
          <table className='w-full text-right'>
            <thead>
              <tr className='border-b border-stroke bg-gray-50'>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>الاسم + الدور</th>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>البريد الإلكتروني</th>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>كلمة المرور</th>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>الصلاحيات</th>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>الحالة</th>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>تاريخ الإضافة</th>
                <th className='px-5 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap'>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const perms = Array.isArray(w.permissions) ? w.permissions : []
                const permCount = perms.includes('*') ? 'الكل' : perms.length
                return (
                  <tr key={w.id} className='border-b border-stroke hover:bg-gray-50 transition-colors'>
                    <td className='px-5 py-4'>
                      <div className='font-medium text-gray-900'>{w.full_name}</div>
                      <div className='text-xs text-gray-500 mt-0.5'>
                        {w.role === 'owner' ? 'مالك' : 'موظف'}
                      </div>
                    </td>
                    <td className='px-5 py-4 text-sm text-gray-700' dir='ltr'>{w.email}</td>
                    <td className='px-5 py-4 text-sm text-gray-400'>••••••••</td>
                    <td className='px-5 py-4 text-sm text-gray-700'>{permCount}</td>
                    <td className='px-5 py-4'>
                      {isOwner ? (
                        <select
                          value={w.status}
                          onChange={(e) => handleStatusChange(w, e.target.value)}
                          disabled={w.role === 'owner'}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 outline-none cursor-pointer ${
                            w.status === 'active'
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          <option value='active'>نشط</option>
                          <option value='inactive'>غير نشط</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          w.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {w.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      )}
                    </td>
                    <td className='px-5 py-4 text-sm text-gray-700'>{formatDate(w.created_at)}</td>
                    <td className='px-5 py-4'>
                      {isOwner && (
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => setViewingWorker(w)}
                            className='p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors'
                            title='عرض'
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(w)}
                            className='p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors'
                            title='تعديل'
                          >
                            <Pencil size={18} />
                          </button>
                          {w.role !== 'owner' && (
                            <button
                              onClick={() => setDeletingWorker(w)}
                              className='p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors'
                              title='حذف'
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={7} className='px-5 py-10 text-center text-gray-500'>
                    لا يوجد موظفين بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewingWorker && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' onClick={() => setViewingWorker(null)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold'>تفاصيل الموظف</h2>
              <button onClick={() => setViewingWorker(null)} className='p-2 hover:bg-gray-100 rounded-lg'>
                <X size={20} />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <span className='text-sm text-gray-500'>الاسم الكامل</span>
                <p className='font-medium'>{viewingWorker.full_name}</p>
              </div>
              <div>
                <span className='text-sm text-gray-500'>البريد الإلكتروني</span>
                <p className='font-medium' dir='ltr'>{viewingWorker.email}</p>
              </div>
              <div>
                <span className='text-sm text-gray-500'>الدور</span>
                <p className='font-medium'>{viewingWorker.role === 'owner' ? 'مالك' : 'موظف'}</p>
              </div>
              <div>
                <span className='text-sm text-gray-500'>الحالة</span>
                <p className={`font-medium ${viewingWorker.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {viewingWorker.status === 'active' ? 'نشط' : 'غير نشط'}
                </p>
              </div>
              <div>
                <span className='text-sm text-gray-500'>تاريخ الإضافة</span>
                <p className='font-medium'>{formatDate(viewingWorker.created_at)}</p>
              </div>
              <div>
                <span className='text-sm text-gray-500'>الصلاحيات</span>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {Array.isArray(viewingWorker.permissions) && viewingWorker.permissions.includes('*') ? (
                    <span className='px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm'>التحكم الكامل</span>
                  ) : (
                    Array.isArray(viewingWorker.permissions) && viewingWorker.permissions.map(p => (
                      <span key={p} className='px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm'>
                        {PERMISSION_LABELS[p] || p}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingWorker && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' onClick={() => setEditingWorker(null)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold'>تعديل الموظف</h2>
              <button onClick={() => setEditingWorker(null)} className='p-2 hover:bg-gray-100 rounded-lg'>
                <X size={20} />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>الاسم الكامل</label>
                <input
                  type='text'
                  value={editForm.full_name}
                  onChange={e => handleEditField('full_name', e.target.value)}
                  className='w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary outline-none'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>البريد الإلكتروني</label>
                <input
                  type='email'
                  value={editForm.email}
                  onChange={e => handleEditField('email', e.target.value)}
                  className='w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary outline-none'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>كلمة المرور (اتركه فارغاً إذا لم ترد التغيير)</label>
                <input
                  type='password'
                  value={editForm.password}
                  onChange={e => handleEditField('password', e.target.value)}
                  placeholder='اتركه فارغاً'
                  className='w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary outline-none'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>الدور</label>
                <select
                  value={editForm.role}
                  onChange={e => handleEditField('role', e.target.value)}
                  className='w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary outline-none'
                >
                  <option value='worker'>موظف</option>
                  <option value='owner'>مالك</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>الحالة</label>
                <select
                  value={editForm.status}
                  onChange={e => handleEditField('status', e.target.value)}
                  className='w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary outline-none'
                >
                  <option value='active'>نشط</option>
                  <option value='inactive'>غير نشط</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>الصلاحيات</label>
                <div className='grid grid-cols-2 gap-2'>
                  {AVAILABLE_PERMISSIONS.map(key => (
                    <label key={key} className='flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50'>
                      <input
                        type='checkbox'
                        checked={editForm.permissions.includes(key)}
                        onChange={() => togglePermission(key)}
                        className='w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary'
                      />
                      <span className='text-sm'>{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className='flex gap-3 pt-2'>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className='flex-1 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-[#e02a3b] transition-colors disabled:opacity-50'
                >
                  {saving ? 'جار الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button
                  onClick={() => setEditingWorker(null)}
                  className='px-6 py-2.5 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 transition-colors'
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingWorker && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' onClick={() => setDeletingWorker(null)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center' onClick={e => e.stopPropagation()}>
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Trash2 size={32} className='text-red-600' />
            </div>
            <h2 className='text-xl font-bold mb-2'>حذف الموظف</h2>
            <p className='text-gray-500 mb-6'>هل أنت متأكد من حذف {deletingWorker.full_name}؟</p>
            <div className='flex gap-3'>
              <button
                onClick={handleDelete}
                disabled={saving}
                className='flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50'
              >
                {saving ? 'جار الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setDeletingWorker(null)}
                className='flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 transition-colors'
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
