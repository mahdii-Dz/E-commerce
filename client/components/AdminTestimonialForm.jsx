"use client";

import { useState, useRef } from "react";
import { Star, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { cn } from "@/lib/utils";
import StarRating from "./StarRating";

export default function AdminTestimonialForm({ productId }) {
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    reviewText: '',
    stars: 5
  });

  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadImage = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    try {
      const response = await fetch('/api/cloudinary', {
        method: 'POST',
        body: formDataUpload,
        headers: {}
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const url = data.data?.url;

      if (!url) {
        throw new Error('No image URL returned');
      }

      setImageUrl(url);
      showToast('تم رفع الصورة بنجاح!', 'success');

    } catch (error) {
      console.error("Upload failed:", error);
      showToast("فشل في رفع الصورة: " + error.message, "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('الرجاء اختيار ملف صورة', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('يجب أن يكون حجم الصورة أقل من 5 ميجابايت', 'error');
      return;
    }

    uploadImage(file);
    e.target.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      showToast('الرجاء إدخال اسم العميل', 'error');
      return;
    }

    if (!formData.reviewText.trim()) {
      showToast('الرجاء إدخال نص الشهادة', 'error');
      return;
    }

    if (formData.stars < 1 || formData.stars > 5) {
      showToast('الرجاء تحديد تقييم بالنجوم', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/shop/add-product/${productId}/review/admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_name: formData.customerName.trim(),
            review_text: formData.reviewText.trim(),
            stars: formData.stars,
            image_url: imageUrl
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit admin review');
      }

      const data = await response.json();

      showToast(data.message || 'تم إضافة الشهادة الإدارية بنجاح!', 'success');

      // Reset form
      setFormData({
        customerName: '',
        reviewText: '',
        stars: 5
      });
      setImageUrl(null);

    } catch (err) {
      console.error('Error submitting admin review:', err);
      showToast(err.message || 'فشل في إرسال الشهادة الإدارية', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-stroke p-6" dir="rtl">
      <h2 className='text-lg font-semibold mb-6 flex items-center gap-2'>
        <Star className="text-primary" size={20} />
        أضف شهادة إدارية
      </h2>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'p-4 rounded-lg mb-6 flex items-center gap-2',
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        )}>
          {toast.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Customer Name */}
        <div>
          <label htmlFor='customerName' className='block text-sm font-medium mb-2'>
            اسم العميل <span className='text-red-500'>*</span>
          </label>
          <Input
            id='customerName'
            type='text'
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            placeholder='أدخل اسم العميل (مثال: أحمد، فاطمة)'
            required
          />
        </div>

        {/* Rating */}
        <div>
          <label className='block text-sm font-medium mb-2'>
            التقييم بالنجوم <span className='text-red-500'>*</span>
          </label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInputChange('stars', Math.max(1, formData.stars - 1))}
              disabled={isSubmitting}
            >
              -
            </Button>
            <span className="text-lg font-semibold w-12 text-center">{formData.stars}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInputChange('stars', Math.min(5, formData.stars + 1))}
              disabled={isSubmitting}
            >
              +
            </Button>
            <StarRating
              rating={formData.stars}
              interactive={false}
              size="md"
              className="mr-2"
            />
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label htmlFor='reviewText' className='block text-sm font-medium mb-2'>
            نص الشهادة <span className='text-red-500'>*</span>
          </label>
          <Textarea
            id='reviewText'
            value={formData.reviewText}
            onChange={(e) => handleInputChange('reviewText', e.target.value)}
            placeholder='اكتب نص الشهادة هنا...'
            rows={5}
            required
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className='block text-sm font-medium mb-2'>
            صورة الشهادة (اختياري)
          </label>
          <div className='border-2 border-dashed border-stroke rounded-lg p-6 text-center'>
            {imageUrl ? (
              <div className='space-y-4'>
                <div className='relative w-full max-w-md mx-auto rounded-lg overflow-hidden border border-stroke'>
                  <Image
                    src={imageUrl}
                    alt="شهادة العميل"
                    width={400}
                    height={300}
                    className='w-full h-auto object-contain bg-white'
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveImage}
                  size="sm"
                >
                  إزالة الصورة
                </Button>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex items-center justify-center gap-2 text-secondary cursor-pointer hover:text-primary' onClick={triggerUpload}>
                  <ImageIcon size={24} />
                  <span>انقر لرفع صورة</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className='text-xs text-secondary'>
                  ارفع لقطة شاشة لشهادة العميل أو صورة ذات صلة
                </p>
              </div>
            )}
          </div>
          {uploading && (
            <div className='mt-2'>
              <div className='w-full bg-gray-200 rounded-full h-2.5'>
                <div
                  className='bg-primary h-2.5 rounded-full transition-all duration-300'
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className='text-xs text-secondary mt-1'>جاري الرفع... {uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type='submit'
          disabled={isSubmitting || uploading}
          className='w-full'
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin ml-2" size={16} />
              جاري الإرسال...
            </>
          ) : (
            'إضافة الشهادة'
          )}
        </Button>
      </form>
    </div>
  );
}
