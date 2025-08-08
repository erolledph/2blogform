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
  ...props
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || null);

  useEffect(() => {
    if (!src) return;

    console.log('ProgressiveImage loading:', src);

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setImageLoaded(true);
      console.log('ProgressiveImage loaded successfully:', src);
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      setImageError(true);
      console.error('ProgressiveImage failed to load:', src);
      if (onError) onError();
    };
    
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  if (imageError) {
    console.log('ProgressiveImage showing error state for:', src);
    return (
      <div className={`bg-muted rounded flex items-center justify-center ${className} ${placeholderClassName}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/Low quality image */}
      {!imageLoaded && (
        <div className={`absolute inset-0 bg-muted animate-pulse flex items-center justify-center ${placeholderClassName}`}>
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
          className={`w-full h-full object-cover transition-opacity duration-500 ${
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
export function GalleryImage({ src, alt, className = '', onClick = null }) {
  return (
    <div 
      className={`cursor-pointer transition-transform duration-200 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <ProgressiveImage
        src={src}
        alt={alt}
        className="w-full h-full rounded-lg"
        placeholderClassName="rounded-lg"
      />
    </div>
  );
}

// Specialized component for content featured images
export function FeaturedImage({ src, alt, className = '' }) {
  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      className={`w-full rounded-xl shadow-lg ${className}`}
      placeholderClassName="rounded-xl"
    />
  );
}