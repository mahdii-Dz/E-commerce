"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Trash2, Plus, Minus, Percent, X, CheckCircle, AlertCircle, Loader2, Sparkles, Truck, GripVertical, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSwappingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import axios from "axios";
import { useFetchSingleProduct } from "@/components/useFetchSingleProduct";
import AdminTestimonialForm from "@/components/AdminTestimonialForm";
import RichTextEditor from "@/components/RichTextEditor";

export default function AddProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [createdProductId, setCreatedProductId] = useState(null);
  const { data: categories, isLoading: loading, error } = useFetchSingleProduct('/api/shop/categories');

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    big_description: "",
    category: [],
    price: "",
    discount: "",
    type: "",
  });
  const [ComparePrice,setComparePrice] = useState("");

  // Colors state - array of objects { name: string, hex: string, image: string }
  const [colors, setColors] = useState([]);
  const [showColorModal, setShowColorModal] = useState(false);
  const [colorForm, setColorForm] = useState({ name: "", hex: "#000000", image: "" });

  const [images, setImages] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const fileInputRef = useRef(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Landing page image state
  const [landingPageImage, setLandingPageImage] = useState(null);
  const landingPageInputRef = useRef(null);
  const [isUploadingLanding, setIsUploadingLanding] = useState(false);

  // Offers state
  const [offers, setOffers] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ quantity: '', price: '', savedMoney: 0, isBestOffer: false, freeDelivery: false });


  useEffect(() => {
    const imageUrl = images[0]?.url || "";
    setThumbnailUrl(imageUrl.replace('/upload/', '/upload/w_800,h_800,c_fill,f_auto,q_auto/'));
  }, [images])

  // Combobox anchor for categories
  const categoryAnchor = useComboboxAnchor();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Color management functions
  const openColorModal = () => {
    setColorForm({ name: "", hex: "#000000", image: "" });
    setShowColorModal(true);
  };

  const closeColorModal = () => {
    setShowColorModal(false);
    setColorForm({ name: "", hex: "#000000", image: "" });
  };

  const handleAddColor = () => {
    if (!colorForm.name.trim()) {
      showToast("الرجاء إدخال اسم اللون", "error");
      return;
    }

    if (!colorForm.image) {
      showToast("الرجاء اختيار صورة لهذا اللون", "error");
      return;
    }

    // Remove # from hex if present for storage
    const hexValue = colorForm.hex.replace("#", "");

    setColors(prev => [...prev, { name: colorForm.name.trim(), hex: hexValue, image: colorForm.image }]);
    closeColorModal();
  };

  const handleRemoveColor = (index) => {
    setColors(prev => prev.filter((_, i) => i !== index));
  };

  // Offer management
  const openOfferModal = () => {
    setOfferForm({ quantity: '', price: '', savedMoney: 0, isBestOffer: false, freeDelivery: false });
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setOfferForm({ quantity: '', price: '', savedMoney: 0, isBestOffer: false, freeDelivery: false });
  };

  const handleOfferInputChange = (field, value) => {
    if (field === 'quantity' || field === 'price') {
      const numValue = parseFloat(value) || 0;
      setOfferForm(prev => {
        const newForm = { ...prev, [field]: numValue };
        // Calculate saved money if we have both quantity and product price
        if (field === 'quantity' || field === 'price') {
          const regularTotal = (newForm.quantity || 0) * parseFloat(formData.price || 0);
          const offerTotal = newForm.price || 0;
          newForm.savedMoney = Math.max(0, regularTotal - offerTotal);
        }
        return newForm;
      });
    }
  };

  const handleAddOffer = () => {
    if (!offerForm.quantity || offerForm.quantity <= 0) {
      showToast("الرجاء إدخال كمية صالحة", "error");
      return;
    }
    if (!offerForm.price || offerForm.price <= 0) {
      showToast("الرجاء إدخال سعر صالح", "error");
      return;
    }

    const newOffer = {
      id: crypto.randomUUID(),
      quantity: parseInt(offerForm.quantity),
      price: parseFloat(offerForm.price),
      savedMoney: Math.round(offerForm.savedMoney),
      isBestOffer: offerForm.isBestOffer,
      freeDelivery: offerForm.freeDelivery,
    };

    setOffers(prev => [...prev, newOffer]);
    closeOfferModal();
  };

  const handleRemoveOffer = (offerId) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  const handleToggleOfferFlag = (offerId, flag) => {
    setOffers(prev => prev.map(o =>
      o.id === offerId ? { ...o, [flag]: !o[flag] } : o
    ));
  };

  const handleOfferDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOffers(prev => {
      const oldIndex = prev.findIndex(o => o.id === active.id);
      const newIndex = prev.findIndex(o => o.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      publicId: null,
      status: 'local'
    }));

    setImages(prev => [...prev, ...newImages]);
    e.target.value = '';
  };

  const handleLandingPageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLandingPageImage({
      file,
      url: URL.createObjectURL(file),
      publicId: null,
      status: 'local'
    });
    e.target.value = '';
  };

  const handleDeleteLandingPageImage = () => {
    if (landingPageImage?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(landingPageImage.url);
    }
    if (landingPageImage?.publicId) {
      axios.delete(`/api/cloudinary/${landingPageImage.publicId}`).catch(() => {});
    }
    setLandingPageImage(null);
  };

  const handleDeleteImage = async (e, id) => {
    e.stopPropagation();
    const img = images.find(i => i.id === id);
    if (!img) return;

    if (img.url?.startsWith('blob:')) {
      URL.revokeObjectURL(img.url);
    }

    setImages(prev => prev.filter(i => i.id !== id));

    if (img.publicId) {
      try {
        await axios.delete(`/api/cloudinary/${img.publicId}`);
      } catch (error) {
        console.error("Delete failed:", error);
        showToast("فشل حذف الصورة من الخادم", "error");
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      showToast("الرجاء رفع صورة واحدة على الأقل", "error");
      return;
    }

    if (!formData.title || !formData.price) {
      showToast("الرجاء ملء الحقول المطلوبة", "error");
      return;
    }

    if (formData.category.length === 0) {
      showToast("الرجاء اختيار تصنيف واحد على الأقل", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImages = [...images];

      const localImages = images.filter(img => img.status === 'local');
      if (localImages.length > 0) {
        setIsUploadingImages(true);

        for (let i = 0; i < localImages.length; i++) {
          setUploadStatusText(`Uploading ${i + 1}/${localImages.length}...`);

          const formDataUpload = new FormData();
          formDataUpload.append("image", localImages[i].file);

          const response = await axios.post("/api/cloudinary", formDataUpload, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const uploadedUrl = response.data.data.url;
          const uploadedPublicId = response.data.data.public_id;

          finalImages = finalImages.map(img =>
            img.id === localImages[i].id
              ? { ...img, url: uploadedUrl, publicId: uploadedPublicId, status: 'uploaded', file: null }
              : img
          );

          setOverallProgress(((i + 1) / localImages.length) * 100);
        }

        setIsUploadingImages(false);
      }

      // Upload landing page image if local
      let finalLandingPageUrl = landingPageImage?.url || null;
      if (landingPageImage?.status === 'local') {
        setIsUploadingLanding(true);
        const formDataLanding = new FormData();
        formDataLanding.append("image", landingPageImage.file);
        const response = await axios.post("/api/cloudinary", formDataLanding, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalLandingPageUrl = response.data.data.url;
        setLandingPageImage(prev => ({ ...prev, publicId: response.data.data.public_id }));
        setIsUploadingLanding(false);
      }

      // Get category IDs from selected category names
      const selectedCategoryIds = categories
        ?.filter(cat => formData.category.includes(cat.name))
        .map(cat => cat.id);

      const response = await axios.post("/api/shop/products", {
        name: formData.title,
        description: formData.description,
        big_description: formData.big_description || null,
        price: parseFloat(formData.price),
        categoryIds: selectedCategoryIds,
        type: formData.type,
        compare_price: parseFloat(ComparePrice) || 0,
        discount_percentage: parseFloat(formData.discount) || 0,
        images: finalImages.map(img => ({ url: img.url, public_id: img.publicId || null })),
        thumbnail: thumbnailUrl,
        landing_page_image: finalLandingPageUrl,
        colors: colors,
        offers: offers,
      });

      showToast("تم إضافة المنتج بنجاح!", "success");
      setCreatedProductId(response.data.id);

    } catch (error) {
      console.error("Submit failed:", error);
      showToast(error.response?.data?.message || "فشل إضافة المنتج", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare category items for combobox
  const categoryItems = categories?.map(cat => cat.name) || [];

  return (
    <div className="w-full pt-6 px-9 gap-6 pb-16 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Color Add Modal */}
      {showColorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">إضافة لون</h3>
              <button
                onClick={closeColorModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم اللون *</label>
                <input
                  type="text"
                  value={colorForm.name}
                  onChange={(e) => setColorForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: أسود منتصف الليل"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145] text-gray-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اختيار اللون</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorForm.hex}
                    onChange={(e) => setColorForm(prev => ({ ...prev, hex: e.target.value }))}
                    className="w-16 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 font-mono">{colorForm.hex}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">صورة المنتج لهذا اللون *</label>
                {images.length === 0 ? (
                  <p className="text-sm text-gray-400">قم برفع صور المنتج أولاً</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-xl">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setColorForm(prev => ({ ...prev, image: img.url }))}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          colorForm.image === img.url
                            ? "border-[#FA3145] ring-2 ring-[#FA3145]/30"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={closeColorModal}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddColor}
                  className="flex-1 px-4 py-3 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-xl transition-colors font-medium"
                >
                  إضافة اللون
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Add Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">إضافة عرض</h3>
              <button
                onClick={closeOfferModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الكمية *</label>
                <input
                  type="number"
                  min="1"
                  value={offerForm.quantity}
                  onChange={(e) => handleOfferInputChange('quantity', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145] text-gray-800"
                  placeholder="e.g., 2"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر الإجمالي (دج) *</label>
                <input
                  type="number"
                  min="1"
                  value={offerForm.price}
                  onChange={(e) => handleOfferInputChange('price', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA3145] text-gray-800"
                  placeholder="e.g., 5000"
                />
              </div>

              {offerForm.savedMoney > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium text-sm">
                    التوفير: {offerForm.savedMoney} دج
                  </p>
                </div>
              )}

              {/* Offer flags */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={offerForm.isBestOffer}
                    onChange={(e) => setOfferForm(prev => ({ ...prev, isBestOffer: e.target.checked }))}
                    className="w-4 h-4 accent-[#FA3145]"
                  />
                  <Sparkles size={16} className="text-amber-500" />
                  <span className="text-sm text-gray-700">أفضل عرض</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={offerForm.freeDelivery}
                    onChange={(e) => setOfferForm(prev => ({ ...prev, freeDelivery: e.target.checked }))}
                    className="w-4 h-4 accent-[#FA3145]"
                  />
                  <Truck size={16} className="text-blue-500" />
                  <span className="text-sm text-gray-700">توصيل مجاني</span>
                </label>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={closeOfferModal}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddOffer}
                  className="flex-1 px-4 py-3 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-xl transition-colors font-medium"
                >
                  إضافة العرض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={landingPageInputRef}
        type="file"
        accept="image/*"
        onChange={handleLandingPageSelect}
        className="hidden"
      />

      <header className="flex items-center justify-between mb-14">
        <Link href="/admin/all-products">
          <button className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowRight size={20} className="text-black" />
          </button>
        </Link>

      </header>

      <div className="flex flex-col gap-10">
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-lg font-semibold text-black">صور المنتج:</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer text-sm"
            >
              <Upload size={16} />
              <span>إضافة صور</span>
            </button>
          </div>
          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-[494px] aspect-[494/415] bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden group cursor-pointer hover:bg-gray-300 transition-colors"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Upload size={32} className="text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">إضافة صور</span>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map(i => i.id)} strategy={rectSwappingStrategy}>
                <div className="flex gap-6">
                  <SortableImage
                    image={images[0]}
                    position={1}
                    isSubmitting={isSubmitting}
                    onDelete={handleDeleteImage}
                    variant="main"
                  />
                  {images.length > 1 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start flex-1">
                      {images.slice(1).map((img, idx) => (
                        <SortableImage
                          key={img.id}
                          image={img}
                          position={idx + 2}
                          isSubmitting={isSubmitting}
                          onDelete={handleDeleteImage}
                          variant="grid"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Landing Page Image Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-lg font-semibold text-black">صورة صفحة الهبوط (Landing Page):</label>
            {!landingPageImage && (
              <button
                onClick={() => landingPageInputRef.current?.click()}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer text-sm"
              >
                <Upload size={16} />
                <span>إضافة صورة</span>
              </button>
            )}
          </div>
          {landingPageImage ? (
            <div className="relative w-full max-w-[494px] rounded-xl overflow-hidden group bg-gray-200">
              <img
                src={landingPageImage.url}
                alt="Landing page"
                className="w-full object-cover"
              />
              {!isSubmitting && (
                <button
                  onClick={handleDeleteLandingPageImage}
                  className="absolute top-3 right-3 w-8 h-8 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <X size={16} className="text-gray-700" />
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => landingPageInputRef.current?.click()}
              className="w-full max-w-[494px] aspect-[494/200] bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden group cursor-pointer hover:bg-gray-300 transition-colors"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Upload size={32} className="text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">إضافة صورة</span>
              </div>
            </div>
          )}
          {isUploadingLanding && (
            <p className="text-sm text-gray-600 mt-2">جاري رفع الصورة...</p>
          )}
        </div>

        <div className="flex flex-col gap-6 w-full max-w-[915px]">
          <div className="flex flex-col gap-3 w-full">
            <label className="text-lg font-semibold text-black">العنوان: <span className="text-red-500">*</span></label>
            <textarea
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="عنوان المنتج..."
              disabled={isSubmitting}
              className="w-full p-5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
          </div>

          {/* Colors Section */}
          <div className="flex flex-col gap-3 w-full">
            <label className="text-lg font-semibold text-black">الألوان:</label>
            <div className="flex flex-wrap gap-3">
              {/* Existing colors */}
              {colors.map((color, index) => (
                <div
                  key={index}
                  className="relative group w-14 h-14 rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <img
                    src={color.image}
                    alt={color.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div
                    className="w-full h-full items-center justify-center hidden"
                    style={{ backgroundColor: `#${color.hex}` }}
                  />
                  {!isSubmitting && (
                    <button
                      onClick={() => handleRemoveColor(index)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add color button - circular with plus icon */}
              <button
                onClick={openColorModal}
                disabled={isSubmitting}
                className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#FA3145] hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={24} className="text-gray-400 group-hover:text-[#FA3145]" />
              </button>
            </div>

            {/* Color names list */}
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {colors.map((color, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `#${color.hex}` }}
                    />
                    {color.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <label className="text-lg font-semibold text-black">الوصف:</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="وصف المنتج..."
              disabled={isSubmitting}
              className="w-full p-5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={5}
            />
          </div>

          {/* Big Description (TipTap Rich Text) */}
          <div className="flex flex-col gap-3 w-full">
            <label className="text-lg font-semibold text-black">الوصف الطويل:</label>
            <RichTextEditor
              content={formData.big_description}
              onChange={(html) => handleChange("big_description", html)}
            />
          </div>

          {/* Multiple Category Selection with Combobox */}
          <div className="flex flex-col gap-3 w-full">
            <label className="text-lg font-semibold text-black">التصنيفات: <span className="text-red-500">*</span></label>
            {loading ? (
              <div className="w-full h-14 bg-gray-100 rounded-xl flex items-center px-5 text-gray-500">
                جاري تحميل التصنيفات...
              </div>
            ) : (
              <Combobox
                multiple
                autoHighlight
                items={categoryItems}
                value={formData.category}
                onValueChange={(value) => handleChange("category", value)}
                disabled={isSubmitting}
              >
                <ComboboxChips ref={categoryAnchor} className="w-full min-h-[56px] bg-white border border-gray-200 rounded-xl px-5 py-3 focus-within:ring-2 focus-within:ring-[#FA3145] disabled:bg-gray-100">
                  <ComboboxValue>
                    {(values) => (
                      <>
                        {values.map((value) => (
                          <ComboboxChip key={value} className="bg-[#FA3145]/10 text-[#FA3145] border-[#FA3145]/20">
                            {value}
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput placeholder="اختر التصنيفات..." />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={categoryAnchor}>
                  <ComboboxEmpty>لا توجد تصنيفات.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          </div>

          {/* Offers Section */}
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold text-black">Offers (عروض):</label>
              <button
                onClick={openOfferModal}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Plus size={18} />
                <span>إضافة عرض</span>
              </button>
            </div>

            {offers.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOfferDragEnd}>
                <SortableContext items={offers.map(o => o.id)} strategy={rectSwappingStrategy}>
                  <div className="flex flex-col gap-2">
                    {offers.map((offer) => (
                      <SortableOffer
                        key={offer.id}
                        offer={offer}
                        isSubmitting={isSubmitting}
                        onRemove={handleRemoveOffer}
                        onToggle={handleToggleOfferFlag}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="flex items-center gap-6 w-full">
            <div className="flex flex-col gap-3 flex-1">
              <label className="text-lg font-semibold text-black">سعر البيع: <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0"
                disabled={isSubmitting}
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#FA3145] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-3 ">
              <label className="text-lg font-semibold text-black">سعر المقارنة:</label>
              <input
                type="number"
                value={ComparePrice}
                onChange={(e) => {
                  setComparePrice(e.target.value)
                  handleChange("discount", Math.floor(100 - (formData.price / e.target.value) * 100))
                }}
                placeholder="0"
                disabled={isSubmitting}
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#FA3145] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

          </div>
            <div className="flex flex-col gap-3 w-[246px]">
              <label className="text-lg font-semibold text-black text-center">الخصم</label>
              <div className="flex items-center px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <input
                  type="number"
                  value={formData.discount}
                  // onChange={(e) => handleChange("discount", e.target.value)}
                  placeholder="0"
                  disabled
                  className="w-full text-base text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Percent size={20} className="text-gray-600 mr-2" />
              </div>
            </div>

          <div className="flex flex-col gap-3 w-full">
            <label className="text-lg font-semibold text-black">النوع:</label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange("type", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full h-14! bg-white rounded-xl border-gray-200 disabled:bg-gray-100">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="BestDeal">أفضل صفقة</SelectItem>
                  <SelectItem value="Featured">مميز</SelectItem>
                  <SelectItem value="NewArrival">وصل حديثاً</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/admin/all-products">
              <button disabled={isSubmitting} className="px-12 py-3 bg-white border cursor-pointer border-gray-200 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                إلغاء
              </button>
            </Link>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-12 py-3 bg-[#FA3145] hover:bg-[#e02a3b] cursor-pointer rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isUploadingImages ? uploadStatusText : 'جاري الإضافة...'}
                </>
              ) : (
                "تأكيد"
              )}
            </button>
          </div>

          {/* Upload Progress Bar */}
          {isUploadingImages && (
            <div className="w-full mt-4">
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FA3145] transition-all duration-300 rounded-full"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">{uploadStatusText}</p>
            </div>
          )}
        </div>

        {/* Admin Testimonial for new product */}
        {createdProductId && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">أضف شهادة إدارية لهذا المنتج</h2>
              <button
                onClick={() => {
                  setCreatedProductId(null);
                  router.push("/admin/all-products");
                }}
                className="text-sm text-gray-500 hover:text-primary transition-colors"
              >
                تخطي والعودة للقائمة
              </button>
            </div>
            <AdminTestimonialForm productId={createdProductId} />
          </div>
        )}
      </div>
    </div>
  );
}

function SortableImage({ image, position, isSubmitting, onDelete, variant }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  if (variant === 'main') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`relative w-full max-w-[494px] aspect-[494/415] bg-gray-200 rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing transition-colors`}
      >
        <img
          src={image.url}
          alt="Main"
          className="w-full h-full object-cover border border-gray-200 rounded-xl pointer-events-none"
        />
        <div className="absolute top-3 left-3 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">{position}</span>
        </div>
        {!isSubmitting && (
          <button
            onClick={(e) => onDelete(e, image.id)}
            className="absolute top-3 right-3 w-8 h-8 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
          >
            <X size={16} className="text-gray-700 pointer-events-none" />
          </button>
        )}
        <div className="absolute bottom-3 left-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-gray-600" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative w-full aspect-square rounded-xl overflow-hidden group bg-gray-200 cursor-grab active:cursor-grabbing transition-colors`}
    >
      <img
        src={image.url}
        alt={`Product ${position}`}
        className="w-full h-full object-cover border border-gray-200 rounded-xl pointer-events-none"
      />
      <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
        <span className="text-white text-[10px] font-bold">{position}</span>
      </div>
      {!isSubmitting && (
        <button
          onClick={(e) => onDelete(e, image.id)}
          className="absolute top-1.5 right-1.5 w-6 h-6 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
        >
          <X size={14} className="text-gray-700 pointer-events-none" />
        </button>
      )}
      <div className="absolute bottom-1.5 left-1.5 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={12} className="text-gray-600" />
      </div>
    </div>
  );
}

function SortableOffer({ offer, isSubmitting, onRemove, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: offer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex items-center gap-3 flex-1 min-w-0">
        <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-800 whitespace-nowrap">
              اشتري {offer.quantity} بسعر {offer.price} DA
            </p>
            {offer.isBestOffer && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={12} />
                أفضل عرض
              </span>
            )}
            {offer.freeDelivery && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Truck size={12} />
                توصيل مجاني
              </span>
            )}
          </div>
          {offer.savedMoney > 0 && (
            <p className="text-sm text-green-600">وفر {offer.savedMoney} DA</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onToggle(offer.id, 'isBestOffer')}
          className={`p-1.5 rounded-lg transition-colors ${
            offer.isBestOffer
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50'
          }`}
          title={offer.isBestOffer ? 'إلغاء أفضل عرض' : 'تعيين كأفضل عرض'}
        >
          <Sparkles size={16} />
        </button>
        <button
          type="button"
          onClick={() => onToggle(offer.id, 'freeDelivery')}
          className={`p-1.5 rounded-lg transition-colors ${
            offer.freeDelivery
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title={offer.freeDelivery ? 'إلغاء التوصيل المجاني' : 'تفعيل التوصيل المجاني'}
        >
          <Truck size={16} />
        </button>
        {!isSubmitting && (
          <button
            type="button"
            onClick={() => onRemove(offer.id)}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            title="حذف العرض"
          >
            <X size={16} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}