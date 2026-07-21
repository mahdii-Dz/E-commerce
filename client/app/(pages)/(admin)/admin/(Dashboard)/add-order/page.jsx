'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ChevronDown, Loader2, Plus, X, Minus, ArrowRight } from 'lucide-react'
import { Select as BaseSelect } from '@base-ui/react/select'
import { Input } from '@/components/ui/input'
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '@/components/ui/combobox'
import { useFetchSingleProduct } from '@/components/useFetchSingleProduct'
import { useWilayaData } from '@/components/useWilayaData'
import Link from 'next/link'

const STATUSES = [
  { value: 'new', label: 'جديد', color: '#6366F1' },
  { value: "didn't respond to the call number 1", label: 'لم يرد على الاتصال رقم 1', color: '#F97316' },
  { value: "didn't respond to the call number 2", label: 'لم يرد على الاتصال رقم 2', color: '#EA580C' },
  { value: "didn't respond to the call number 3", label: 'لم يرد على الاتصال رقم 3', color: '#DC2626' },
  { value: 'confirmed', label: 'مؤكد', color: '#16A34A' },
  { value: 'delayed', label: 'مؤجلة', color: '#CA8A04' },
  { value: 'Delivered', label: 'تم التوصيل', color: '#0891B2' },
  { value: 'canceled by the shop', label: 'ملغي من المتجر', color: '#991B1B' },
  { value: 'canceled by the customer', label: 'ملغي من الزبون', color: '#52525B' },
  { value: 'returned', label: 'مرجعة', color: '#7C3AED' },
]

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]))

const ITEM_DEFAULTS = {
  productId: null,
  product: null,
  colors: [],
  offers: [],
  selectedOffer: null,
  colorQuantities: {},
  loading: false,
}

