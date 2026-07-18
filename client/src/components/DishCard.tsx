import { useState } from 'react';
import type { Dish } from '../types';

interface DishCardProps {
  dish: Dish;
  onImageChange?: (imageUrl: string | null) => void;
}

export default function DishCard({ dish, onImageChange }: DishCardProps) {
  const [imageError, setImageError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(1);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);

  const retryImage = async () => {
    setIsRetrying(true);
    setRetryError(false);
    try {
      const response = await fetch('/api/scan/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dish.name, category: dish.category, attempt: retryAttempt })
      });
      if (!response.ok) throw new Error('Image retry failed');
      const data = await response.json() as { imageUrl: string | null };
      setRetryAttempt(attempt => Math.min(8, attempt + 1));
      setImageError(false);
      onImageChange?.(data.imageUrl);
    } catch {
      setRetryError(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="dish-card">
      {dish.imageUrl && !imageError ? (
        <img
          src={dish.imageUrl}
          alt={dish.name}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="dish-card-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )}
      <div className="dish-card-content">
        <h3>{dish.name}</h3>
        {dish.originalName && dish.originalName !== dish.name && (
          <p className="dish-original-name">{dish.originalName}</p>
        )}
        {dish.price && <span className="price">{dish.price}</span>}
        {dish.description && <p className="dish-description">{dish.description}</p>}
        {dish.dietaryTags?.length > 0 && (
          <div className="dish-tags">{dish.dietaryTags.map(tag => <span key={tag}>{tag}</span>)}</div>
        )}
        {dish.allergens?.length > 0 && (
          <p className="dish-allergens">May contain: {dish.allergens.join(', ')}. Confirm with staff.</p>
        )}
        {dish.imageUrl && dish.imageIsRepresentative && (
          <p className="representative-note">Representative image</p>
        )}
        {onImageChange && (
          <button className="image-retry" onClick={retryImage} disabled={isRetrying}>
            {isRetrying ? 'Finding another…' : dish.imageUrl ? 'Try another image' : 'Find an image'}
          </button>
        )}
        {retryError && <p className="image-retry-error" role="alert">Could not find another image.</p>}
      </div>
    </div>
  );
}
