import React, { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

export default function ProgressiveImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  lowQualitySrc = null,
  onLoad = null,
  onError = null,
  debug = false,
  ...props
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    if (!src) return;

    if (debug) console.log('ProgressiveImage loading:', src);
    
    setLoadAttempts(prev => prev + 1);

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setImageLoaded(true);
      setImageError(false);
      if (debug) console.log('ProgressiveImage loaded successfully:', src);
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
      if (debug) console.error('ProgressiveImage failed to load:', src, 'Attempt:', loadAttempts);
      if (onError) onError();
      
      // Auto-retry once after 2 seconds for network issues
      if (loadAttempts === 1) {
        setTimeout(() => {
          if (debug) console.log('Retrying image load:', src);
          setImageError(false);
          img.src = src + '?retry=' + Date.now(); // Cache busting
        }, 2000);
      }
    };
    
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError, debug]);

  if (imageError) {
    if (debug) console.log('ProgressiveImage showing error state for:', src);
    return (
      <div className={`bg-muted rounded ${className} ${placeholderClassName}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
        {debug && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            Load Failed
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/Low quality image */}
      {!imageLoaded && (
        <div className={`absolute inset-0 bg-muted flex items-center justify-center ${placeholderClassName}`}>
          {currentSrc ? (
            <img
              src={currentSrc}
              alt={alt}
              className="w-full h-full object-cover filter blur-sm opacity-50"
              {...props}
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      )}
      
      {/* High quality image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            setImageLoaded(true);
            if (onLoad) onLoad();
          }}
          onError={() => {
            setImageError(true);
            if (onError) onError();
          }}
          {...props}
        />
      )}
    </div>
  );
}

// Specialized component for gallery images
export function GalleryImage({ src, alt, className = '', onClick = null, debug = false }) {
  return (
    <div 
      className={`cursor-pointer ${className}`}
      onClick={onClick}
    >
      <ProgressiveImage
        src={src}
        alt={alt}
        className="w-full h-full rounded-lg"
        placeholderClassName="rounded-lg"
        debug={debug}
      />
    </div>
  );
}

// Specialized component for content featured images
export function FeaturedImage({ src, alt, className = '', debug = false }) {
  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      className={`w-full rounded-xl shadow-lg ${className}`}
      placeholderClassName="rounded-xl"
      debug={debug}
    />
  );
}