export default function AddOrderPage() {
  const router = useRouter()
  const { data: productsData, isLoading: productsLoading } = useFetchSingleProduct('/api/shop/products')
  const { wilayaData, sortedEntries } = useWilayaData()

  const [products, setProducts] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    wilaya: '',
    baladiya: '',
    deliveryType: 'domicile',
  })

  const [deliveryPrice, setDeliveryPrice] = useState(0)
  const [currentStatus, setCurrentStatus] = useState('new')
  const [items, setItems] = useState([{ ...ITEM_DEFAULTS }])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (productsData) {
      const list = Array.isArray(productsData) ? productsData : (productsData.products || [])
      setProducts(list)
    }
  }, [productsData])

  useEffect(() => {
    if (!wilayaData) return;
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === formData.wilaya)
    if (code && wilayaData[code]) {
      const w = wilayaData[code]
      setDeliveryPrice(formData.deliveryType === 'domicile' ? w.domicilePrice : w.stopDeskPrice)
    } else {
      setDeliveryPrice(0)
    }
  }, [formData.wilaya, formData.deliveryType, wilayaData])

  const communes = useMemo(() => {
    if (!wilayaData) return [];
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === formData.wilaya)
    return code ? (wilayaData[code]?.municipalities || []) : []
  }, [formData.wilaya, wilayaData])

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleWilayaChange = (value) => {
    if (!wilayaData) return;
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === value)
    if (!code) return
    const muns = wilayaData[code]?.municipalities || []
    setFormData(prev => ({
      ...prev,
      wilaya: value,
      baladiya: muns.length > 0 ? muns[0] : '',
    }))
  }

  const handleProductSelect = async (idx, productId) => {
    const numId = Number(productId)
    if (!numId) return

    setItems(prev => {
      const updated = [...prev]
      updated[idx] = { ...ITEM_DEFAULTS, productId: numId, loading: true }
      return updated
    })

    try {
      const res = await axios.get(`/api/shop/products/${numId}`)
      const product = res.data
      const colors = product.colors || []
      const offers = product.offers || []
      const colorQuantities = {}
      colors.forEach(c => { colorQuantities[c.hex] = 0 })

      setItems(prev => {
        const updated = [...prev]
        updated[idx] = {
          ...ITEM_DEFAULTS,
          productId: numId,
          product,
          colors,
          offers,
          colorQuantities,
          loading: false,
        }
        return updated
      })
    } catch {
      setItems(prev => {
        const updated = [...prev]
        updated[idx] = { ...ITEM_DEFAULTS, loading: false }
        return updated
      })
      showToast('فشل تحميل تفاصيل المنتج', 'error')
    }
  }

  const handleOfferSelect = (idx, offer) => {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[idx], selectedOffer: offer }
      if (item.colors?.length > 0) {
        const reset = {}
        item.colors.forEach(c => { reset[c.hex] = 0 })
        item.colorQuantities = reset
      }
      updated[idx] = item
      return updated
    })
  }

  const handleColorQtyChange = (idx, hex, delta) => {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[idx] }
      const current = item.colorQuantities[hex] || 0
      const newVal = current + delta
      if (newVal < 0) return prev

      const offerQty = item.selectedOffer?.quantity || null
      const totalAllocated = Object.values(item.colorQuantities).reduce((s, q) => s + q, 0)

      if (offerQty !== null && (totalAllocated + delta > offerQty)) return prev
      if (offerQty === null && newVal > 999) return prev

      item.colorQuantities = { ...item.colorQuantities, [hex]: newVal }
      updated[idx] = item
      return updated
    })
  }

  const addItem = () => {
    setItems(prev => [...prev, { ...ITEM_DEFAULTS }])
  }

  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const totalPrice = useMemo(() => {
    let itemsTotal = items.reduce((sum, item) => {
      if (!item.product || !item.productId) return sum
      let qty
      if (item.colors?.length > 0) {
        qty = Object.values(item.colorQuantities).reduce((s, c) => s + c, 0)
      } else if (item.selectedOffer) {
        qty = item.selectedOffer.quantity
      } else {
        qty = 1
      }
      const pricePerUnit = item.selectedOffer
        ? item.selectedOffer.price / item.selectedOffer.quantity
        : (item.product.price || 0)
      return sum + (pricePerUnit * qty)
    }, 0)
    return itemsTotal + deliveryPrice
  }, [items, deliveryPrice])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.firstName.trim()) {
      showToast('الاسم الأول مطلوب', 'error')
      return
    }
    if (!formData.phone.trim()) {
      showToast('رقم الهاتف مطلوب', 'error')
      return
    }

    const validItems = items.filter(i => i.productId && i.product)
    if (validItems.length === 0) {
      showToast('يرجى إضافة منتج واحد على الأقل', 'error')
      return
    }

    for (const item of validItems) {
      if (item.colors?.length > 0) {
        const totalAllocated = Object.values(item.colorQuantities).reduce((s, c) => s + c, 0)
        if (item.selectedOffer && totalAllocated !== item.selectedOffer.quantity) {
          showToast(`مجموع كميات الألوان (${totalAllocated}) لا يساوي كمية العرض (${item.selectedOffer.quantity}) للمنتج "${item.product.name}"`, 'error')
          return
        }
        if (!item.selectedOffer && totalAllocated === 0) {
          showToast(`يرجى تحديد كمية الألوان للمنتج "${item.product.name}"`, 'error')
          return
        }
      }
    }

    setSubmitting(true)

    const body = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone: formData.phone.trim(),
      wilaya: formData.wilaya,
      wilaya_code: wilayaData ? Object.keys(wilayaData).find(key => wilayaData[key]?.name === formData.wilaya) || '' : '',
      baladiya: formData.baladiya,
      delivery_type: formData.deliveryType,
      delivery_Price: deliveryPrice,
      current_status: currentStatus,
      items: validItems.flatMap(item => {
        const colors = item.colors
          ?.filter(c => (item.colorQuantities[c.hex] || 0) > 0)
          .map(c => ({
            color_name: c.name,
            color_hex: c.hex,
            quantity: item.colorQuantities[c.hex],
          })) || []

        const pricePerUnit = item.selectedOffer
          ? item.selectedOffer.price / item.selectedOffer.quantity
          : (item.product.price || 0)

        if (colors.length > 0) {
          return colors.map(c => ({
            product_id: item.product.id,
            quantity: c.quantity,
            price_per_unit: pricePerUnit,
            color_name: c.color_name,
            color_hex: c.color_hex,
            offer_text: item.selectedOffer
              ? `${item.selectedOffer.quantity} for ${item.selectedOffer.price} DA`
              : null,
          }))
        }

        return [{
          product_id: item.product.id,
          quantity: item.selectedOffer?.quantity || 1,
          price_per_unit: pricePerUnit,
          color_name: null,
          color_hex: null,
          offer_text: item.selectedOffer
            ? `${item.selectedOffer.quantity} for ${item.selectedOffer.price} DA`
            : null,
        }]
      }),
    }

    try {
      await axios.post('/api/shop/orders', body)
      showToast('تم إضافة الطلب بنجاح', 'success')
      setTimeout(() => router.push('/admin/orders'), 1500)
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل إضافة الطلب', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full pt-6 px-9 pb-16 relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="mr-2 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <nav className="flex items-center justify-between mb-8">
        <Link href="/admin/orders">
          <button className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowRight size={20} className="text-black" />
          </button>
        </Link>
      </nav>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-black tracking-tight">إضافة طلب</h1>
      </header>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">معلومات العميل</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الأول <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.firstName}
              onChange={(e) => handleFieldChange('firstName', e.target.value)}
              placeholder="الاسم الأول"
              className="h-11 text-right"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اللقب</label>
            <Input
              value={formData.lastName}
              onChange={(e) => handleFieldChange('lastName', e.target.value)}
              placeholder="اللقب"
              className="h-11 text-right"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="0x xxxxxxxx"
              className="h-11 text-right"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الولاية</label>
            <BaseSelect.Root dir="rtl" value={formData.wilaya} onValueChange={handleWilayaChange}>
              <BaseSelect.Trigger className="flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145]">
                <BaseSelect.Value placeholder="اختر الولاية" />
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              </BaseSelect.Trigger>
              <BaseSelect.Portal>
                <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                  <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-stroke bg-white py-2 shadow-lg" style={{ width: 'var(--anchor-width)' }}>
                    <BaseSelect.List>
                      {sortedEntries.map(([code, data]) => (
                        <BaseSelect.Item key={code} value={data.name}
                          className="flex cursor-pointer [direction:rtl] items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                          <BaseSelect.ItemText>{code} - {data.name}</BaseSelect.ItemText>
                        </BaseSelect.Item>
                      ))}
                    </BaseSelect.List>
                  </BaseSelect.Popup>
                </BaseSelect.Positioner>
              </BaseSelect.Portal>
            </BaseSelect.Root>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البلدية</label>
            <BaseSelect.Root dir="rtl" value={formData.baladiya} onValueChange={(v) => handleFieldChange('baladiya', v)} disabled={!communes.length}>
              <BaseSelect.Trigger className="flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145] data-[disabled]:bg-gray-100 data-[disabled]:cursor-not-allowed">
                <BaseSelect.Value placeholder={communes.length === 0 ? 'اختر الولاية أولاً' : 'اختر البلدية'} />
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              </BaseSelect.Trigger>
              <BaseSelect.Portal>
                <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                  <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-stroke bg-white py-2 shadow-lg" style={{ width: 'var(--anchor-width)' }}>
                    <BaseSelect.List>
                      {communes.map(c => (
                        <BaseSelect.Item key={c} value={c}
                          className="flex cursor-pointer [direction:rtl] items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                          <BaseSelect.ItemText>{c}</BaseSelect.ItemText>
                        </BaseSelect.Item>
                      ))}
                    </BaseSelect.List>
                  </BaseSelect.Popup>
                </BaseSelect.Positioner>
              </BaseSelect.Portal>
            </BaseSelect.Root>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع التوصيل</label>
            <BaseSelect.Root dir="rtl" value={formData.deliveryType} onValueChange={(v) => handleFieldChange('deliveryType', v)}>
              <BaseSelect.Trigger className="flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145]">
                <BaseSelect.Value placeholder="اختر نوع التوصيل">
                  {(value) => value === 'domicile' ? 'توصيل للمنزل' : 'استلام من المكتب'}
                </BaseSelect.Value>
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              </BaseSelect.Trigger>
              <BaseSelect.Portal>
                <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                  <BaseSelect.Popup className="rounded-xl border border-stroke bg-white py-2 shadow-lg" style={{ width: 'var(--anchor-width)' }}>
                    <BaseSelect.List>
                      <BaseSelect.Item value="domicile"
                        className="flex cursor-pointer [direction:rtl] items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                        <BaseSelect.ItemText>توصيل للمنزل</BaseSelect.ItemText>
                      </BaseSelect.Item>
                      <BaseSelect.Item value="stopDesk"
                        className="flex cursor-pointer [direction:rtl] items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                        <BaseSelect.ItemText>استلام من المكتب</BaseSelect.ItemText>
                      </BaseSelect.Item>
                    </BaseSelect.List>
                  </BaseSelect.Popup>
                </BaseSelect.Positioner>
              </BaseSelect.Portal>
            </BaseSelect.Root>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">سعر التوصيل (دج)</label>
            <Input
              type="number"
              value={deliveryPrice}
              onChange={(e) => setDeliveryPrice(Number(e.target.value))}
              className="h-11 text-right"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">عناصر الطلب</h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 bg-[#FA3145] text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium cursor-pointer"
          >
            <Plus size={16} />
            إضافة منتج
          </button>
        </div>

        {items.map((item, idx) => {
          const hasColors = item.colors?.length > 0
          const hasOffers = item.offers?.length > 0
          const totalAllocated = hasColors
            ? Object.values(item.colorQuantities).reduce((s, q) => s + q, 0)
            : 0
          const offerQty = item.selectedOffer?.quantity || null
          const qtyError = hasColors && offerQty !== null && totalAllocated !== offerQty
          const pricePerUnit = item.selectedOffer
            ? item.selectedOffer.price / item.selectedOffer.quantity
            : (item.product?.price || 0)

          return (
            <div key={idx} className="border border-gray-200 rounded-xl p-5 mb-4 last:mb-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المنتج <span className="text-red-500">*</span>
                  </label>
                  <Combobox dir="rtl"
                    value={item.productId ? String(item.productId) : ''}
                    onValueChange={(val) => handleProductSelect(idx, val)}
                  >
                    <ComboboxInput placeholder="ابحث عن منتج..." className="w-full" dir="rtl" />
                    <ComboboxContent dir="rtl">
                      <ComboboxList className="text-right">
                        {products.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {productsLoading ? 'جار التحميل...' : 'لا توجد منتجات'}
                          </div>
                        )}
                        {products.map(p => (
                          <ComboboxItem key={p.id} value={String(p.id)} className="text-right" dir="rtl">
                            <div className="flex items-center gap-3 w-full" dir="rtl">
                              <img
                                src={p.image_url || p.thumbnail || '/placeholder.png'}
                                alt={p.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                              <div className="flex items-center justify-between w-full gap-3">
                                <span className="truncate">{p.name}</span>
                                <span className="text-xs text-gray-500 flex-shrink-0">{p.price} دج</span>
                              </div>
                            </div>
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="mt-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {item.loading && (
                <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  جار تحميل تفاصيل المنتج...
                </div>
              )}

              {item.product && !item.loading && (
                <div className="space-y-4">
                  {hasOffers && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اختر عرض</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOfferSelect(idx, null)}
                          className={`px-4 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                            !item.selectedOffer
                              ? 'border-[#FA3145] bg-[#FA3145]/10 text-[#FA3145]'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          شراء 1 قطعة
                          <span className="block text-xs text-gray-500 mt-0.5">{item.product.price} دج للقطعة</span>
                        </button>
                        {item.offers.map((offer, oi) => {
                          const isSelected = item.selectedOffer?.quantity === offer.quantity && item.selectedOffer?.price === offer.price
                          return (
                            <button
                              key={oi}
                              type="button"
                              onClick={() => handleOfferSelect(idx, offer)}
                              className={`px-4 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-[#FA3145] bg-[#FA3145]/10 text-[#FA3145]'
                                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {offer.quantity} قطع - {offer.price} دج
                              <span className="block text-xs text-gray-500 mt-0.5">
                                {(offer.price / offer.quantity).toFixed(2)} دج للقطعة
                                {offer.freeDelivery && ' + توصيل مجاني'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {hasColors && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">توزيع الكمية على الألوان</label>
                      {item.selectedOffer && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">
                              تم تخصيص: {totalAllocated} / {offerQty}
                            </span>
                            {qtyError && (
                              <span className="text-xs text-red-500">(يجب أن يساوي {offerQty})</span>
                            )}
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                qtyError ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((totalAllocated / offerQty) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {item.colors.map(color => {
                          const qty = item.colorQuantities[color.hex] || 0
                          return (
                            <div key={color.hex} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                              <span className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: `#${color.hex}` }} />
                              <span className="text-xs font-medium text-gray-700 ml-1">{color.name}</span>
                              <button
                                type="button"
                                onClick={() => handleColorQtyChange(idx, color.hex, -1)}
                                disabled={qty <= 0}
                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-pointer"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                value={qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  const prev = item.colorQuantities
                                  const totalOthers = Object.entries(prev)
                                    .filter(([h]) => h !== color.hex)
                                    .reduce((s, [, q]) => s + q, 0)
                                  const max = item.selectedOffer ? item.selectedOffer.quantity - totalOthers : 999
                                  const clamped = Math.max(0, Math.min(val, max))
                                  if (clamped !== qty) {
                                    setItems(p => {
                                      const u = [...p]
                                      u[idx] = { ...u[idx], colorQuantities: { ...u[idx].colorQuantities, [color.hex]: clamped } }
                                      return u
                                    })
                                  }
                                }}
                                className="w-10 text-center text-sm border border-gray-300 rounded px-1 py-0.5"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={() => handleColorQtyChange(idx, color.hex, 1)}
                                disabled={offerQty !== null && totalAllocated >= offerQty}
                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-pointer"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-gray-500">سعر الوحدة: </span>
                      <span className="font-medium text-gray-800">{pricePerUnit.toFixed(2)} دج</span>
                    </div>
                    <div>
                      <span className="text-gray-500">الكمية: </span>
                      <span className="font-medium text-gray-800">
                        {hasColors ? totalAllocated : (item.selectedOffer?.quantity || 1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">إجمالي العنصر: </span>
                      <span className="font-semibold text-gray-900">
                        {(
                          pricePerUnit * (hasColors ? totalAllocated : (item.selectedOffer?.quantity || 1))
                        ).toFixed(2)} دج
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">حالة الطلب</h2>
        <div className="max-w-xs">
          <BaseSelect.Root dir="rtl" value={currentStatus} onValueChange={setCurrentStatus}>
             <BaseSelect.Trigger key={currentStatus} className="flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145]">
               <BaseSelect.Value placeholder="اختر الحالة">
                 {(val) => {
                   const s = STATUS_MAP[val];
                   return (
                     <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s?.color || '#6366F1' }} />
                       <span>{s?.label || 'اختر الحالة'}</span>
                     </div>
                   );
                 }}
               </BaseSelect.Value>
               <ChevronDown size={16} className="text-gray-500 shrink-0" />
             </BaseSelect.Trigger>
            <BaseSelect.Portal>
              <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                <BaseSelect.Popup className="rounded-xl border border-stroke bg-white py-2 shadow-lg" style={{ width: 'var(--anchor-width)' }}>
                  <BaseSelect.List>
                    {STATUSES.map(s => (
                      <BaseSelect.Item key={s.value} value={s.value}
                        className="flex cursor-pointer [direction:rtl] items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <BaseSelect.ItemText>{s.label}</BaseSelect.ItemText>
                        </div>
                      </BaseSelect.Item>
                    ))}
                  </BaseSelect.List>
                </BaseSelect.Popup>
              </BaseSelect.Positioner>
            </BaseSelect.Portal>
          </BaseSelect.Root>
        </div>
      </div>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-lg">
            <span className="text-gray-600">الإجمالي الكلي: </span>
            <span className="font-bold text-2xl text-[#FA3145]">{totalPrice.toFixed(2)} دج</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/orders')}
              className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-[#FA3145] text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'جاري الإضافة...' : 'إضافة الطلب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
