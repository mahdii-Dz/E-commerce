"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Trash2, Plus, Minus, Percent, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState(null);

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading, refetch: refetchCategories } = useFetchSingleProduct('http://localhost:5000/api/shop/get-categories');

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categories: [],
    price: "",
    discount: "",
    quantity: "",
    type: "None", // Changed default to "None"
  });

  const [images, setImages] = useState([]);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [pendingUploadIndex, setPendingUploadIndex] = useState(null);

  // Combobox anchor for categories
  const categoryAnchor = useComboboxAnchor();

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/shop/get-product/${id}`);
        const data = response.data;
        setProduct(data);

        // Map backend type to frontend value
        const typeMap = {
          "Best Deal": "BestDeal",
          "New Arrival": "NewArrival",
          "Promotions": "Promotions",
          "None": "None"
        };

        // Debug logging
        console.log("Raw backend type:", data.type);
        console.log("Type after mapping:", typeMap[data.type]);

        // Extract category names from product data
        const productCategories = data.categories?.map(cat => cat.name) ||
          data.category?.split(',') ||
          [];

        // Determine the correct type with fallback
        const mappedType = typeMap[data.type] || 
                          (data.type ? data.type.replace(/\s+/g, '') : "None");

        // Populate form data
        setFormData({
          title: data.name || "",
          description: data.description || "",
          categories: productCategories,
          price: data.price?.toString() || "",
          discount: data.discount_percentage?.toString() || "",
          quantity: data.stock?.toString() || "",
          type: mappedType,
        });

        // Populate images if they exist
        if (data.images && Array.isArray(data.images)) {
          const formattedImages = data.images.map((url, index) => ({
            url: url,
            publicId: data.publicIds?.[index] || "",
            isExisting: true
          }));
          setImages(formattedImages);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
        showToast("Failed to load product", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProduct();
      console.log(product);
      
    }
  }, [id]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const adjustQuantity = (delta) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(0, (parseInt(prev.quantity) || 0) + delta)
    }));
  };

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

      setImages(prev => {
        const newImages = [...prev];
        newImages[index] = { url: imageUrl, publicId, isNew: true };
        return newImages;
      });

    } catch (error) {
      console.error("Upload failed:", error);
      showToast("Failed to upload image", "error");
      setImages(prev => prev.filter((_, i) => i !== index));
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const index = pendingUploadIndex !== null ? pendingUploadIndex : images.length;
    if (index >= images.length) setImages(prev => [...prev, null]);

    uploadImage(file, index);
    setPendingUploadIndex(null);
    e.target.value = '';
  };

  const triggerUpload = (index) => {
    setPendingUploadIndex(index);
    fileInputRef.current?.click();
  };

  const getGridItems = () => {
    const items = [];
    const totalSlots = Math.max(images.length + 1, 1);
    for (let i = 0; i < totalSlots && i < 6; i++) {
      items.push({
        index: i,
        isMain: i === 0,
        hasImage: images[i] !== undefined && images[i] !== null,
        isUploading: uploadingIndex === i,
        image: images[i]
      });
    }
    return items;
  };

  const gridItems = getGridItems();

  const DeleteImageFromDB = async (e, index, publicId, isExisting) => {
    e.stopPropagation();

    setImages(prev => prev.filter((_, i) => i !== index));

    if (isExisting && publicId) {
      try {
        await axios.delete(`http://localhost:5000/cloudinary/delete/${publicId}`);
      } catch (error) {
        console.error("Delete failed:", error);
        showToast("Failed to delete image from server", "error");
      }
    }
  };

  const getThumbnailUrl = (url) => {
    if (!url) return "";
    return url.replace('/upload/', '/upload/w_300,h_300,c_fill,f_auto,q_auto/');
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      showToast("Please upload at least one image", "error");
      return;
    }

    if (!formData.title || !formData.price) {
      showToast("Please fill in required fields", "error");
      return;
    }

    if (formData.categories.length === 0) {
      showToast("Please select at least one category", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Map back to backend format
      const typeMapReverse = {
        "BestDeal": "Best Deal",
        "NewArrival": "New Arrival",
        "Promotions": "Promotions",
        "None": "None"
      };

      // Get category IDs from selected category names
      const selectedCategoryIds = categoriesData
        ?.filter(cat => formData.categories.includes(cat.name))
        .map(cat => cat.id) || [];

      const response = await axios.put(`http://localhost:5000/api/shop/update-product/${id}`, {
        name: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.quantity) || 0,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : [],
        type: typeMapReverse[formData.type] || formData.type,
        discount_percentage: parseFloat(formData.discount) || 0,
        images: images.map(img => img.url),
        thumbnail: getThumbnailUrl(images[0]?.url),
      });

      showToast("Product updated successfully!", "success");

      setTimeout(() => {
        router.push("/admin/all-products");
      }, 1500);

    } catch (error) {
      console.error("Update failed:", error);
      showToast(error.response?.data?.message || "Failed to update product", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const DeleteProduct = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.delete(`http://localhost:5000/api/shop/delete-product/${id}`);
      showToast("Product deleted successfully!", "success");

      setTimeout(() => {
        router.push("/admin/all-products");
      }, 1500);

    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Failed to delete product", "error");
      setIsSubmitting(false);
    }
  };

  // Prepare category items for combobox
  const categoryItems = categoriesData?.map(cat => cat.name) || [];

  if (isLoading) {
    return (
      <div className="w-full pt-6 px-9 pb-16 ml-64 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#FA3145]" />
          <p className="text-lg text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-6 px-9 gap-6 pb-16 ml-64 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}>
          {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FA3145]" />
            <p className="text-lg font-medium text-gray-700">
              {product ? "Updating product..." : "Deleting product..."}
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <header className="flex items-center justify-between mb-14">
        <Link href="/admin/all-products">
          <button className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-black" />
          </button>
        </Link>

        <button
          onClick={DeleteProduct}
          disabled={isSubmitting}
          className="w-10 h-10 flex items-center justify-center rounded-full border cursor-pointer border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group disabled:opacity-50"
        >
          <Trash2 size={20} className="text-[#FA3145] group-hover:scale-110 transition-transform" />
        </button>
      </header>

      <div className="flex flex-col gap-10">
        <div className="flex gap-6">
          <div
            onClick={() => !images[0] && !isSubmitting && triggerUpload(0)}
            className={`relative w-[494px] h-[415px] bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden group ${!isSubmitting ? "cursor-pointer hover:bg-gray-300" : "cursor-not-allowed opacity-50"
              } transition-colors`}
          >
            {uploadingIndex === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                <div className="w-48 h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FA3145] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="mt-3 text-sm text-gray-600">{uploadProgress}%</span>
                <span className="mt-1 text-xs text-gray-500">Uploading...</span>
              </div>
            ) : images[0] ? (
              <>
                <img src={images[0].url} alt="Main" className="w-full h-full object-cover border border-stroke rounded-xl" />
                {!isSubmitting && (
                  <button
                    onClick={(e) => DeleteImageFromDB(e, 0, images[0].publicId, images[0].isExisting)}
                    className="absolute top-3 right-3 w-8 h-8 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <X size={16} className="text-gray-700" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Plus size={32} className="text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">Add Main Image</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-4 content-start">
            {gridItems.slice(1).map((item) => (
              <div
                key={item.index}
                onClick={() => !item.hasImage && !item.isUploading && !isSubmitting && triggerUpload(item.index)}
                className={`relative w-[108px] h-[108px] rounded-xl flex items-center justify-center overflow-hidden transition-colors group ${isSubmitting ? "cursor-not-allowed opacity-50" : item.hasImage ? "bg-gray-100" : "bg-gray-200 hover:bg-gray-300 cursor-pointer"
                  }`}
              >
                {item.isUploading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                    <div className="w-16 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FA3145] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="mt-1 text-xs text-gray-600">{uploadProgress}%</span>
                  </div>
                ) : item.hasImage ? (
                  <>
                    <img src={item.image.url} alt={`Product ${item.index}`} className="w-full h-full object-cover border border-stroke rounded-xl" />
                    {!isSubmitting && (
                      <button
                        onClick={(e) => DeleteImageFromDB(e, item.index, item.image.publicId, item.image.isExisting)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 cursor-pointer bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                      >
                        <X size={14} className="text-gray-700" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Plus size={16} className="text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 w-[915px]">
          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Title: <span className="text-red-500">*</span></label>
            <textarea
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Product title..."
              disabled={isSubmitting}
              className="w-full p-5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3 w-[178px]">
            <label className="text-lg font-semibold text-black">Quantity</label>
            <div className="relative flex items-center h-[50px] px-5 bg-white border border-gray-200 rounded-xl">
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
                className="w-full text-base text-gray-800 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-100"
                placeholder="0"
              />
              <div className="absolute right-4 flex items-center gap-2">
                <button type="button" onClick={() => adjustQuantity(-1)} disabled={isSubmitting} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
                  <Minus size={16} />
                </button>
                <button type="button" onClick={() => adjustQuantity(1)} disabled={isSubmitting} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Product description..."
              disabled={isSubmitting}
              className="w-full p-5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={5}
            />
          </div>

          {/* Multiple Category Selection with Combobox */}
          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Categories: <span className="text-red-500">*</span></label>
            {categoriesLoading ? (
              <div className="w-full h-14 bg-gray-100 rounded-xl flex items-center px-5 text-gray-500">
                Loading categories...
              </div>
            ) : (
              <Combobox
                multiple
                autoHighlight
                items={categoryItems}
                value={formData.categories}
                onValueChange={(value) => handleChange("categories", value)}
                disabled={isSubmitting}
              >
                <ComboboxChips ref={categoryAnchor} className="w-full min-h-[56px] bg-white border border-gray-200 rounded-xl px-5 py-3 focus-within:ring-2 focus-within:ring-[#FA3145] disabled:bg-gray-100">
                  <ComboboxValue>
                    {(values) => (
                      <React.Fragment>
                        {values.map((value) => (
                          <ComboboxChip key={value} className="bg-[#FA3145]/10 text-[#FA3145] border-[#FA3145]/20">
                            {value}
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput placeholder="Select categories..." />
                      </React.Fragment>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={categoryAnchor}>
                  <ComboboxEmpty>No categories found.</ComboboxEmpty>
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

          <div className="flex items-center gap-6 w-[671px]">
            <div className="flex flex-col gap-3 flex-1">
              <label className="text-lg font-semibold text-black">Price: <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0"
                disabled={isSubmitting}
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-base text-primary focus:outline-none focus:ring-2 focus:ring-[#FA3145] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-3 w-[246px]">
              <label className="text-lg font-semibold text-black text-center">Discount</label>
              <div className="flex items-center px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleChange("discount", e.target.value)}
                  placeholder="0"
                  disabled={isSubmitting}
                  className="w-full text-base text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-100"
                />
                <Percent size={20} className="text-gray-600 ml-2" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Type:</label>
            <Select
              onValueChange={(value) => handleChange("type", value)}
              value={formData.type}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full h-14! bg-white rounded-xl border-gray-200 disabled:bg-gray-100">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="BestDeal">Best Deal</SelectItem>
                  <SelectItem value="Promotions">Promotions</SelectItem>
                  <SelectItem value="NewArrival">New Arrival</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/admin/all-products">
              <button disabled={isSubmitting} className="px-12 py-3 bg-white border cursor-pointer border-gray-200 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Cancel
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
                  Updating...
                </>
              ) : (
                "Update Product"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}