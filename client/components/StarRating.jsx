'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StarRating Component
 *
 * @param {number} rating - The current rating (1-5) for display, or 0 if interactive and not rated
 * @param {function} onRatingChange - Callback when user selects a star (interactive mode only)
 * @param {boolean} interactive - If true, allows user to click stars to set rating
 * @param {string} size - Size of stars: 'sm', 'md', 'lg'
 * @param {string} className - Additional CSS classes
 */
export default function StarRating({
  rating = 0,
  onRatingChange = null,
  interactive = false,
  size = 'md',
  className = ''
}) {
  const [hoverRating, setHoverRating] = useState(0);

  // Size mapping
  const starSize = {
    sm: 14,
    md: 18,
    lg: 24
  };

  const currentRating = interactive ? hoverRating || rating : rating;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= currentRating;
        const isHovered = interactive && star <= hoverRating;

        return (
          <button
            key={star}
            type="button"
            onClick={() => {
              if (interactive && onRatingChange) {
                onRatingChange(star);
              }
            }}
            onMouseEnter={() => {
              if (interactive) setHoverRating(star);
            }}
            onMouseLeave={() => {
              if (interactive) setHoverRating(0);
            }}
            disabled={!interactive}
            className={cn(
              'transition-colors duration-150',
              interactive && 'cursor-pointer hover:scale-110 active:scale-95'
            )}
            style={{ width: starSize[size], height: starSize[size] }}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            aria-current={filled ? 'true' : 'false'}
          >
            <Star
              size={starSize[size]}
              className={cn(
                filled || isHovered
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
