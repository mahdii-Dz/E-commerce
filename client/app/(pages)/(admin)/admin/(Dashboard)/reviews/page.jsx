"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Star,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useFetchSingleProduct } from "@/components/useFetchSingleProduct";
import StarRating from "@/components/StarRating";

export default function AdminReviewsPage() {
  const router = useRouter();

  // Toast state
  const [toast, setToast] = useState(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products for dropdown
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError
  } = useFetchSingleProduct('/api/shop/products');

  // Products state
  const [products, setProducts] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    customerName: 'Admin', // Default to 'Admin'
    reviewText: '',
    stars: 5 // Default to 5 stars
  });

  // Image upload state
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  // Initialize products from API data
  useEffect(() => {
    if (productsData && Array.isArray(productsData)) {
      setProducts(productsData);
    }
  }, [productsData]);

  // Fetch reviews when productId changes
  useEffect(() => {
    if (formData.productId) {
      fetchReviews(formData.productId);
    } else {
      setReviews([]);
    }
  }, [formData.productId]);

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

  // Cloudinary image upload
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
        // Note: Next.js API route handles admin auth internally
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.data?.url;

      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      setImageUrl(imageUrl);
      showToast('Image uploaded successfully!', 'success');

    } catch (error) {
      console.error("Upload failed:", error);
      showToast("Failed to upload image: " + error.message, "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
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

  const fetchReviews = async (productId) => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const response = await fetch(`/api/shop/reviews/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data = await response.json();
      if (data.success) {
        setReviews(data.reviews);
      } else {
        throw new Error(data.error || 'Failed to load reviews');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviewsError(err.message);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const response = await fetch(`/api/shop/review/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete review');
      }

      showToast('Review deleted successfully!', 'success');
      // Remove from list
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      showToast(err.message || 'Failed to delete review', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productId) {
      showToast('Please select a product', 'error');
      return;
    }

    if (!formData.customerName.trim()) {
      showToast('Please enter a customer name', 'error');
      return;
    }

    if (!formData.reviewText.trim()) {
      showToast('Please enter review text', 'error');
      return;
    }

    if (formData.stars < 1 || formData.stars > 5) {
      showToast('Please select a star rating', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/shop/add-product/${formData.productId}/review/admin`,
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

      showToast(data.message || 'Admin review added successfully!', 'success');

      // Reset form
      setFormData({
        productId: '',
        customerName: 'Admin',
        reviewText: '',
        stars: 5
      });
      setImageUrl(null);

      // Optional: redirect to product page to see review
      // router.push(`/product/${formData.productId}`);

    } catch (err) {
      console.error('Error submitting admin review:', err);
      showToast(err.message || 'Failed to submit admin review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (productsLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2 className='animate-spin' size={32} />
      </div>
    );
  }

  if (productsError) {
    return (
      <div className='p-6 bg-red-50 border border-red-200 rounded-lg'>
        <div className='flex items-center gap-2 text-red-600'>
          <AlertCircle size={20} />
          <span>Failed to load products: {productsError.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full pt-6 px-9 gap-6 pb-16 relative' dir='rtl'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl lg:text-2xl font-bold'>Admin Testimonials</h1>
          <p className='text-secondary text-sm mt-1'>
            Add testimonial reviews with images for products
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowRight size={16} className="rotate-180" />
          Back
        </Button>
      </div>

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

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Form Column */}
        <div className='lg:col-span-2'>
          <div className='bg-white rounded-xl border-2 border-stroke p-6'>
            <h2 className='text-lg font-semibold mb-6 flex items-center gap-2'>
              <Star size={20} />
              Add Admin Testimonial
            </h2>

            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Product Selection */}
              <div>
                <label htmlFor='productId' className='block text-sm font-medium mb-2'>
                  Product <span className='text-red-500'>*</span>
                </label>
                <select
                  id='productId'
                  value={formData.productId}
                  onChange={(e) => handleInputChange('productId', e.target.value)}
                  className='w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.price} دج
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label htmlFor='customerName' className='block text-sm font-medium mb-2'>
                  Customer Name <span className='text-red-500'>*</span>
                </label>
                <Input
                  id='customerName'
                  type='text'
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder='Enter customer name (e.g., Ahmed, Fatima)'
                  required
                />
              </div>

              {/* Rating */}
              <div>
                <label className='block text-sm font-medium mb-2'>
                  Star Rating <span className='text-red-500'>*</span>
                </label>
                <StarRating
                  rating={formData.stars}
                  onRatingChange={(stars) => handleInputChange('stars', stars)}
                  interactive={true}
                  size="lg"
                />
              </div>

              {/* Review Text */}
              <div>
                <label htmlFor='reviewText' className='block text-sm font-medium mb-2'>
                  Testimonial Text <span className='text-red-500'>*</span>
                </label>
                <Textarea
                  id='reviewText'
                  value={formData.reviewText}
                  onChange={(e) => handleInputChange('reviewText', e.target.value)}
                  placeholder='Write the customer testimonial here...'
                  rows={5}
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className='block text-sm font-medium mb-2'>
                  Testimonial Screenshot (Optional)
                </label>
                <div className='border-2 border-dashed border-stroke rounded-lg p-6 text-center'>
                  {imageUrl ? (
                    <div className='space-y-4'>
                      <div className='relative w-full max-w-md mx-auto rounded-lg overflow-hidden border border-stroke'>
                        <Image
                          src={imageUrl}
                          alt="Uploaded testimonial"
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
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      <div className='flex items-center justify-center gap-2 text-secondary cursor-pointer hover:text-primary' onClick={triggerUpload}>
                        <ImageIcon size={24} />
                        <span>Click to upload an image</span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <p className='text-xs text-secondary'>
                        Upload a screenshot of the customer testimonial or relevant image
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
                    <p className='text-xs text-secondary mt-1'>Uploading... {uploadProgress}%</p>
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
                    Submitting...
                  </>
                ) : (
                  'Add Testimonial'
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Info Column */}
        <div className='lg:col-span-1 space-y-6'>
          <div className='bg-white rounded-xl border-2 border-stroke p-6'>
            <h3 className='font-semibold mb-4'>Tips</h3>
            <ul className='space-y-3 text-sm text-secondary'>
              <li>
                <strong>Product:</strong> Select the product this testimonial belongs to
              </li>
              <li>
                <strong>Customer Name:</strong> Enter the customer's name (or use pseudo-anonymous like "Ahmed K.")
              </li>
              <li>
                <strong>Rating:</strong> Select how many stars this testimonial should show
              </li>
              <li>
                <strong>Image:</strong> Upload a screenshot or photo related to the testimonial (optional)
              </li>
            </ul>
          </div>

          <div className='bg-primary/5 rounded-xl border-2 border-primary p-6'>
            <h3 className='font-semibold mb-4 text-primary'>Note</h3>
            <p className='text-sm text-secondary'>
              Admin testimonials are displayed with a special badge in the reviews section and will appear above customer reviews. They also have the option to include an image.
            </p>
          </div>

          {/* Current products count */}
          <div className='bg-gray-50 rounded-xl border border-stroke p-6'>
            <div className='text-sm text-secondary mb-1'>Available Products</div>
            <div className='text-2xl font-bold'>{products.length}</div>
          </div>
        </div>
      </div>

      {/* Reviews Management Section */}
      {formData.productId && (
        <div className='mt-8'>
          <h2 className='text-xl font-bold mb-4'>Reviews for Selected Product</h2>

          {reviewsLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='animate-spin' size={32} />
            </div>
          ) : reviewsError ? (
            <div className='p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'>
              {reviewsError}
            </div>
          ) : reviews.length === 0 ? (
            <div className='p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-secondary'>
              No reviews for this product yet.
            </div>
          ) : (
            <div className='space-y-4'>
              {reviews.map((review) => (
                <div key={review.id} className='bg-white rounded-xl border-2 border-stroke p-6'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='font-semibold text-lg'>{review.customer_name}</span>
                        {review.is_admin && (
                          <span className='text-xs bg-primary text-white px-2 py-0.5 rounded-full flex items-center gap-1'>
                            Admin
                          </span>
                        )}
                        <span className='text-sm text-secondary'>
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 mb-3'>
                        <StarRating rating={review.stars} interactive={false} size="sm" />
                        <span className='text-sm text-secondary'>({review.stars})</span>
                      </div>
                      <p className='text-gray-700 leading-relaxed'>{review.review_text}</p>
                      {review.image_url && (
                        <div className='mt-4'>
                          <Image
                            src={review.image_url}
                            alt='Review screenshot'
                            width={200}
                            height={150}
                            className='object-contain border border-stroke rounded-lg'
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                      className='flex items-center gap-1'
                    >
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
