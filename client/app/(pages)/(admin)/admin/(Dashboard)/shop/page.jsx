"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Search,
  Image as ImageIcon,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { useFetchSingleProduct } from "@/components/useFetchSingleProduct";
import RichTextEditor from "@/components/RichTextEditor";
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '@/components/ui/combobox'

export default function BannerCategoriesPage() {
  const router = useRouter();
  
  // Toast state
  const [toast, setToast] = useState(null);
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState('banner');
  
  // Fetch categories from API
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    refetch: refetchCategories 
  } = useFetchSingleProduct('/api/shop/categories');

  // Fetch products for banner product link
  const { data: productsList } = useFetchSingleProduct('/api/shop/products');
  const allProducts = Array.isArray(productsList) ? productsList : (productsList?.products || []);

  // Categories state (local copy for editing)
  const [categories, setCategories] = useState([]);
  
  // New category form
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  
  // Banner images state - always initialize with 2 empty slots
  const [bannerImages, setBannerImages] = useState([
    { url: null, publicId: null, isExisting: false, file: null, linkedProductId: null },
    { url: null, publicId: null, isExisting: false, file: null, linkedProductId: null },
  ]);
  
  // Image upload state
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [pendingUploadIndex, setPendingUploadIndex] = useState(null);

  // Shop header state
  const [isHeaderLoading, setIsHeaderLoading] = useState(true);
  const [headerConfig, setHeaderConfig] = useState({
    content: '',
    backgroundColor: '#000000',
    isActive: false,
  });

  // Initialize categories from API data
  useEffect(() => {
    if (categoriesData && Array.isArray(categoriesData)) {
      setCategories(categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name,
        isExisting: true
      })));
    }
  }, [categoriesData]);

  // Fetch existing banner images on mount - handle empty case gracefully
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setIsLoadingBanners(true);
        const response = await axios.get('/api/shop/banners');
        const data = response.data;
        
        // Always ensure we have 2 banner slots, fill with DB data if available
        const newBannerImages = [
          { url: null, publicId: null, isExisting: false, file: null, linkedProductId: null },
          { url: null, publicId: null, isExisting: false, file: null, linkedProductId: null },
        ];

        if (data && data.banners && Array.isArray(data.banners) && data.banners.length > 0) {
          data.banners.forEach((banner, idx) => {
            if (idx < 2 && banner && banner.url) {
              newBannerImages[idx] = {
                url: banner.url,
                publicId: banner.public_id || banner.publicId || null,
                isExisting: true,
                file: null,
                linkedProductId: banner.linked_product_id || null,
              };
            }
          });
        }
        
        setBannerImages(newBannerImages);
      } catch (error) {
        console.error("Failed to fetch banners:", error);
        // Don't show error toast - just start with empty banners
        setBannerImages([
          { url: null, publicId: null, isExisting: false, file: null, linkedProductId: null },
          { url: null, publicId: null, isExisting: false, file: null, linkedProductId: null },
        ]);
      } finally {
        setIsLoadingBanners(false);
      }
    };

    fetchBanners();
  }, []);

  // Fetch existing header config on mount
  useEffect(() => {
    const fetchHeader = async () => {
      try {
        setIsHeaderLoading(true);
        const response = await axios.get('/api/shop/header');
        const data = response.data;
        if (data && data.content) {
          setHeaderConfig({
            content: data.content || '',
            backgroundColor: data.backgroundColor || '#000000',
            isActive: data.isActive !== false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch header:", error);
      } finally {
        setIsHeaderLoading(false);
      }
    };

    fetchHeader();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Image upload functionality
  const uploadImage = async (file, index) => {
    setUploadingIndex(index);
    setUploadProgress(0);

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    try {
      const response = await axios.post(
        "/api/cloudinary",
        formDataUpload,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      const imageUrl = response.data.data.url;
      const publicId = response.data.data.public_id;

      setBannerImages(prev => {
        const newImages = [...prev];
        newImages[index] = { 
          url: imageUrl, 
          publicId, 
          isNew: true, 
          isExisting: true,
          file: null
        };
        return newImages;
      });

      showToast(`تم رفع صورة البانر ${index === 0 ? 'الأساسي' : 'الثانوي'}`, "success");

    } catch (error) {
      console.error("Upload failed:", error);
      showToast("فشل رفع الصورة", "error");
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const index = pendingUploadIndex;
    if (index === null || index < 0 || index > 1) return;

    uploadImage(file, index);
    setPendingUploadIndex(null);
    e.target.value = '';
  };

  const triggerUpload = (index) => {
    if (index < 0 || index > 1) return;
    setPendingUploadIndex(index);
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index) => {
    setBannerImages(prev => {
      const newImages = [...prev];
      newImages[index] = { url: null, publicId: null, isExisting: false, file: null, isNew: false };
      return newImages;
    });
  };

  const DeleteImageFromDB = async (e, index, publicId, isExisting) => {
    e.stopPropagation();
    e.preventDefault();

    // First remove from UI immediately for better UX
    handleRemoveImage(index);

    // Then try to delete from Cloudinary if it was uploaded there
    if (publicId) {
      try {
        await axios.delete(`/api/cloudinary/${publicId}`);
      } catch (error) {
        console.error("Delete from Cloudinary failed:", error);
      }
    }
  };

  // Category management
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast("الرجاء إدخال اسم التصنيف", "error");
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      showToast("التصنيف موجود مسبقاً", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/shop/categories', {
        name: newCategoryName.trim()
      });

      const newCategory = {
        id: response.data.id || Date.now(),
        name: newCategoryName.trim(),
        isExisting: true,
        isNew: true
      };

      setCategories(prev => [...prev, newCategory]);
      setNewCategoryName("");
      setShowAddCategoryModal(false);
      showToast("تم إضافة التصنيف بنجاح", "success");
      
      refetchCategories?.();
    } catch (error) {
      console.error("Failed to add category:", error);
      showToast(error.response?.data?.message || "فشل إضافة التصنيف", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId, index) => {
    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    const category = categories[index];
    
    setCategories(prev => prev.filter((_, i) => i !== index));

    if (category.isExisting && categoryId) {
      try {
        
        await axios.delete(`/api/shop/categories/${categoryId}`);
        showToast("تم حذف التصنيف", "success");
        refetchCategories?.();
      } catch (error) {
        console.error("Failed to delete category:", error);
        showToast("فشل حذف التصنيف", "error");
        setCategories(prev => {
          const restored = [...prev];
          restored.splice(index, 0, category);
          return restored;
        });
      }
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = async () => {
    if (!bannerImages[0].url) {
      showToast("الرجاء رفع صورة البانر الأساسي", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const bannerData = bannerImages
        .map((img, idx) => ({
          position: idx,
          url: img.url,
          publicId: img.publicId || null,
          linkedProductId: img.linkedProductId || null,
        }))
        .filter(banner => banner.url);

      await axios.put('/api/shop/banners', {
        banners: bannerData
      });

      await axios.put('/api/shop/header', {
        content: headerConfig.content,
        backgroundColor: headerConfig.backgroundColor,
        isActive: headerConfig.isActive,
      });

      showToast("تم حفظ التغييرات بنجاح!", "success");

    } catch (error) {
      console.error("Save failed:", error);
      showToast(error.response?.data?.message || "فشل حفظ التغييرات", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/dashboard");
  };

  if (categoriesLoading || isLoadingBanners || isHeaderLoading) {
    return (
      <div className="w-full pt-6 px-9 pb-16  flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#FA3145]" />
          <p className="text-lg text-gray-600">جار التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-6 px-9 gap-6 pb-16  relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">إضافة تصنيف جديد</h3>
              <button 
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم التصنيف *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="مثال: إلكترونيات"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145] text-gray-800"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={18} />
                      إضافة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FA3145]" />
            <p className="text-lg font-medium text-gray-700">جاري حفظ التغييرات...</p>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <header className="flex items-center justify-between mb-14">
        <Link href="/admin/dashboard">
          <button className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-black" />
          </button>
        </Link>
      </header>

      {/* Tab Navigator */}
      <div className="flex gap-2 mb-8">
        {['banner', 'header', 'categories'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-white text-[#FA3145] border-b-2 border-[#FA3145] shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'banner' ? 'البانر' : tab === 'header' ? 'الهيدر' : 'التصنيفات'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-10">
        {/* Banner Section */}
        {activeTab === 'banner' && (
        <div className="flex flex-col items-start gap-12 self-stretch">
          <h1 className="text-3xl font-semibold text-black font-roboto">
            البانر
          </h1>

          {/* Images Section - Two separate banners side by side */}
          <div className="flex flex-col md:flex-row md:items-start gap-8 self-stretch">
            {/* Primary Banner - Large (REMOVED the overlay box) */}
            <div 
              onClick={() => !bannerImages[0].url && !isSubmitting && triggerUpload(0)}
              className={`w-[676px] h-[383px] rounded-xl relative overflow-hidden group flex-shrink-0 ${!isSubmitting ? "cursor-pointer" : "cursor-not-allowed opacity-50"} transition-all ${bannerImages[0].url ? '' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {uploadingIndex === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                  <div className="w-48 h-2 bg-gray-300 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FA3145] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="mt-3 text-sm text-gray-600">{uploadProgress}%</span>
                  <span className="mt-1 text-xs text-gray-500">Uploading...</span>
                </div>
              ) : bannerImages[0].url ? (
                <>
                  <Image
                    src={bannerImages[0].url}
                    alt="Primary Banner"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {!isSubmitting && (
                    <button
                      onClick={(e) => DeleteImageFromDB(e, 0, bannerImages[0].publicId, bannerImages[0].isExisting)}
                      className="absolute top-3 right-3 w-8 h-8 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md z-10"
                    >
                      <X size={16} className="text-gray-700" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                    <ImageIcon size={32} className="text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-500">إضافة البانر الرئيسي</span>
                  <span className="text-xs text-gray-400">676 × 383 (مستحسن)</span>
                </div>
              )}
            </div>

            {/* Secondary Banner - Side (standalone, no overlap) */}
            <div 
              onClick={() => !bannerImages[1].url && !isSubmitting && triggerUpload(1)}
              className={`w-[326px] h-[383px] rounded-xl relative overflow-hidden group flex-shrink-0 ${!isSubmitting ? "cursor-pointer" : "cursor-not-allowed opacity-50"} transition-all ${bannerImages[1].url ? '' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {uploadingIndex === 1 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                  <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FA3145] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="mt-2 text-sm text-gray-600">{uploadProgress}%</span>
                </div>
              ) : bannerImages[1].url ? (
                <>
                  <Image
                    src={bannerImages[1].url}
                    alt="Secondary Banner"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {!isSubmitting && (
                    <button
                      onClick={(e) => DeleteImageFromDB(e, 1, bannerImages[1].publicId, bannerImages[1].isExisting)}
                      className="absolute top-3 right-3 w-8 h-8 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md z-10"
                    >
                      <X size={16} className="text-gray-700" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                    <ImageIcon size={32} className="text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-500">إضافة البانر الثانوي</span>
                  <span className="text-xs text-gray-400">326 × 383 (مستحسن)</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Banner - Product Link Combobox */}
          <div className="w-full max-w-[676px]">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              ربط البانر الرئيسي مع منتج (اختياري)
            </label>
            <Combobox
              value={String(bannerImages[0].linkedProductId || '')}
              onValueChange={(val) => {
                const newImages = [...bannerImages];
                newImages[0] = { ...newImages[0], linkedProductId: val ? Number(val) : null };
                setBannerImages(newImages);
              }}
            >
              <ComboboxInput
                placeholder="ابحث عن منتج..."
                className="w-full [&_input]:text-right"
              />
              <ComboboxContent>
                <ComboboxList dir="rtl" className="text-right max-h-60">
                  {allProducts.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">لا توجد منتجات</div>
                  )}
                  {allProducts.map(p => (
                    <ComboboxItem key={p.id} value={String(p.id)} className="text-right">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100">
                          <Image
                            src={p.image_url || p.images?.[0]?.url}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
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
            {(() => {
              const selected = allProducts.find(p => p.id === bannerImages[0].linkedProductId);
              if (!selected) return null;
              return (
                <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
                    <Image
                      src={selected.image_url || selected.images?.[0]?.url}
                      alt={selected.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.price} دج</p>
                  </div>
                  <button
                    onClick={() => {
                      const newImages = [...bannerImages];
                      newImages[0] = { ...newImages[0], linkedProductId: null };
                      setBannerImages(newImages);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Secondary Banner - Product Link Combobox */}
          <div className="w-full max-w-[676px]">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              ربط البانر الثانوي مع منتج (اختياري)
            </label>
            <Combobox
              value={String(bannerImages[1].linkedProductId || '')}
              onValueChange={(val) => {
                const newImages = [...bannerImages];
                newImages[1] = { ...newImages[1], linkedProductId: val ? Number(val) : null };
                setBannerImages(newImages);
              }}
            >
              <ComboboxInput
                placeholder="ابحث عن منتج..."
                className="w-full [&_input]:text-right"
              />
              <ComboboxContent>
                <ComboboxList dir="rtl" className="text-right max-h-60">
                  {allProducts.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">لا توجد منتجات</div>
                  )}
                  {allProducts.map(p => (
                    <ComboboxItem key={p.id} value={String(p.id)} className="text-right">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100">
                          <Image
                            src={p.image_url || p.images?.[0]?.url}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
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
            {(() => {
              const selected = allProducts.find(p => p.id === bannerImages[1].linkedProductId);
              if (!selected) return null;
              return (
                <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
                    <Image
                      src={selected.image_url || selected.images?.[0]?.url}
                      alt={selected.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.price} دج</p>
                  </div>
                  <button
                    onClick={() => {
                      const newImages = [...bannerImages];
                      newImages[1] = { ...newImages[1], linkedProductId: null };
                      setBannerImages(newImages);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
        )}

        {/* Shop Header Section */}
        {activeTab === 'header' && (
        <div className="flex flex-col items-start gap-6 w-full max-w-[915px]">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-3xl font-semibold text-black font-roboto">
              الهيدر
            </h1>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                {headerConfig.isActive ? 'مفعل' : 'غير مفعل'}
              </span>
              <button
                type="button"
                onClick={() => setHeaderConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  headerConfig.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform cursor-pointer ${
                    headerConfig.isActive ? '-translate-x-6' : '-translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-300">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-500">معاينة حية</span>
            </div>
            <div
              style={{ backgroundColor: headerConfig.backgroundColor }}
              className="w-full text-white text-center px-4 py-3"
            >
              {headerConfig.content ? (
                <div
                  className="[&_*]:text-white max-w-7xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: headerConfig.content }}
                />
              ) : (
                <span className="text-white/60">سيظهر المحتوى هنا...</span>
              )}
            </div>
          </div>

          {/* Background Color */}
          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-medium text-gray-700">الخلفية:</label>
            <input
              type="color"
              value={headerConfig.backgroundColor}
              onChange={(e) => setHeaderConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="w-16 h-12 rounded-lg border border-gray-200 cursor-pointer"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-medium text-gray-700">المحتوى:</label>
            <RichTextEditor
              content={headerConfig.content}
              onChange={(html) => setHeaderConfig(prev => ({ ...prev, content: html }))}
            />
          </div>

        </div>
        )}

        {/* Categories Section */}
        {activeTab === 'categories' && (
        <div className="w-[676px] flex flex-col items-start gap-6">
          {/* Search and Add Category */}
          <div className="flex items-start gap-3 self-stretch">
            {/* Search Input */}
            <div className="h-11 flex justify-between items-center gap-2 px-4 flex-grow bg-gray-50 rounded-lg border border-gray-200 focus-within:border-[#FA3145] focus-within:ring-2 focus-within:ring-[#FA3145]/20 transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن تصنيف..."
                className="w-full text-base text-gray-500 bg-transparent focus:outline-none font-roboto"
              />
              <Search size={20} className="text-gray-500" />
            </div>

            {/* Add Category Button */}
            <button
              onClick={() => setShowAddCategoryModal(true)}
              disabled={isSubmitting}
              className="h-11 flex justify-center items-center gap-2 px-6 py-3 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm whitespace-nowrap"
            >
              <Plus size={16} />
              إضافة تصنيف
            </button>
          </div>

          {/* Categories List */}
          <div className="flex flex-col items-start gap-3 self-stretch w-full">
            {filteredCategories.length === 0 ? (
              <div className="w-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                {searchQuery ? "لا توجد تصنيفات تطابق بحثك" : "لا توجد تصنيفات بعد. أضف أول تصنيف!"}
              </div>
            ) : (
              filteredCategories.map((category, index) => (
                <div 
                  key={category.id || index}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-200 hover:border-[#FA3145] transition-colors group"
                >
                  <span className="text-base text-gray-800 font-medium font-roboto">
                    {category.name}
                  </span>
                  
                  <button
                    onClick={() => handleDeleteCategory(category.id, index)}
                    disabled={isSubmitting}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-[#FA3145] transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-8 py-3 bg-white border border-gray-200 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#FA3145] hover:bg-[#e02a3b] rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "تأكيد"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}