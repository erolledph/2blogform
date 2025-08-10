import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Eye, 
  Star, 
  ShoppingCart, 
  Heart, 
  Share2, 
  ExternalLink,
  Package,
  Tag,
  Calendar,
  DollarSign,
  Percent,
  ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ProductPreviewSkeleton } from '@/components/shared/SkeletonLoader';
import { FeaturedImage, GalleryImage } from '@/components/shared/ProgressiveImage';
import { useImageLoader, useMultipleImageLoader } from '@/hooks/useImageLoader';
import { settingsService } from '@/services/settingsService';

export default function ProductPreviewPage() {
  const { uid, blogId, slug } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCurrency, setUserCurrency] = useState('$');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchProduct();
    fetchUserCurrency();
  }, [uid, blogId, slug]);

  const fetchUserCurrency = async () => {
    try {
      const appSettings = await settingsService.getPublicAppSettings(uid);
      setUserCurrency(appSettings.currency || '$');
    } catch (error) {
      console.error('Error fetching user currency:', error);
      // Keep default currency on error
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${window.location.origin}/users/${uid}/blogs/${blogId}/api/products.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      // Handle both old format (array) and new format (object with data property)
      const allProductsData = Array.isArray(responseData) ? responseData : responseData.data || [];
      const foundProduct = allProductsData.find(item => item.slug === slug);
      
      if (!foundProduct) {
        throw new Error('Product not found');
      }
      
      setProduct(foundProduct);
      setAllProducts(allProductsData);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDiscountedPrice = (price, percentOff) => {
    if (!price || !percentOff || percentOff <= 0) return price;
    return price - (price * (percentOff / 100));
  };

  const getProductImages = () => {
    if (product?.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    if (product?.imageUrl) {
      return [product.imageUrl];
    }
    return [];
  };
  
  // Use enhanced image loading for product images
  const productImages = getProductImages();
  const { loading: imagesLoading, results: imageResults, errors: imageErrors } = useMultipleImageLoader(productImages);

  const nextImage = () => {
    const images = getProductImages();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = getProductImages();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-lg w-full text-center p-8">
          <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-lg text-gray-600 mb-8">{error}</p>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <nav className="flex items-center justify-between">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium group"
            >
              <div className="p-2 rounded-lg group-hover:bg-gray-100 transition-colors duration-200 mr-2">
                <ArrowLeft className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <Eye className="h-4 w-4 mr-2" />
                Preview Mode
              </span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      {loading ? (
        <ProductPreviewSkeleton />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-6 sm:p-8 lg:p-16">
              
              {/* Product Image Gallery */}
              <div className="space-y-6 order-1 lg:order-1">
                {getProductImages().length > 0 ? (
                  <>
                    {/* Main Image */}
                    <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                      <EnhancedProductImage
                        src={getProductImages()[currentImageIndex]}
                        alt={product?.name}
                        className="w-full h-full object-cover"
                        debug={true}
                      />
                      
                      {/* Navigation arrows for multiple images */}
                      {getProductImages().length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                          >
                            <ChevronLeft className="h-6 w-6 text-gray-700" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                          >
                            <ChevronRight className="h-6 w-6 text-gray-700" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Thumbnail Gallery */}
                    {getProductImages().length > 1 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900">Product Images</h4>
                        <div className="grid grid-cols-5 gap-3">
                          {getProductImages().map((imageUrl, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                index === currentImageIndex 
                                  ? 'border-blue-500 shadow-lg' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <EnhancedProductThumbnail
                                src={imageUrl}
                                alt={`${product?.name} ${index + 1}`}
                                className="w-full h-full object-cover"
                                debug={true}
                              />
                            </button>
                          ))}
                        </div>
                        <div className="text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                            {currentImageIndex + 1} of {getProductImages().length}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                    <div className="text-center">
                      <ImageIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No product images</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-8 sm:space-y-10 order-2 lg:order-2">
                {/* Status and Category */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      product?.status === 'published' 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {product?.status || 'draft'}
                    </span>
                    {product?.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-lg border">
                    /{product?.slug}
                  </div>
                </div>

                {/* Product Name and Rating */}
                <div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                    {product?.name}
                  </h1>
                  
                  {/* Mock rating for demonstration */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-5 w-5 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">(4.0 out of 5)</span>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="py-6 sm:py-8 border-y border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl px-6">
                  <div className="space-y-3">
                    {product?.percentOff > 0 ? (
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl sm:text-5xl font-bold text-blue-600">
                          {userCurrency}{calculateDiscountedPrice(product.price, product.percentOff).toFixed(2)}
                        </div>
                        <div className="text-2xl text-gray-500 line-through">
                          {userCurrency}{product.price.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-4xl sm:text-5xl font-bold text-blue-600">
                        {userCurrency}{product?.price?.toFixed(2) || '0.00'}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {product?.percentOff > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">
                          <Percent className="h-4 w-4 mr-1" />
                          {product.percentOff}% OFF
                        </span>
                      )}
                      {product?.percentOff > 0 && (
                        <span className="text-lg font-medium text-green-600">
                          Save {userCurrency}{(product.price - calculateDiscountedPrice(product.price, product.percentOff)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {product?.tags?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Tag className="h-5 w-5 text-gray-500" />
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors duration-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8">
                  {product?.productUrl ? (
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
                    >
                      <ShoppingCart className="h-6 w-6 mr-3" />
                      Buy Now
                      <ExternalLink className="h-5 w-5 ml-2" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center px-8 py-4 bg-gray-300 text-gray-500 font-bold rounded-2xl cursor-not-allowed text-lg"
                    >
                      <ShoppingCart className="h-6 w-6 mr-3" />
                      No Purchase Link Available
                    </button>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 border border-gray-300">
                      <Heart className="h-5 w-5 mr-2" />
                      Add to Wishlist
                    </button>
                    <button className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 border border-gray-300">
                      <Share2 className="h-5 w-5 mr-2" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Description */}
            {/* Product Description */}
            {product?.description && (
              <div className="px-6 sm:px-8 lg:px-16 pb-8 lg:pb-16">
                <div className="border-t border-gray-200 pt-8 lg:pt-16">
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">API Data: Product Description</h2>
                  <div className="prose prose-lg sm:prose-xl prose-gray max-w-none markdown-content">
                    <ReactMarkdown>
                      {product.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Product Metadata (API Fields) */}
            <div className="px-6 sm:px-8 lg:px-16 pb-8 lg:pb-16">
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">API Data: Product Metadata</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <Calendar className="h-6 w-6 text-gray-600" />
                      <h4 className="text-lg font-semibold text-gray-900">createdAt Field</h4>
                    </div>
                    <p className="text-gray-700 text-lg">{formatDate(product?.createdAt)}</p>
                  </div>
                  
                  {product?.category && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <Package className="h-6 w-6 text-gray-600" />
                        <h4 className="text-lg font-semibold text-gray-900">category Field</h4>
                      </div>
                      <p className="text-gray-700 text-lg">{product.category}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related Products Section */}
          <RelatedProductsSection 
            allProducts={allProducts}
            currentProductId={product?.id}
            uid={uid}
            blogId={blogId}
            userCurrency={userCurrency}
            formatDate={formatDate}
            calculateDiscountedPrice={calculateDiscountedPrice}
          />
        </main>
      )}
    </div>
  );
}

// Separate component for related products to avoid re-rendering during loading
function RelatedProductsSection({ allProducts, currentProductId, uid, blogId, userCurrency, formatDate, calculateDiscountedPrice }) {
  const relatedProducts = allProducts
    .filter(item => item.id !== currentProductId && item.status === 'published')
    .slice(0, 6);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-20 sm:mt-24 lg:mt-32">
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">Related Products</h2>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          More products from the API
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {relatedProducts.map((item) => {
          const discountedPrice = calculateDiscountedPrice(item.price, item.percentOff);
          const hasDiscount = item.percentOff > 0;
          const mainImage = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : item.imageUrl;
          
          return (
            <Link
              key={item.id}
              to={`/preview/product/${uid}/${blogId}/${item.slug}`}
              className="group block bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              {mainImage ? (
                <div className="relative">
                  <EnhancedProductImage
                    src={mainImage}
                    alt={item.name}
                    className="aspect-[4/3] group-hover:scale-110 transition-transform duration-500"
                    debug={true}
                  />
                  {hasDiscount && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{item.percentOff}%
                    </div>
                  )}
                  {item.imageUrls && item.imageUrls.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium">
                      +{item.imageUrls.length - 1}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Package className="h-16 w-16 text-gray-400" />
                </div>
              )}
              
              <div className="p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                  {item.name}
                </h3>
                
                {/* Pricing */}
                <div className="mb-4 sm:mb-6">
                  {hasDiscount ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-blue-600">
                        {userCurrency}{discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        {userCurrency}{item.price.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-blue-600">
                      {userCurrency}{item.price.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    {item.category && (
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        <span>{item.category}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'published' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      <div className="text-center mt-12 sm:mt-16">
        <Link
          to="/dashboard/manage-products"
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
        >
          Manage Products
          <ArrowLeft className="ml-3 h-6 w-6 transform rotate-180" />
        </Link>
      </div>
    </section>
  );
}

// Enhanced product image components with error handling
function EnhancedProductImage({ src, alt, className = '', debug = false }) {
  const { loading, error, retry } = useImageLoader(src);
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <Package className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-medium text-red-600 mb-2">Image failed to load</p>
          {debug && <p className="text-sm text-red-500 mb-4">{error}</p>}
          <button onClick={retry} className="btn-secondary btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className={`bg-muted rounded-2xl ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading product image...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <FeaturedImage
      src={src}
      alt={alt}
      className={className}
      debug={debug}
    />
  );
}

function EnhancedProductThumbnail({ src, alt, className = '', debug = false }) {
  const { loading, error, retry } = useImageLoader(src);
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center p-2">
          <Package className="h-6 w-6 mx-auto mb-1 text-red-500" />
          <p className="text-xs text-red-600">Failed</p>
          {debug && (
            <button onClick={retry} className="text-xs text-blue-600 hover:underline">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className={`bg-muted rounded-xl ${className}`}>
        <div className="flex items-center justify-center h-full">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  return (
    <GalleryImage
      src={src}
      alt={alt}
      className={className}
      debug={debug}
    />
  );
}