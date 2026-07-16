"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Pencil,
  Save,
  Search,
  X,
  ChevronDown,
  Globe,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Select as BaseSelect } from '@base-ui/react/select';
import { useAdminWilayas, useDeliveryStats } from "@/components/useFetchWilayas";
import CustomSelect from "@/components/CustomSelect";

const STATUS_OPTIONS = [
  { value: 'all', label: 'جميع الحالات', color: '#6B7280' },
  { value: 'active', label: 'مفعَّلة', color: '#16A34A' },
  { value: 'inactive', label: 'غير مفعَّلة', color: '#DC2626' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'جميع الأنواع', color: '#6B7280' },
  { value: 'paid', label: 'مدفوع', color: '#EA580C' },
  { value: 'free', label: 'مجاني', color: '#16A34A' },
];

const DELIVERY_TYPE_OPTIONS = [
  { value: 'false', label: 'مدفوع', color: '#EA580C' },
  { value: 'true', label: 'مجاني', color: '#16A34A' },
];

const STATUS_TOGGLE_OPTIONS = [
  { value: 'true', label: 'مفعَّلة', color: '#16A34A' },
  { value: 'false', label: 'غير مفعَّلة', color: '#DC2626' },
];

const baseSelectTriggerClass = "flex w-full h-11 items-center justify-between rounded-xl border border-stroke bg-white px-4 text-right text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FA3145]/20 focus:border-[#FA3145] data-[open]:ring-2 data-[open]:ring-[#FA3145]/20 data-[open]:border-[#FA3145]";

