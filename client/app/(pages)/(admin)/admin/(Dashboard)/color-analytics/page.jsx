'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Loader2, Package } from 'lucide-react';
import { Select as BaseSelect } from '@base-ui/react/select';
import Image from 'next/image';
import axios from 'axios';

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
];

export default function ColorAnalyticsPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    currentStatus: '',
    wilaya: '',
    startDate: '',
    endDate: '',
    product: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersRes, productsRes] = await Promise.all([
          axios.get('/api/shop/orders'),
          fetch('/api/shop/products').then(r => r.json()),
        ]);
        setOrders(ordersRes.data);
        const prods = Array.isArray(productsRes) ? productsRes : (productsRes?.products || []);
        setProducts(prods);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('فشل تحميل البيانات. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ currentStatus: '', wilaya: '', startDate: '', endDate: '', product: '' });
  };

  const hasActiveFilters =
    filters.currentStatus !== '' ||
    filters.wilaya !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '' ||
    filters.product !== '';

  const processedData = useMemo(() => {
    const filtered = orders.filter(order => {
      if (filters.currentStatus && order.current_status !== filters.currentStatus) return false;
      if (filters.wilaya && !order.wilaya?.toLowerCase().includes(filters.wilaya.toLowerCase())) return false;
      if (filters.startDate) {
        const d = new Date(order.created_at);
        const orderDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (orderDate < filters.startDate) return false;
      }
      if (filters.endDate) {
        const d = new Date(order.created_at);
        const orderDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (orderDate > filters.endDate) return false;
      }
      return true;
    });

    const productMap = {};
    const productsLookup = {};
    products.forEach(p => { productsLookup[p.id] = p; });
    let totalItemsSold = 0;

    filtered.forEach(order => {
      order.items?.forEach(item => {
        if (filters.product && String(item.product_id) !== filters.product) return;

        if (!productMap[item.product_id]) {
          const prodInfo = productsLookup[item.product_id];
          productMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            thumbnail: prodInfo?.thumbnail || null,
            colors: {},
            totalQuantity: 0,
          };
        }

        const colors = item.colors && item.colors.length > 0 ? item.colors : [{ color_name: 'بدون لون', color_hex: 'cccccc', quantity: item.quantity || 1 }];

        colors.forEach(c => {
          const colorKey = c.color_name || 'بدون لون';
          if (!productMap[item.product_id].colors[colorKey]) {
            productMap[item.product_id].colors[colorKey] = {
              color_name: c.color_name || 'بدون لون',
              color_hex: c.color_hex || 'cccccc',
              quantity: 0,
            };
          }
          const qty = Number(c.quantity) || 1;
          productMap[item.product_id].colors[colorKey].quantity += qty;
          productMap[item.product_id].totalQuantity += qty;
          totalItemsSold += qty;
        });
      });
    });

    const productsList = Object.values(productMap);
    productsList.forEach(p => {
      p.colors = Object.values(p.colors).sort((a, b) => b.quantity - a.quantity);
      p.maxColorQty = p.colors[0]?.quantity || 1;
    });
    productsList.sort((a, b) => b.totalQuantity - a.totalQuantity);

    return { products: productsList, totalOrders: filtered.length, totalProducts: productsList.length, totalItemsSold };
  }, [orders, filters]);

  if (loading) {
    return (
      <div className="w-full pt-6 px-9 pb-16 flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full pt-6 px-9 pb-16 flex items-center justify-center h-96">
        <p className="text-[#FA3145]">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full pt-6 px-9 pb-16">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-black tracking-tight">واش نوجد ؟</h1>
          <p className="text-gray-500 text-sm mt-1">تحليل الألوان الأكثر مبيعاً لكل منتج</p>
        </div>
      </header>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">التصفية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة الحالية</label>
            <BaseSelect.Root
              value={filters.currentStatus}
              onValueChange={(value) => handleFilterChange('currentStatus', value)}
            >
              <BaseSelect.Trigger className="flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145]">
                <BaseSelect.Value placeholder="الكل">
                  {(value) => {
                    const s = STATUSES.find(st => st.value === value);
                    return s ? s.label : 'الكل';
                  }}
                </BaseSelect.Value>
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              </BaseSelect.Trigger>
              <BaseSelect.Portal>
                <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                  <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-stroke bg-white py-2 shadow-lg"
                    style={{ width: 'var(--anchor-width)' }}>
                    <BaseSelect.List>
                      <BaseSelect.Item value=""
                        className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                        <BaseSelect.ItemText>الكل</BaseSelect.ItemText>
                      </BaseSelect.Item>
                      {STATUSES.map(s => (
                        <BaseSelect.Item key={s.value} value={s.value}
                          className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الولاية</label>
            <input type="text" placeholder="أدخل اسم الولاية..." value={filters.wilaya}
              onChange={(e) => handleFilterChange('wilaya', e.target.value)}
              className="w-full h-11 px-4 py-2 border border-stroke rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية</label>
            <input type="date" value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full h-11 px-4 py-2 border border-stroke rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
            <input type="date" value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full h-11 px-4 py-2 border border-stroke rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المنتج</label>
            <BaseSelect.Root
              value={filters.product}
              onValueChange={(value) => handleFilterChange('product', value)}
            >
              <BaseSelect.Trigger className="flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145]">
                <BaseSelect.Value placeholder="الكل">
                  {(value) => {
                    if (!value) return 'الكل';
                    const p = products.find(pr => String(pr.id) === value);
                    return p ? p.name : 'الكل';
                  }}
                </BaseSelect.Value>
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              </BaseSelect.Trigger>
              <BaseSelect.Portal>
                <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                  <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-stroke bg-white py-2 shadow-lg"
                    style={{ width: 'var(--anchor-width)' }}>
                    <BaseSelect.List>
                      <BaseSelect.Item value=""
                        className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                        <BaseSelect.ItemText>الكل</BaseSelect.ItemText>
                      </BaseSelect.Item>
                      {products.map(p => (
                        <BaseSelect.Item key={p.id} value={String(p.id)}
                          className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                          <BaseSelect.ItemText>{p.name}</BaseSelect.ItemText>
                        </BaseSelect.Item>
                      ))}
                    </BaseSelect.List>
                  </BaseSelect.Popup>
                </BaseSelect.Positioner>
              </BaseSelect.Portal>
            </BaseSelect.Root>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex justify-end mt-4">
            <button onClick={clearFilters} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm cursor-pointer">
              مسح التصفية
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border-2 border-stroke rounded-xl p-5">
          <p className="text-sm font-medium text-gray-500">إجمالي الطلبات</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{processedData.totalOrders}</p>
        </div>
        <div className="bg-white border-2 border-stroke rounded-xl p-5">
          <p className="text-sm font-medium text-gray-500">إجمالي المنتجات</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{processedData.totalProducts}</p>
        </div>
        <div className="bg-white border-2 border-stroke rounded-xl p-5">
          <p className="text-sm font-medium text-gray-500">إجمالي القطع المباعة</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{processedData.totalItemsSold}</p>
        </div>
      </div>

      {processedData.products.length === 0 ? (
        <div className="bg-white border-2 border-stroke rounded-xl p-12 flex flex-col items-center justify-center gap-3">
          <Package size={48} className="text-gray-300" />
          <p className="text-gray-500 text-lg">لا توجد بيانات تطابق التصفية</p>
        </div>
      ) : (
        <div className="space-y-6">
          {processedData.products.map(product => (
            <div key={product.product_id} className="bg-white border-2 border-stroke rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {product.thumbnail && (
                    <div className="size-18 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                      <Image src={product.thumbnail} alt={product.product_name} width={100} height={100} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900">{product.product_name}</h3>
                </div>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {product.totalQuantity} قطعة
                </span>
              </div>
              <div className="space-y-3">
                {product.colors.map(color => {
                  const percentage = Math.round((color.quantity / product.maxColorQty) * 100);
                  return (
                    <div key={color.color_name} className="flex items-center gap-4">
                      <span
                        className="w-8 h-8 rounded-full border border-gray-300 flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: `#${color.color_hex}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{color.color_name}</span>
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{color.quantity}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(percentage, 4)}%`,
                              backgroundColor: `#${color.color_hex}`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
