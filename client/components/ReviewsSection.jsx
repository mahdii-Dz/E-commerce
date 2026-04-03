'use client';

import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import Image from 'next/image';
import Loader from './Loader';
import { AlertCircle, CheckCircle, MessageSquare, Star, User, ShieldCheck, Image as ImageIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    review_text: '',
    stars: 0
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/shop/reviews/${productId}`);

      if (!response.ok) {
        throw new Error('فشل في جلب المراجعات');
      }

      const data = await response.json();
      if (data.success) {
        setReviews(data.reviews);
      } else {
        throw new Error(data.error || 'فشل في تحميل المراجعات');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
      setShowAllReviews(false); // Reset when product changes
    }
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.stars) {
      showToast('الرجاء تحديد تقييم بالنجوم', 'error');
      return;
    }

    if (!formData.customer_name.trim()) {
      showToast('الرجاء إدخال اسمك', 'error');
      return;
    }

    if (!formData.review_text.trim()) {
      showToast('الرجاء إدخال مراجعتك', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/shop/reviews/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: formData.customer_name.trim(),
          review_text: formData.review_text.trim(),
          stars: formData.stars
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إرسال المراجعة');
      }

      // Generate review locally for immediate display (optimistic update)
      const newReview = {
        id: Date.now(), // temporary ID
        product_id: parseInt(productId),
        customer_name: formData.customer_name.trim(),
        review_text: formData.review_text.trim(),
        stars: formData.stars,
        image_url: null,
        is_admin: false,
        created_at: new Date().toISOString()
      };

      setReviews(prev => [newReview, ...prev]);

      // Reset form
      setFormData({
        customer_name: '',
        review_text: '',
        stars: 0
      });

      showToast('تم إرسال المراجعة بنجاح!', 'success');

    } catch (err) {
      console.error('Error submitting review:', err);
      showToast(err.message || 'فشل إرسال المراجعة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)
    : 0;

  const renderStars = (stars, size = 'md') => (
    <StarRating rating={stars} interactive={false} size={size} />
  );

  if (loading) {
    return (
      <section className='reviews-section w-full mb-12 lg:mb-16 px-0'>
        <div className='flex items-center justify-center py-12'>
          <Loader />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className='reviews-section w-full mb-12 lg:mb-16 px-0'>
        <div className='text-red-500 flex items-center gap-2 py-4'>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </section>
    );
  }

  return (
    <section className='reviews-section w-full mb-12 lg:mb-16 px-0' dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transition-all duration-300 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className='w-full bg-white rounded-xl border-2 border-stroke p-6 mb-8'>
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>
          {/* Rating Summary */}
          <div className='flex items-center gap-6'>
            <div className='text-center'>
              <div className='text-4xl lg:text-5xl font-bold text-primary'>
                {averageRating}
              </div>
              <div className='flex justify-center mt-2'>
                {renderStars(Math.round(averageRating), 'lg')}
              </div>
              <div className='text-sm text-secondary mt-1'>
                {reviews.length} {reviews.length === 1 ? 'مراجعة' : 'مراجعات'}
              </div>
            </div>

            <div className='h-16 w-px bg-stroke hidden md:block' />

            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-sm'>
                <MessageSquare size={16} className='text-secondary' />
                <span>مراجعات العملاء</span>
              </div>
              <p className='text-secondary text-sm'>
                اقرأ ما يقوله عملاؤنا عن هذا المنتج.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Write a Review Form */}
      <div className='bg-white rounded-xl border-2 border-stroke p-6 mb-8'>
        <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
          <MessageSquare size={20} />
          اكتب مراجعة
        </h3>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='customer_name' className='block text-sm font-medium mb-1'>
              اسمك <span className='text-red-500'>*</span>
            </label>
            <Input
              id='customer_name'
              type='text'
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder='أدخل اسمك'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium mb-1'>
              التقييم <span className='text-red-500'>*</span>
            </label>
            <StarRating
              rating={formData.stars}
              onRatingChange={(stars) => handleInputChange('stars', stars)}
              interactive={true}
              size='lg'
            />
          </div>

          <div>
            <label htmlFor='review_text' className='block text-sm font-medium mb-1'>
              مراجعتك <span className='text-red-500'>*</span>
            </label>
            <Textarea
              id='review_text'
              value={formData.review_text}
              onChange={(e) => handleInputChange('review_text', e.target.value)}
              placeholder='اكتب مراجعتك هنا...'
              rows={4}
              required
            />
          </div>

          <Button
            type='submit'
            disabled={submitting}
            className='w-full md:w-auto'
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال المراجعة'}
          </Button>
        </form>
      </div>

      {/* Reviews List */}
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold mb-4'>
          كل المراجعات ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div className='text-center py-12 bg-gray-50 rounded-lg border border-stroke'>
            <MessageSquare size={48} className='mx-auto text-gray-300 mb-4' />
            <p className='text-secondary'>لا توجد مراجعات بعد. كن أول من يكتب واحدة!</p>
          </div>
        ) : (
          <>
            {/* Show first 3 reviews or all if expanded */}
            {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
              <div
                key={review.id}
                className={cn(
                  'bg-white rounded-xl border-2 p-6',
                  review.is_admin ? 'border-primary/30 bg-primary/5' : 'border-stroke'
                )}
              >
                {/* Review Header */}
                <div className='flex items-start justify-between gap-4 mb-3'>
                  <div className='flex items-center gap-3'>
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      review.is_admin ? 'bg-primary/20' : 'bg-gray-200'
                    )}>
                      {review.is_admin ? (
                        <ShieldCheck size={20} className='text-primary' />
                      ) : (
                        <User size={20} className='text-secondary' />
                      )}
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{review.customer_name}</span>
                        {review.is_admin && (
                          <span className='text-xs bg-primary text-white px-2 py-0.5 rounded-full flex items-center gap-1'>
                            <ShieldCheck size={12} />
                            شهادة إدارية
                          </span>
                        )}
                      </div>
                      <div className='text-xs text-secondary'>
                        {new Date(review.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    {renderStars(review.stars, 'sm')}
                  </div>
                </div>

                {/* Review Text */}
                <p className='text-gray-700 leading-relaxed whitespace-pre-wrap mb-4'>
                  {review.review_text}
                </p>

                {/* Admin Image */}
                {review.is_admin && review.image_url && (
                  <div className='mt-4 pt-4 border-t border-stroke'>
                    <p className='text-sm font-medium mb-2 flex items-center gap-2'>
                      <ImageIcon size={16} />
                      لقطة شاشة لشهادة العميل
                    </p>
                    <div className='relative w-full max-w-md rounded-lg overflow-hidden border border-stroke'>
                      <Image
                        src={review.image_url}
                        alt='لقطة شاشة الشهادة'
                        width={400}
                        height={300}
                        className='w-full h-auto object-contain bg-white'
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* See More/Less Button */}
            {reviews.length > 3 && (
              <div className='text-center pt-4'>
                <Button
                  variant="outline"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className='flex items-center gap-2 mx-auto'
                >
                  {showAllReviews ? (
                    <>عرض أقل</>
                  ) : (
                    <>
                      عرض المزيد
                      <Plus size={16} />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
