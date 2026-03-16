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
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useFetchSingleProduct } from "@/components/useFetchSingleProduct";

export default function BannerCategoriesPage() {
  const router = useRouter();
  
  // Toast state
  const [toast, setToast] = useState(null);
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  
  // Fetch categories from API
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    refetch: refetchCategories 
  } = useFetchSingleProduct('http://localhost:5000/api/shop/get-categories');

  // Categories state (local copy for editing)
  const [categories, setCategories] = useState([]);
  
  // New category form
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  
  // Banner images state - always initialize with 2 empty slots
  const [bannerImages, setBannerImages] = useState([
    { url: null, publicId: null, isExisting: false, file: null }, // Primary (index 0)
    { url: null, publicId: null, isExisting: false, file: null }, // Secondary (index 1)
  ]);
  
  // Image upload state
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [pendingUploadIndex, setPendingUploadIndex] = useState(null);

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
        const response = await axios.get('http://localhost:5000/api/shop/get-banners');
        const data = response.data;
        
        // Always ensure we have 2 banner slots, fill with DB data if available
        const newBannerImages = [
          { url: null, publicId: null, isExisting: false, file: null },
          { url: null, publicId: null, isExisting: false, file: null },
        ];

        if (data && data.banners && Array.isArray(data.banners) && data.banners.length > 0) {
          data.banners.forEach((banner, idx) => {
            if (idx < 2 && banner && banner.url) {
              newBannerImages[idx] = {
                url: banner.url,
                publicId: banner.public_id || banner.publicId || null,
                isExisting: true,
                file: null
              };
            }
          });
        }
        
        setBannerImages(newBannerImages);
      } catch (error) {
        console.error("Failed to fetch banners:", error);
        // Don't show error toast - just start with empty banners
        setBannerImages([
          { url: null, publicId: null, isExisting: false, file: null },
          { url: null, publicId: null, isExisting: false, file: null },
        ]);
      } finally {
        setIsLoadingBanners(false);
      }
    };

    fetchBanners();
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
        "http://localhost:5000/cloudinary/upload",
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

      showToast(`Banner ${index === 0 ? 'primary' : 'secondary'} image uploaded`, "success");

    } catch (error) {
      console.error("Upload failed:", error);
      showToast("Failed to upload image", "error");
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
        await axios.delete(`http://localhost:5000/cloudinary/delete/${publicId}`);
      } catch (error) {
        console.error("Delete from Cloudinary failed:", error);
      }
    }
  };

  // Category management
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast("Please enter a category name", "error");
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      showToast("Category already exists", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('http://localhost:5000/api/shop/add-category', {
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
      showToast("Category added successfully", "success");
      
      refetchCategories?.();
    } catch (error) {
      console.error("Failed to add category:", error);
      showToast(error.response?.data?.message || "Failed to add category", "error");
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
        await axios.delete(`http://localhost:5000/api/shop/delete-category/${categoryId}`);
        showToast("Category deleted", "success");
        refetchCategories?.();
      } catch (error) {
        console.error("Failed to delete category:", error);
        showToast("Failed to delete category", "error");
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
      showToast("Please upload a primary banner image", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const bannerData = bannerImages
        .map((img, idx) => ({
          position: idx,
          url: img.url,
          publicId: img.publicId || null
        }))
        .filter(banner => banner.url);

      await axios.put('http://localhost:5000/api/shop/update-banners', {
        banners: bannerData
      });

      showToast("Banners saved successfully!", "success");
      
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1500);

    } catch (error) {
      console.error("Save failed:", error);
      showToast(error.response?.data?.message || "Failed to save banners", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/dashboard");
  };

  if (categoriesLoading || isLoadingBanners) {
    return (
      <div className="w-full pt-6 px-9 pb-16 ml-64 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#FA3145]" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-6 px-9 gap-6 pb-16 ml-64 relative">
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
              <h3 className="text-lg font-semibold text-gray-900">Add New Category</h3>
              <button 
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Electronics"
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
                  Cancel
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
                      Add
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
            <p className="text-lg font-medium text-gray-700">Saving changes...</p>
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

      <div className="flex flex-col gap-10">
        {/* Banner Section */}
        <div className="flex flex-col items-start gap-12 self-stretch">
          <h1 className="text-3xl font-semibold text-black font-roboto">
            Banner
          </h1>

          {/* Images Section - Two separate banners side by side */}
          <div className="flex items-center gap-8 self-stretch">
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
                  <img 
                    src={bannerImages[0].url} 
                    alt="Primary Banner" 
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
                  <span className="text-sm text-gray-500">Add Main Banner</span>
                  <span className="text-xs text-gray-400">676 x 383 recommended</span>
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
                  <img 
                    src={bannerImages[1].url} 
                    alt="Secondary Banner" 
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
                  <span className="text-sm text-gray-500">Add Secondary Banner</span>
                  <span className="text-xs text-gray-400">326 x 383 recommended</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="w-[676px] flex flex-col items-start gap-6">
          {/* Search and Add Category */}
          <div className="flex items-start gap-3 self-stretch">
            {/* Search Input */}
            <div className="h-11 flex justify-between items-center gap-2 px-4 flex-grow bg-gray-50 rounded-lg border border-gray-200 focus-within:border-[#FA3145] focus-within:ring-2 focus-within:ring-[#FA3145]/20 transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Category ..."
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
              Add Category
            </button>
          </div>

          {/* Categories List */}
          <div className="flex flex-col items-start gap-3 self-stretch w-full">
            {filteredCategories.length === 0 ? (
              <div className="w-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                {searchQuery ? "No categories found matching your search" : "No categories yet. Add your first category!"}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-8 py-3 bg-white border border-gray-200 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#FA3145] hover:bg-[#e02a3b] rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}