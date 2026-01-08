import { useState } from 'react';
import type { Dish } from '../types';

interface ShareButtonProps {
  dishes: Dish[];
  disabled: boolean;
}

export default function ShareButton({ dishes, disabled }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (dishes.length === 0) return;

    setIsSharing(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishes })
      });

      if (!response.ok) throw new Error('Failed to create share link');

      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}/menu/${shareId}`;

      // Try native share first
      if (navigator.share) {
        await navigator.share({
          title: 'menu.pictures',
          text: `Check out this menu with ${dishes.length} dishes`,
          url: shareUrl
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }

      // Save to localStorage
      const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
      savedMenus.unshift({
        id: shareId,
        dishes,
        createdAt: new Date().toISOString()
      });
      // Keep only last 20 menus
      localStorage.setItem('savedMenus', JSON.stringify(savedMenus.slice(0, 20)));

    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      className="icon-button"
      onClick={handleShare}
      disabled={disabled || isSharing}
      title={copied ? 'Link copied!' : 'Share menu'}
      style={copied ? { borderColor: '#22c55e', color: '#22c55e' } : undefined}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
      )}
    </button>
  );
}
