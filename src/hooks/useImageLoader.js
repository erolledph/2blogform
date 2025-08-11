import { useState, useEffect, useCallback } from 'react';
import { imageService } from '@/services/imageService';
import { useCache } from './useCache';

// Enhanced hook for loading images with caching and error handling
export function useImageLoader(imageUrl, options = {}) {
  const {
    fallbackUrl = null,
    enableCache = true,
    retryAttempts = 2,
    retryDelay = 1000,
    onLoad = null,
    onError = null
  } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const cache = useCache();

  const loadImage = useCallback(async () => {
    if (!imageUrl) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (enableCache) {
      const cacheKey = `image-${imageUrl}`;
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        setImageData(cachedData);
        setLoading(false);
        if (onLoad) onLoad(cachedData);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await imageService.validateImageUrl(imageUrl);
      
      if (result.valid) {
        const data = {
          url: imageUrl,
          contentType: result.contentType,
          size: result.size,
          loadedAt: new Date()
        };
        
        setImageData(data);
        
        // Cache successful result
        if (enableCache) {
          cache.set(`image-${imageUrl}`, data, 10 * 60 * 1000); // 10 minutes
        }
        
        if (onLoad) onLoad(data);
      } else {
        throw new Error(result.error);
      }
      
    } catch (err) {
      console.error('Image load error:', err);
      
      // Try fallback URL
      if (fallbackUrl && attempts === 0) {
        setAttempts(1);
        setTimeout(() => {
          loadImage();
        }, retryDelay);
        return;
      }
      
      // Retry logic
      if (attempts < retryAttempts) {
        setAttempts(prev => prev + 1);
        setTimeout(() => {
          loadImage();
        }, retryDelay * Math.pow(2, attempts)); // Exponential backoff
        return;
      }
      
      setError(err.message);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [imageUrl, fallbackUrl, attempts, retryAttempts, retryDelay, enableCache, onLoad, onError, cache]);

  useEffect(() => {
    setAttempts(0);
    loadImage();
  }, [imageUrl]);

  const retry = useCallback(() => {
    setAttempts(0);
    setError(null);
    loadImage();
  }, [loadImage]);

  return {
    loading,
    error,
    imageData,
    retry,
    attempts
  };
}

// Hook for loading multiple images
export function useMultipleImageLoader(imageUrls, options = {}) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) {
      setLoading(false);
      return;
    }

    const loadImages = async () => {
      setLoading(true);
      setProgress(0);
      setResults([]);
      setErrors([]);

      const batchResult = await imageService.loadImagesWithProgress(
        imageUrls,
        (progressData) => {
          setProgress(progressData.percentage);
          if (progressData.error) {
            setErrors(prev => [...prev, {
              path: progressData.currentPath,
              error: progressData.error
            }]);
          }
        }
      );

      setResults(batchResult.results);
      setLoading(false);
    };

    loadImages();
  }, [imageUrls]);

  return {
    loading,
    progress,
    results,
    errors,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length
  };
}

// Hook for image preloading
export function useImagePreloader(imageUrls) {
  const [preloaded, setPreloaded] = useState(false);
  const [preloadResults, setPreloadResults] = useState([]);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) return;

    const preload = async () => {
      const results = await imageService.preloadImages(imageUrls);
      setPreloadResults(results);
      setPreloaded(true);
    };

    preload();
  }, [imageUrls]);

  return {
    preloaded,
    preloadResults,
    successCount: preloadResults.filter(r => r.success).length,
    failureCount: preloadResults.filter(r => !r.success).length
  };
}