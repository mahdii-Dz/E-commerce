'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Loader2, Trash2, ShoppingBag, Phone, MessageCircle, ChevronLeft, ChevronRight, Eye, Edit, Plus } from 'lucide-react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWilayaData } from '@/components/useWilayaData';

const ITEMS_PER_PAGE = 40;

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatPhoneForWhatsApp(phone) {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) return '213' + digits.substring(1);
  if (digits.startsWith('213')) return digits;
  return '213' + digits;
}

function renderColorsWithQty(order) {
  const colors = order.colors;
  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    if (order.color_name) {
      return <span className="text-xs text-gray-500">{order.color_name}</span>;
    }
    return null;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {colors.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: `#${c.hex}` }} />
          {c.name} <span className="text-gray-400 font-medium">×{c.quantity}</span>
        </span>
      ))}
    </div>
  );
}

export default function LeftedOrdersPage() {
  const { wilayaData } = useWilayaData();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debounceTimer = useRef(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [converting, setConverting] = useState(new Set());
  const [deleting, setDeleting] = useState(new Set());
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', phone: '',
    wilaya: 'Alger', baladiya: '', delivery_type: 'domicile',
    delivery_price: 0,
  });
  const [editItems, setEditItems] = useState([]);
  const [productColorsMap, setProductColorsMap] = useState({});
  const [productOffersMap, setProductOffersMap] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [filters, setFilters] = useState({
    wilaya: '',
    baladiya: '',
    startDate: '',
    endDate: '',
    product: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearchQuery(val), 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ wilaya: '', baladiya: '', startDate: '', endDate: '', product: '' });
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/shop/lefted-orders');
        setOrders(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching lefted orders:', err);
        setError('فشل تحميل الطلبات المتروكة');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const list = orders || [];
    const q = debouncedSearchQuery.toLowerCase().trim();
    const wilayaQ = filters.wilaya.toLowerCase().trim();
    const baladiyaQ = filters.baladiya.toLowerCase().trim();
    const startD = filters.startDate;
    const endD = filters.endDate;
    const prodQ = filters.product.toLowerCase().trim();
    const result = [];

    for (let i = 0; i < list.length; i++) {
      const order = list[i];

      if (q && !order.first_name?.toLowerCase().includes(q) &&
          !order.last_name?.toLowerCase().includes(q) &&
          !`${order.first_name} ${order.last_name}`.toLowerCase().includes(q) &&
          !order.phone?.includes(q) &&
          !order.product_name?.toLowerCase().includes(q) &&
          !order.id?.toString().includes(q)) {
        continue;
      }

      if (wilayaQ && !order.wilaya?.toLowerCase().includes(wilayaQ)) continue;
      if (baladiyaQ && !order.baladiya?.toLowerCase().includes(baladiyaQ)) continue;

      if (startD) {
        const d = new Date(order.created_at);
        const orderDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (orderDate < startD) continue;
      }
      if (endD) {
        const d = new Date(order.created_at);
        const orderDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (orderDate > endD) continue;
      }

      if (prodQ && !order.product_name?.toLowerCase().includes(prodQ)) continue;

      result.push(order);
    }

    return result;
  }, [orders, debouncedSearchQuery, filters]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleConvert = async (order) => {
    setConverting(prev => new Set(prev).add(order.id));
    try {
      const response = await axios.post(`/api/shop/lefted-orders/${order.id}`);
      if (response.status === 200 || response.status === 201) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        showToast(`تم تحويل الطلب رقم ${order.id} إلى طلب عادي`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل تحويل الطلب', 'error');
    } finally {
      setConverting(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  const handleDelete = async (orderId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب المتروك؟')) return;
    setDeleting(prev => new Set(prev).add(orderId));
    try {
      await axios.delete(`/api/shop/lefted-orders/${orderId}`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      showToast('تم حذف الطلب المتروك', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل حذف الطلب', 'error');
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleView = (order) => {
    setViewingOrder(order);
  };

  const handleEdit = async (order) => {
    setEditingOrder(order);
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === order.wilaya) || '';
    const baladiya = order.baladiya || '';
    setEditForm({
      first_name: order.first_name || '',
      last_name: order.last_name || '',
      phone: order.phone || '',
      wilaya: order.wilaya || 'Alger',
      baladiya,
      delivery_type: order.delivery_type || 'domicile',
      delivery_price: Number(order.delivery_price) || 0,
    });
    const initialColors = order.colors && Array.isArray(order.colors) && order.colors.length > 0
      ? order.colors.map(c => ({ color_name: c.name, color_hex: c.hex || '', quantity: Number(c.quantity) || 1 }))
      : order.color_name
        ? [{ color_name: order.color_name, color_hex: order.color_hex || '', quantity: order.quantity || 1 }]
        : [];
    const totalQty = initialColors.length > 0
      ? initialColors.reduce((s, c) => s + c.quantity, 0)
      : (order.quantity || 1);
    const items = [{
      product_id: order.product_id,
      product_name: order.product_name || '',
      quantity: totalQty,
      price_per_unit: Number(order.price_per_unit || order.product_price || 0),
      offer_text: order.offer_text || '',
      colors: initialColors,
    }];
    setEditItems(JSON.parse(JSON.stringify(items)));

    if (order.product_id) {
      try {
        const res = await axios.get(`/api/shop/products/${order.product_id}`);
        if (res.data) {
          setProductColorsMap({ [order.product_id]: res.data.colors || [] });
          setProductOffersMap({ [order.product_id]: res.data.offers || [] });
        }
      } catch (e) {
        console.error('Failed to fetch product:', e);
      }
    }
  };

  const handleEditItemToggleColor = (itemIdx, colorName, colorHex) => {
    setEditItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      let colors = [...(item.colors || [])];
      const existingIdx = colors.findIndex(c => c.color_name === colorName);
      if (existingIdx >= 0) {
        colors.splice(existingIdx, 1);
      } else {
        colors.push({ color_name: colorName, color_hex: colorHex, quantity: 1 });
      }
      item.colors = colors;
      updated[itemIdx] = item;
      return updated;
    });
  };

  const handleEditItemChange = (itemIdx, field, value) => {
    setEditItems(prev => {
      const updated = [...prev];
      updated[itemIdx] = { ...updated[itemIdx], [field]: value };
      return updated;
    });
  };

  const handleEditItemColorChange = (itemIdx, colorIdx, field, value) => {
    setEditItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      const colors = [...(item.colors || [])];
      if (colorIdx >= colors.length) colors.push({ color_name: '', color_hex: '', quantity: 1 });
      colors[colorIdx] = { ...colors[colorIdx], [field]: value };
      item.colors = colors;
      updated[itemIdx] = item;
      return updated;
    });
  };

  const handleEditItemAddColor = (itemIdx) => {
    setEditItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      item.colors = [...(item.colors || []), { color_name: '', color_hex: '', quantity: 1 }];
      updated[itemIdx] = item;
      return updated;
    });
  };

  const handleEditItemRemoveColor = (itemIdx, colorIdx) => {
    setEditItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      const colors = [...(item.colors || [])];
      colors.splice(colorIdx, 1);
      item.colors = colors;
      updated[itemIdx] = item;
      return updated;
    });
  };

  const handleEditItemOfferChange = (itemIdx, selectedValue, offers) => {
    setEditItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      if (!selectedValue) {
        item.offer_text = '';
      } else {
        const matched = offers.find(o => `${o.quantity} for ${o.price} DA` === selectedValue);
        if (matched) {
          item.offer_text = selectedValue;
          item.quantity = Number(matched.quantity) || 1;
        } else {
          item.offer_text = selectedValue;
        }
      }
      updated[itemIdx] = item;
      return updated;
    });
  };

  const handleEditWilayaChange = (value) => {
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === value);
    if (!code) return;
    const data = wilayaData[code];
    const newCommunes = data?.municipalities || [];
    const newBaladiya = newCommunes.length > 0 ? newCommunes[0] : '';
    setEditForm(prev => ({ ...prev, wilaya: value, baladiya: newBaladiya }));
  };

  const editCommunes = useMemo(() => {
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === editForm.wilaya);
    return code ? (wilayaData[code]?.municipalities || []) : [];
  }, [editForm.wilaya]);

  // Auto-calculate delivery price when wilaya or delivery type changes
  useEffect(() => {
    const code = Object.keys(wilayaData).find(key => wilayaData[key]?.name === editForm.wilaya);
    if (code) {
      const wilayaInfo = wilayaData[code];
      const autoPrice = editForm.delivery_type === 'domicile'
        ? (wilayaInfo.domicilePrice || 0)
        : (wilayaInfo.stopDeskPrice || 0);
      setEditForm(prev => ({ ...prev, delivery_price: autoPrice }));
    }
  }, [editForm.wilaya, editForm.delivery_type]);

  const handleSaveEdit = async () => {
    const item = editItems[0];
    const colors = item.colors || [];

    if (colors.length > 0) {
      const sumColors = colors.reduce((s, c) => s + (Number(c.quantity) || 0), 0);
      if (item.offer_text) {
        const match = item.offer_text.match(/(\d+)\s*for\s*(\d+)/);
        const expected = match ? Number(match[1]) : Number(item.quantity) || 1;
        if (sumColors !== expected) {
          showToast(`مجموع كميات الألوان (${sumColors}) لا يساوي الكمية الإجمالية (${expected}) للمنتج "${item.product_name}"`, 'error');
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const totalQty = colors.length > 0
        ? colors.reduce((s, c) => s + (Number(c.quantity) || 0), 0)
        : Number(item.quantity) || 1;

      const payload = {
        ...editForm,
        product_id: item.product_id,
        product_name: item.product_name,
        price_per_unit: item.price_per_unit,
        quantity: totalQty,
        colors: colors.length > 0 ? colors.map(c => ({ name: c.color_name, hex: c.color_hex, quantity: Number(c.quantity) || 1 })) : [],
        offer_text: item.offer_text || '',
      };

      const response = await axios.put(`/api/shop/lefted-orders/${editingOrder.id}`, payload);
      if (response.status === 200) {
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...payload } : o));
        setEditingOrder(null);
        showToast('تم تحديث الطلب المتروك بنجاح');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'فشل تحديث الطلب', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPagination = (isTop) => (
    <footer className={`flex items-center justify-between ${isTop ? 'mb-4' : 'mt-6 pt-4 border-t border-gray-200'}`}>
      <span className="text-sm text-gray-600">
        عرض {filteredOrders.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredOrders.length)} من {filteredOrders.length} طلب متروك
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
          className="inline-flex cursor-pointer items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={18} /><span>السابق</span>
        </button>
        <div className="flex gap-1">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={index} className="w-8 h-8 flex items-center justify-center text-gray-600">...</span>
            ) : (
              <button key={index} onClick={() => goToPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-[#FA3145] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {page}
              </button>
            )
          ))}
        </div>
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}
          className="inline-flex cursor-pointer items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <span>التالي</span><ChevronLeft size={18} />
        </button>
      </div>
    </footer>
  );

  if (loading) {
    return (
      <div className="w-full pt-6 px-9 pb-16 flex items-center justify-center h-96">
        <p className="text-gray-500">جار تحميل الطلبات المتروكة...</p>
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
    <div className="w-full pt-6 px-9 pb-16 relative">
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <X className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="mr-2 hover:opacity-80"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-black tracking-tight">الطلبات المتروكة</h1>
      </header>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الولاية</label>
            <input type="text" placeholder="أدخل اسم الولاية..." value={filters.wilaya}
              onChange={(e) => handleFilterChange('wilaya', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البلدية</label>
            <input type="text" placeholder="أدخل اسم البلدية..." value={filters.baladiya}
              onChange={(e) => handleFilterChange('baladiya', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية</label>
            <input type="date" value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
            <input type="date" value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]" />
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

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full">
        <div className="relative w-full mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="بحث في الطلبات المتروكة..." value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pr-10 pl-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145] focus:border-transparent" />
          {searchQuery && (
            <button onClick={clearSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={18} />
            </button>
          )}
        </div>
        {renderPagination(true)}

        {currentOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد طلبات متروكة</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">المنتج</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">الزبون</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">الموقع</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">التوصيل</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">الكمية</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">السعر</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">التاريخ</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentOrders.map((order) => {
                    const waPhone = formatPhoneForWhatsApp(order.phone || '');
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-gray-900">{order.product_name}</span>
                            {renderColorsWithQty(order)}
                            {order.offer_text && (
                              <span className="text-xs text-gray-500">{order.offer_text}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{order.first_name} {order.last_name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-gray-500" dir="ltr">{order.phone}</span>
                              <a href={`tel:${order.phone}`} className="text-blue-500 hover:text-blue-700"><Phone size={14} /></a>
                              <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700"><MessageCircle size={14} /></a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <span className="text-gray-900">{order.wilaya}{order.baladiya ? ` - ${order.baladiya}` : ''}</span>
                        </td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <span className="text-gray-600">{order.delivery_type === 'domicile' ? 'توصيل للمنزل' : 'استلام من المكتب'}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{order.quantity}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                          {(() => {
                            const ppu = Number(order.price_per_unit || order.product_price || 0);
                            const offer = order.offer_text;
                            let productTotal = ppu * Number(order.quantity || 1);
                            if (offer) {
                              const match = offer.match(/(\d+)\s*for\s*(\d+)/);
                              if (match) productTotal = Number(match[2]);
                            }
                            const total = productTotal + Number(order.delivery_price || 0);
                            return total.toFixed(2);
                          })()} دج
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleView(order)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                              title="عرض التفاصيل">
                              <Eye className="w-5 h-5 text-gray-900" />
                            </button>
                            <button onClick={() => handleEdit(order)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                              title="تعديل">
                              <Edit className="w-5 h-5 text-blue-600" />
                            </button>
                            <button onClick={() => handleConvert(order)}
                              disabled={converting.has(order.id)}
                              className={`p-1.5 rounded-lg transition-colors ${converting.has(order.id) ? 'cursor-wait' : 'hover:bg-green-50 cursor-pointer'}`}
                              title="تحويل إلى طلب">
                              {converting.has(order.id) ? (
                                <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                              ) : (
                                <ShoppingBag className="w-5 h-5 text-green-600" />
                              )}
                            </button>
                            <button onClick={() => handleDelete(order.id)}
                              disabled={deleting.has(order.id)}
                              className={`p-1.5 rounded-lg transition-colors ${deleting.has(order.id) ? 'cursor-wait' : 'hover:bg-red-50 cursor-pointer'}`}
                              title="حذف">
                              {deleting.has(order.id) ? (
                                <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-red-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {currentOrders.map((order) => {
                const waPhone = formatPhoneForWhatsApp(order.phone || '');
                return (
                  <Card key={order.id} className="bg-white border-2 border-stroke">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-semibold text-gray-900">{order.product_name}</CardTitle>
                          <span className="text-sm font-bold text-gray-900">
                            {(() => {
                              const ppu = Number(order.price_per_unit || order.product_price || 0);
                              const offer = order.offer_text;
                              let productTotal = ppu * Number(order.quantity || 1);
                              if (offer) {
                                const match = offer.match(/(\d+)\s*for\s*(\d+)/);
                                if (match) productTotal = Number(match[2]);
                              }
                              const total = productTotal + Number(order.delivery_price || 0);
                              return total.toFixed(2);
                            })()} دج
                          </span>
                        </div>
                        <button onClick={() => toggleOrderExpansion(order.id)}
                          className="p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <ChevronDown size={20} className={`text-gray-600 transition-transform ${expandedOrders.has(order.id) ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{order.first_name} {order.last_name}</span>
                          <div className="flex items-center gap-1">
                            <a href={`tel:${order.phone}`} className="text-blue-500 hover:text-blue-700"><Phone size={14} /></a>
                            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700"><MessageCircle size={14} /></a>
                          </div>
                        </div>
                        <div><span className="text-gray-500">الهاتف: </span><span dir="ltr">{order.phone}</span></div>
                        <div><span className="text-gray-500">الموقع: </span>{order.wilaya}{order.baladiya ? ` - ${order.baladiya}` : ''}</div>
                        <div><span className="text-gray-500">التوصيل: </span>{order.delivery_type === 'domicile' ? 'توصيل للمنزل' : 'استلام من المكتب'}</div>
                        <div><span className="text-gray-500">الكمية: </span>{order.quantity}</div>
                        {order.colors && Array.isArray(order.colors) && order.colors.length > 0 ? (
                          <div>
                            <span className="text-gray-500">الألوان: </span>
                            <div className="flex flex-col gap-0.5 mt-1">
                              {order.colors.map((c, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: `#${c.hex}` }} />
                                  <span>{c.name} ×{c.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : order.color_name ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">اللون: </span>
                            <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: `#${order.color_hex}` }} />
                            <span>{order.color_name}</span>
                          </div>
                        ) : null}
                        {order.offer_text && <div><span className="text-gray-500">العرض: </span>{order.offer_text}</div>}
                        <div><span className="text-gray-500">التاريخ: </span>{formatDate(order.created_at)}</div>
                      </div>
                      {expandedOrders.has(order.id) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200">
                          <button onClick={() => { setViewingOrder(order); }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors">
                            <Eye size={16} /> عرض
                          </button>
                          <button onClick={() => handleEdit(order)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors">
                            <Edit size={16} /> تعديل
                          </button>
                          <button onClick={() => handleConvert(order)}
                            disabled={converting.has(order.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${converting.has(order.id) ? 'bg-green-100 text-green-800 cursor-wait' : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'}`}>
                            {converting.has(order.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShoppingBag size={16} />
                            )}
                            تحويل
                          </button>
                          <button onClick={() => handleDelete(order.id)}
                            disabled={deleting.has(order.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${deleting.has(order.id) ? 'bg-red-100 text-red-800 cursor-wait' : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'}`}>
                            {deleting.has(order.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            حذف
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        {currentOrders.length > 0 && renderPagination(false)}
      </div>

      {/* View Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingOrder(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">تفاصيل الطلب المتروك</h3>
              <button onClick={() => setViewingOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">المنتج: </span><span className="font-medium">{viewingOrder.product_name}</span></div>
                <div><span className="text-gray-500">الكمية: </span><span>{viewingOrder.quantity}</span></div>
                <div><span className="text-gray-500">السعر: </span><span>{(Number(viewingOrder.price_per_unit || viewingOrder.product_price) * Number(viewingOrder.quantity)).toFixed(2)} دج</span></div>
                <div><span className="text-gray-500">سعر الوحدة: </span><span>{Number(viewingOrder.price_per_unit || viewingOrder.product_price).toFixed(2)} دج</span></div>
                {viewingOrder.colors && Array.isArray(viewingOrder.colors) && viewingOrder.colors.length > 0 ? (
                  <div>
                    <span className="text-gray-500">الألوان: </span>
                    <div className="flex flex-col gap-1 mt-1">
                      {viewingOrder.colors.map((c, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: `#${c.hex}` }} />
                          <span>{c.name} - {c.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : viewingOrder.color_name ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">اللون: </span>
                    <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: `#${viewingOrder.color_hex}` }} />
                    <span>{viewingOrder.color_name}</span>
                  </div>
                ) : null}
                {viewingOrder.offer_text && <div><span className="text-gray-500">العرض: </span><span>{viewingOrder.offer_text}</span></div>}
              </div>
              <hr className="border-gray-200" />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">الاسم: </span><span>{viewingOrder.first_name} {viewingOrder.last_name}</span></div>
                <div><span className="text-gray-500">الهاتف: </span><span dir="ltr">{viewingOrder.phone}</span></div>
                <div><span className="text-gray-500">الولاية: </span><span>{viewingOrder.wilaya}</span></div>
                <div><span className="text-gray-500">البلدية: </span><span>{viewingOrder.baladiya || '-'}</span></div>
                <div><span className="text-gray-500">التوصيل: </span><span>{viewingOrder.delivery_type === 'domicile' ? 'توصيل للمنزل' : 'استلام من المكتب'}</span></div>
                <div><span className="text-gray-500">سعر التوصيل: </span><span>{Number(viewingOrder.delivery_price || 0).toFixed(2)} دج</span></div>
              </div>
              <hr className="border-gray-200" />
              <div><span className="text-gray-500">التاريخ: </span><span>{formatDate(viewingOrder.created_at)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">تعديل الطلب المتروك</h3>
              <button onClick={() => setEditingOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                  <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اللقب</label>
                  <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الولاية</label>
                  <Select value={editForm.wilaya} onValueChange={handleEditWilayaChange}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="اختر الولاية" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(wilayaData || {})
                        .sort(([codeA], [codeB]) => parseInt(codeA, 10) - parseInt(codeB, 10))
                        .map(([code, data]) => (
                          <SelectItem key={code} value={data.name}>{code} - {data.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البلدية</label>
                  <Select value={editForm.baladiya} onValueChange={(value) => setEditForm({ ...editForm, baladiya: value })} disabled={!editCommunes.length}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="اختر البلدية" />
                    </SelectTrigger>
                    <SelectContent>
                      {editCommunes.map((commune) => (
                        <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع التوصيل</label>
                  <Select value={editForm.delivery_type} onValueChange={(value) => setEditForm({ ...editForm, delivery_type: value })}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domicile">توصيل للمنزل</SelectItem>
                      <SelectItem value="stopDesk">استلام من المكتب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">سعر التوصيل (دج)</label>
                  <Input
                    type="number"
                    value={editForm.delivery_price}
                    onChange={(e) => setEditForm({ ...editForm, delivery_price: Number(e.target.value) })}
                    className="w-full h-11"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">عناصر الطلب</h4>
                <div className="space-y-4">
                  {editItems.map((item, itemIdx) => {
                    const availColors = productColorsMap[item.product_id] || [];
                    const availOffers = productOffersMap[item.product_id] || [];
                    const hasProductColors = availColors.length > 0;
                    const hasProductOffers = availOffers.length > 0;
                    return (
                    <div key={itemIdx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <span className="font-medium text-sm text-gray-900">{item.product_name}</span>
                          {hasProductOffers ? (
                            <select
                              value={item.offer_text || ''}
                              onChange={(e) => handleEditItemOfferChange(itemIdx, e.target.value, availOffers)}
                              className="mt-1 block w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145] bg-white"
                            >
                              <option value="">بدون عرض</option>
                              {(() => {
                                const currentVal = item.offer_text || '';
                                const baseOptions = availOffers.map(o => `${o.quantity} for ${o.price} DA`);
                                const matchesExisting = currentVal === '' || baseOptions.some(b => currentVal.startsWith(b));
                                const options = [];
                                if (currentVal && !matchesExisting) {
                                  options.push(<option key="__fallback" value={currentVal}>{currentVal}</option>);
                                }
                                availOffers.forEach((offer, oi) => {
                                  const base = `${offer.quantity} for ${offer.price} DA`;
                                  const display = offer.freeDelivery ? `${base} (توصيل مجاني)` : base;
                                  options.push(<option key={oi} value={base}>{display}</option>);
                                });
                                return options;
                              })()}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={item.offer_text || ''}
                              onChange={(e) => handleEditItemChange(itemIdx, 'offer_text', e.target.value)}
                              placeholder="نص العرض"
                              className="mt-1 block w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145]"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mr-3">
                          <label className="text-xs text-gray-500">الكمية:</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.quantity ?? ''}
                              onChange={(e) => handleEditItemChange(itemIdx, 'quantity', Number(e.target.value))}
                              disabled={!!item.offer_text}
                              className={`w-16 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145] ${item.offer_text ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                              min="1"
                            />
                            {item.offer_text && <span className="text-xs text-gray-400 whitespace-nowrap">(تلقائي)</span>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {hasProductColors ? (
                          <div className="flex flex-wrap gap-2">
                            {availColors.map((pc, ci) => {
                              const isSelected = (item.colors || []).some(c => c.color_name === pc.name);
                              const selectedColor = (item.colors || []).find(c => c.color_name === pc.name);
                              return (
                                <div key={ci} className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditItemToggleColor(itemIdx, pc.name, pc.hex)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-[#FA3145] text-white border-[#FA3145]'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full border border-white/30 flex-shrink-0" style={{ backgroundColor: `#${pc.hex}` }} />
                                    <span>{pc.name}</span>
                                    {isSelected && <X size={12} className="mr-1" />}
                                  </button>
                                  {isSelected && (
                                    <input
                                      type="number"
                                      value={selectedColor?.quantity ?? 1}
                                      onChange={(e) => {
                                        const ci2 = (item.colors || []).findIndex(c => c.color_name === pc.name);
                                        if (ci2 >= 0) handleEditItemColorChange(itemIdx, ci2, 'quantity', Number(e.target.value));
                                      }}
                                      className="w-12 text-xs px-1 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145]"
                                      min="1"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <>
                            {(item.colors || []).map((color, colorIdx) => (
                              <div key={colorIdx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                <input
                                  type="text"
                                  value={color.color_name ?? ''}
                                  onChange={(e) => handleEditItemColorChange(itemIdx, colorIdx, 'color_name', e.target.value)}
                                  placeholder="اسم اللون"
                                  className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145]"
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">#</span>
                                  <input
                                    type="text"
                                    value={color.color_hex ?? ''}
                                    onChange={(e) => handleEditItemColorChange(itemIdx, colorIdx, 'color_hex', e.target.value)}
                                    placeholder="رمز اللون"
                                    className="w-16 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145] font-mono"
                                  />
                                  {color.color_hex && (
                                    <span className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: `#${color.color_hex}` }} />
                                  )}
                                </div>
                                <input
                                  type="number"
                                  value={color.quantity ?? ''}
                                  onChange={(e) => handleEditItemColorChange(itemIdx, colorIdx, 'quantity', Number(e.target.value))}
                                  className="w-14 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#FA3145]"
                                  min="1"
                                  placeholder="العدد"
                                />
                                <button
                                  onClick={() => handleEditItemRemoveColor(itemIdx, colorIdx)}
                                  className="p-1 hover:bg-red-100 rounded text-red-500 cursor-pointer"
                                  title="حذف اللون"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleEditItemAddColor(itemIdx)}
                              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              + إضافة لون
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setEditingOrder(null)} disabled={isSaving} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                إلغاء
              </button>
              <button onClick={handleSaveEdit} disabled={isSaving} className={`px-6 py-2 rounded-lg text-white transition-colors ${isSaving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
