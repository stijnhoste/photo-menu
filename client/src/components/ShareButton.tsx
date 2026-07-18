import { useState } from 'react';
import QRCode from 'qrcode';
import type { Dish, Menu } from '../types';
import { APP_NAME } from '../config';

interface ShareButtonProps {
  dishes: Dish[];
  menu?: Menu | null;
  disabled: boolean;
}

export default function ShareButton({ dishes, menu, disabled }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = async () => {
    if (dishes.length === 0) return;

    setIsSharing(true);
    setShareError(null);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menu ? { menu } : { dishes })
      });

      if (!response.ok) throw new Error('Failed to create share link');

      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}/menu/${shareId}`;
      setShareUrl(shareUrl);
      setQrDataUrl(await QRCode.toDataURL(shareUrl, { width: 320, margin: 2, errorCorrectionLevel: 'M' }));

    } catch (err) {
      console.error('Share failed:', err);
      setShareError('Could not create a share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
      className="icon-button"
      onClick={handleShare}
      disabled={disabled || isSharing}
      title={copied ? 'Link copied!' : 'Share menu'}
      aria-label={copied ? 'Link copied to clipboard' : isSharing ? 'Creating share link...' : 'Share menu'}
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
      {shareError && <span className="share-inline-error" role="alert">{shareError}</span>}
      {shareUrl && qrDataUrl && (
        <div className="share-dialog" role="dialog" aria-modal="true" aria-label="Share this menu">
          <div className="share-dialog-card">
            <button className="share-dialog-close" onClick={() => setShareUrl(null)} aria-label="Close share dialog">×</button>
            <p className="eyebrow">Permanent menu link</p>
            <h2>Scan to open this menu</h2>
            <img src={qrDataUrl} alt="QR code for the shared menu" />
            <input value={shareUrl} readOnly aria-label="Share URL" />
            <div className="share-dialog-actions">
              <button className="secondary-button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
              {navigator.share && (
                <button className="scan-button" onClick={() => navigator.share({ title: APP_NAME, url: shareUrl })}>Share</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
