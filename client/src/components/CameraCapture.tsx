import { useState, useRef } from 'react';
import { compressImage } from '../utils/imageCompression';

interface CameraCaptureProps {
  onCapture: (images: string[]) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newPreviews: string[] = [];

    // Process images in parallel for faster loading
    const compressionPromises = Array.from(files).map(async (file) => {
      try {
        return await compressImage(file, 1024);
      } catch (err) {
        console.error('Failed to process image:', err);
        return null;
      }
    });

    const results = await Promise.all(compressionPromises);
    newPreviews.push(...results.filter((r): r is string => r !== null));

    setPreviews(prev => [...prev, ...newPreviews]);
    setIsProcessing(false);

    // Reset input to allow selecting same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScan = () => {
    if (previews.length > 0) {
      onCapture(previews);
    }
  };

  const handleRemoveImage = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="camera-section">
      <label className="capture-button">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
        <span>
          {isProcessing ? 'Processing...' : 'Tap to capture or upload menu'}
        </span>
      </label>

      {previews.length > 0 && (
        <>
          <div className="preview-images">
            {previews.map((preview, index) => (
              <div key={preview.substring(0, 50)} style={{ position: 'relative' }}>
                <img src={preview} alt={`Menu page ${index + 1}`} />
                <button
                  onClick={() => handleRemoveImage(index)}
                  aria-label={`Remove page ${index + 1}`}
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            className="scan-button"
            onClick={handleScan}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : `Scan ${previews.length} page${previews.length > 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  );
}