export default function DeliveryPage() {
  const router = useRouter();
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: wilayas, isLoading, refetch } = useAdminWilayas();
  const { data: stats, isLoading: statsLoading } = useDeliveryStats();

  const [edits, setEdits] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (wilayas && Array.isArray(wilayas)) {
      const initial = {};
      wilayas.forEach(w => {
        initial[w.code] = {
          home_delivery_price: Number(w.home_delivery_price) || 0,
          stopdesk_delivery_price: Number(w.stopdesk_delivery_price) || 0,
          free_delivery: Boolean(w.free_delivery),
          is_active: Boolean(w.is_active),
          changed: false
        };
      });
      setEdits(initial);
    }
  }, [wilayas]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateField = (code, field, value) => {
    setEdits(prev => ({
      ...prev,
      [code]: { ...prev[code], [field]: value, changed: true }
    }));
  };

  const filteredWilayas = useMemo(() => {
    if (!wilayas || !Array.isArray(wilayas)) return [];
    return wilayas.filter(w => {
      const edit = edits[w.code] || {};
      const isActive = edit.changed ? edit.is_active : Boolean(w.is_active);
      const isFree = edit.changed ? edit.free_delivery : Boolean(w.free_delivery);

      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (typeFilter === "paid" && isFree) return false;
      if (typeFilter === "free" && !isFree) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = w.code.includes(q);
        const matchName = w.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }

      return true;
    });
  }, [wilayas, edits, statusFilter, typeFilter, searchQuery]);

  const handleSaveAll = async () => {
    const changed = Object.entries(edits)
      .filter(([_, e]) => e.changed)
      .map(([code, e]) => ({
        code,
        home_delivery_price: Number(e.home_delivery_price),
        stopdesk_delivery_price: Number(e.stopdesk_delivery_price),
        free_delivery: e.free_delivery,
        is_active: e.is_active
      }));

    if (changed.length === 0) {
      showToast("لا توجد تغييرات للحفظ", "error");
      return;
    }

    setIsSaving(true);
    try {
      await axios.put('/api/shop/delivery/wilayas', { wilayas: changed });
      showToast("تم حفظ التغييرات بنجاح", "success");
      setEdits(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = { ...next[k], changed: false }; });
        return next;
      });
      refetch();
    } catch (error) {
      showToast(error.response?.data?.message || "فشل الحفظ", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || statsLoading) {
    return (
      <div className="w-full pt-6 px-9 pb-16 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#FA3145]" />
          <p className="text-lg text-gray-600">جار التحميل...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "إجمالي الولايات", value: stats?.total || 0, color: "bg-blue-500", icon: Globe },
    { label: "الولايات المفعّلة", value: stats?.active || 0, color: "bg-green-500", icon: CheckCircle },
    { label: "الولايات الغير مفعّلة", value: stats?.inactive || 0, color: "bg-red-500", icon: XCircle },
  ];

  return (
    <div className="w-full pt-6 px-9 pb-16 relative">
      {toast && (
        <div
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
        >
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
        <Link href="/admin/dashboard">
          <button className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-black" />
          </button>
        </Link>
      </header>

      <h1 className="text-3xl font-semibold text-black mb-10">التوصيل</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {statCards.map((card, idx) => {
          const CardIcon = card.icon;
          return (
            <div key={idx} className="bg-white border-2 border-gray-100 rounded-xl p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`w-14 h-14 ${card.color} rounded-xl flex items-center justify-center`}>
                <CardIcon size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col flex-[2] min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">بحث</label>
          <div className="h-11 flex items-center gap-2 px-4 bg-white rounded-xl border border-stroke focus-within:ring-2 focus-within:ring-[#FA3145]/20 focus-within:border-[#FA3145] transition-all">
            <Search size={20} className="text-gray-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث عن ولاية..."
              className="w-full text-base text-gray-500 bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
          <BaseSelect.Root dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>
            <BaseSelect.Trigger className={baseSelectTriggerClass}>
              <BaseSelect.Value placeholder="جميع الحالات">
                {(value) => {
                  const s = STATUS_OPTIONS.find(o => o.value === value);
                  return s ? s.label : 'جميع الحالات';
                }}
              </BaseSelect.Value>
              <ChevronDown size={16} className="text-gray-500 shrink-0" />
            </BaseSelect.Trigger>
            <BaseSelect.Portal>
              <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-stroke bg-white py-2 shadow-lg"
                  style={{ width: 'var(--anchor-width)' }}>
                  <BaseSelect.List>
                    {STATUS_OPTIONS.map(s => (
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

        <div className="flex flex-col min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">نوع التوصيل</label>
          <BaseSelect.Root dir="rtl" value={typeFilter} onValueChange={setTypeFilter}>
            <BaseSelect.Trigger className={baseSelectTriggerClass}>
              <BaseSelect.Value placeholder="جميع الأنواع">
                {(value) => {
                  const t = TYPE_OPTIONS.find(o => o.value === value);
                  return t ? t.label : 'جميع الأنواع';
                }}
              </BaseSelect.Value>
              <ChevronDown size={16} className="text-gray-500 shrink-0" />
            </BaseSelect.Trigger>
            <BaseSelect.Portal>
              <BaseSelect.Positioner side="bottom" align="start" alignItemWithTrigger={false} className="z-50">
                <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-stroke bg-white py-2 shadow-lg"
                  style={{ width: 'var(--anchor-width)' }}>
                  <BaseSelect.List>
                    {TYPE_OPTIONS.map(t => (
                      <BaseSelect.Item key={t.value} value={t.value}
                        className="flex cursor-pointer [direction:rtl] items-center justify-between px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 data-[selected]:text-[#FA3145]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                          <BaseSelect.ItemText>{t.label}</BaseSelect.ItemText>
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

      {/* Table */}
      {filteredWilayas.length === 0 ? (
        <div className="w-full py-16 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-400 mb-1">لا توجد ولايات تطابق بحثك</p>
          <p className="text-sm text-gray-400">حاول تغيير معايير البحث أو إعادة تعيين الفلاتر</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الولاية</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">سعر التوصيل للمنزل</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">سعر التوصيل للنقطة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">نوع التوصيل</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredWilayas.map((w, idx) => {
                const edit = edits[w.code] || {};
                const homePrice = edit.changed ? edit.home_delivery_price : (Number(w.home_delivery_price) || 0);
                const stopPrice = edit.changed ? edit.stopdesk_delivery_price : (Number(w.stopdesk_delivery_price) || 0);
                const isFree = edit.changed ? edit.free_delivery : Boolean(w.free_delivery);
                const isActive = edit.changed ? edit.is_active : Boolean(w.is_active);

                return (
                  <tr key={w.code} className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-gray-800">
                          {w.code} - {w.name}
                        </span>
                        <Link
                          href={`/admin/delivery/manage-stopdesk?code=${w.code}`}
                          className="inline-flex items-center gap-1 text-sm text-[#FA3145] hover:text-[#e02a3b] underline underline-offset-2 mt-1"
                        >
                          <Pencil size={14} />
                          إدارة نقطة التوصيل
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={homePrice}
                          onChange={e => updateField(w.code, 'home_delivery_price', parseInt(e.target.value) || 0)}
                          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145]/20 text-sm"
                        />
                        <span className="text-sm text-gray-500">د.ج</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={stopPrice}
                          onChange={e => updateField(w.code, 'stopdesk_delivery_price', parseInt(e.target.value) || 0)}
                          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145]/20 text-sm"
                        />
                        <span className="text-sm text-gray-500">د.ج</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <CustomSelect
                        value={String(isFree)}
                        onChange={(val) => updateField(w.code, 'free_delivery', val === 'true')}
                        options={DELIVERY_TYPE_OPTIONS}
                        isUpdating={false}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <CustomSelect
                        value={String(isActive)}
                        onChange={(val) => updateField(w.code, 'is_active', val === 'true')}
                        options={STATUS_TOGGLE_OPTIONS}
                        isUpdating={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-start mt-8">
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-8 py-3 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          حفظ الكل
        </button>
      </div>
    </div>
  );
}
