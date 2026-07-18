'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { useWorker } from '@/components/AdminAuthGuard'
import { PERMISSION_LABELS, AVAILABLE_PERMISSIONS } from '@/lib/permissions'

export default function AddWorkerPage() {
  const router = useRouter()
  const worker = useWorker()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'worker',
    permissions: [],
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const togglePermission = (key) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast('جميع الحقول المطلوبة يجب أن تمتلئ', 'error')
      return
    }

    if (form.password !== form.confirm_password) {
      showToast('كلمة المرور غير متطابقة', 'error')
      return
    }

    if (form.password.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error')
      return
    }

    if (form.role === 'worker' && form.permissions.length === 0) {
      showToast('يجب اختيار صلاحية واحدة على الأقل للموظف', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/shop/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
          permissions: form.permissions,
          status: form.status,
        }),
      })

      if (res.ok) {
        showToast('تم إضافة الموظف بنجاح', 'success')
        setTimeout(() => router.push('/admin/shop-workers'), 1000)
      } else {
        const err = await res.json()
        showToast(err.error || 'فشل إضافة الموظف', 'error')
      }
    } catch {
      showToast('حدث خطأ في الاتصال', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className='w-full pt-6 px-4 sm:px-6 lg:px-9 flex flex-col gap-6 pb-16'>
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.message}
        </div>
      )}

      <div className='flex items-center gap-4'>
        <button onClick={() => router.push('/admin/shop-workers')} className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
          <ArrowRight size={24} />
        </button>
        <h1 className='text-3xl font-bold'>إضافة موظف جديد</h1>
      </div>

      <div className='max-w-2xl'>
        <form onSubmit={handleSubmit} className='bg-white border-2 border-stroke rounded-xl p-8 space-y-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>الاسم الكامل</label>
            <input
              type='text'
              value={form.full_name}
              onChange={e => handleField('full_name', e.target.value)}
              placeholder='أدخل الاسم الكامل'
              className='w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none transition-colors'
              autoFocus
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>البريد الإلكتروني</label>
            <input
              type='email'
              value={form.email}
              onChange={e => handleField('email', e.target.value)}
              placeholder='أدخل البريد الإلكتروني'
              className='w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none transition-colors'
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>كلمة المرور</label>
              <input
                type='password'
                value={form.password}
                onChange={e => handleField('password', e.target.value)}
                placeholder='أدخل كلمة المرور'
                className='w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none transition-colors'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>تأكيد كلمة المرور</label>
              <input
                type='password'
                value={form.confirm_password}
                onChange={e => handleField('confirm_password', e.target.value)}
                placeholder='أعد إدخال كلمة المرور'
                className='w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none transition-colors'
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>الدور</label>
            <select
              value={form.role}
              onChange={e => handleField('role', e.target.value)}
              className='w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none transition-colors'
            >
              <option value='worker'>موظف</option>
              <option value='owner'>مالك</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>الحالة</label>
            <select
              value={form.status}
              onChange={e => handleField('status', e.target.value)}
              className='w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none transition-colors'
            >
              <option value='active'>نشط</option>
              <option value='inactive'>غير نشط</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>الصلاحيات</label>
            <p className='text-xs text-gray-500 mb-3'>اختر الصفحات التي يمكن لهذا الموظف الوصول إليها</p>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
              {AVAILABLE_PERMISSIONS.map(key => (
                <label
                  key={key}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                    ${form.permissions.includes(key)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type='checkbox'
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePermission(key)}
                    className='w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary'
                  />
                  <span className='text-sm font-medium'>{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className='flex gap-4 pt-4'>
            <button
              type='submit'
              disabled={saving}
              className='flex-1 bg-primary text-white py-3 rounded-xl font-medium hover:bg-[#e02a3b] transition-colors disabled:opacity-50 text-lg'
            >
              {saving ? 'جار الإضافة...' : 'إضافة الموظف'}
            </button>
            <button
              type='button'
              onClick={() => router.push('/admin/shop-workers')}
              className='px-8 py-3 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 transition-colors'
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
