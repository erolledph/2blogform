import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Eye, Package, Calendar, Star, ShoppingCart, Truck, Shield, RotateCcw, Heart, Share2 } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function ProductPreviewPage() {
  const { uid, blogId, slug } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [uid, blogId, slug]);

  // Get product images - prioritize imageUrls array, fallback to single imageUrl
  const productImages = useMemo(() => {
    if (!product) return [];
    
    if (product.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    
    if (product.imageUrl) {
      return [product.imageUrl];
    }
    
    return [];
  }, [product]);

  // Reset selected image index when product or images change
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${window.location.origin}/users/${uid}/blogs/${blogId}/api/products.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const allProductsData = await response.json();
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

  const formatPrice = (price) => {
    const currency = product?.currency || '$';
    
    // For currency symbols, just prepend/append the symbol
    if (currency.length <= 3 && !currency.match(/^[A-Z]{3}$/)) {
      // Handle special cases for currency placement
      if (['€', '£', '¥', '₹', '₦', '₱', '₡', '₪', '₫', '₴', '₸', '₼', '₾', '﷼', '₿', 'Ξ'].includes(currency)) {
        return `${currency}${price.toFixed(2)}`;
      } else if (['kr', 'zł', 'Kč', 'Ft', 'lei', 'лв', 'kn', 'din'].includes(currency)) {
        return `${price.toFixed(2)} ${currency}`;
      } else {
        return `${currency}${price.toFixed(2)}`;
      }
    }
    
    // For ISO currency codes, try to use Intl.NumberFormat
    try {
      const currencyMap = {
        'CHF': 'CHF',
        'NOK': 'NOK', 
        'DKK': 'DKK',
        'SEK': 'SEK'
      };
      
      if (currencyMap[currency]) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currencyMap[currency]
        }).format(price);
      }
    } catch (error) {
      console.warn('Currency formatting error:', error);
    }
    
    // Fallback to simple formatting
    return `${currency}${price.toFixed(2)}`;
  };

  const getRelatedProducts = () => {
    return allProducts
      .filter(item => item.id !== product?.id && item.status === 'published')
      .slice(0, 8);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-lg w-full text-center p-8">
          <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-8 text-lg">{error}</p>
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

  const hasDiscount = product?.percentOff && product.percentOff > 0;
  const discountedPrice = hasDiscount ? product.discountedPrice : product?.originalPrice;
  const savings = hasDiscount ? product.savings : 0;
  const relatedProducts = getRelatedProducts();

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

      {/* Main Product Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-6 sm:p-8 lg:p-16">
            
            {/* Enhanced Product Image Gallery */}
            <div className="space-y-6 order-1 lg:order-1">
              {/* Main Image */}
              {productImages.length > 0 ? (
                <div className="aspect-square w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-lg">
                  <img
                    src={productImages[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-opacity duration-300 hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl border border-gray-200 flex items-center justify-center shadow-lg">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
              )}
              
              {/* Enhanced Thumbnail Gallery */}
              {productImages.length > 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">More Views</h4>
                  <div className={`grid gap-3 ${
                    productImages.length === 2 ? 'grid-cols-2' :
                    productImages.length === 3 ? 'grid-cols-3' :
                    productImages.length === 4 ? 'grid-cols-4' :
                    'grid-cols-5'
                  }`}>
                    {productImages.map((imageUrl, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-square overflow-hidden rounded-xl border-2 transition-all duration-200 shadow-md hover:shadow-lg ${
                          selectedImageIndex === index 
                            ? 'border-blue-500 ring-4 ring-blue-200 scale-105' 
                            : 'border-gray-200 hover:border-gray-300 hover:scale-102'
                        }`}
                      >
                        <img
                          src={imageUrl}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  
                  {/* Enhanced Image Counter */}
                  <div className="text-center">
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full border border-gray-200">
                      {selectedImageIndex + 1} of {productImages.length}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Product Details */}
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

              {/* Enhanced Product Name */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
                  {product?.name}
                </h1>
                
                {/* Rating Placeholder */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm">(4.8 out of 5)</span>
                </div>
              </div>

              {/* Enhanced Pricing */}
              <div className="space-y-4 sm:space-y-6 py-6 sm:py-8 border-y border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl px-6">
                {hasDiscount ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-600">
                        {formatPrice(discountedPrice)}
                      </span>
                      <span className="text-xl sm:text-2xl lg:text-3xl text-gray-500 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-red-100 text-red-800 border border-red-200">
                        {product.percentOff}% OFF
                      </span>
                      <span className="text-base text-gray-600 font-medium">
                        You save {formatPrice(savings)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                    {formatPrice(product?.originalPrice || 0)}
                  </span>
                )}
                
                <p className="text-base text-gray-600 font-medium">
                  {product?.status === 'published' ? '✅ Available for purchase' : '⏳ Coming soon'}
                </p>
              </div>

              {/* Enhanced Tags */}
              {product?.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-base font-semibold text-gray-700">Tags:</span>
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

              {/* Enhanced Action Buttons */}
              <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8">
                {product?.productUrl && (
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg sm:text-xl font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <ShoppingCart className="h-6 w-6 mr-3" />
                    Buy Now - {formatPrice(discountedPrice)}
                  </a>
                )}
                
                {/* Secondary Actions */}
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
                
                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Truck className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">Free Shipping</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">Secure Payment</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <RotateCcw className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">Easy Returns</p>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center space-x-3 pt-6 border-t border-gray-200 text-sm">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-gray-600">Added {formatDate(product?.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Enhanced Product Description */}
          {product?.description && (
            <div className="border-t border-gray-200 p-6 sm:p-8 lg:p-16 bg-gradient-to-br from-gray-50 to-white">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">Product Description</h2>
              <div className="prose prose-lg sm:prose-xl max-w-none markdown-content">
                <ReactMarkdown>
                  {product.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Enhanced Product Information */}
          <div className="border-t border-gray-200 p-6 sm:p-8 lg:p-16 bg-gray-50">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Product Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-base font-semibold text-gray-700">Product ID:</span>
                  <span className="text-base text-gray-600 font-mono text-sm break-all">{product?.id}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-base font-semibold text-gray-700">Status:</span>
                  <span className="text-base text-gray-600 capitalize">{product?.status}</span>
                </div>
                {product?.category && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-base font-semibold text-gray-700">Category:</span>
                    <span className="text-base text-gray-600">{product.category}</span>
                  </div>
                )}
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-base font-semibold text-gray-700">Created:</span>
                  <span className="text-base text-gray-600">{formatDate(product?.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-base font-semibold text-gray-700">Last Updated:</span>
                  <span className="text-base text-gray-600">{formatDate(product?.updatedAt)}</span>
                </div>
                {product?.productUrl && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-base font-semibold text-gray-700">External Link:</span>
                    <a 
                      href={product.productUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-base text-blue-600 hover:text-blue-800 underline truncate max-w-48"
                    >
                      View Product
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 sm:mt-24 lg:mt-32">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">Related Products</h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                Other products you might be interested in
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {relatedProducts.map((item) => {
                const itemHasDiscount = item.percentOff && item.percentOff > 0;
                const itemDiscountedPrice = itemHasDiscount ? item.discountedPrice : item.originalPrice;
                
                return (
                  <Link
                    key={item.id}
                    to={`/preview/product/${uid}/${blogId}/${item.slug}`}
                    className="group block bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                  >
                    {(item.imageUrls && item.imageUrls.length > 0) || item.imageUrl ? (
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={(item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                        {item.name}
                      </h3>
                      
                      <div className="mb-3 sm:mb-4">
                        {itemHasDiscount ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg sm:text-xl font-bold text-green-600">
                                {formatPrice(itemDiscountedPrice)}
                              </span>
                              <span className="text-sm line-through text-gray-500">
                                {formatPrice(item.originalPrice)}
                              </span>
                            </div>
                            <div className="text-xs text-red-600 font-semibold">
                              {item.percentOff}% OFF
                            </div>
                          </div>
                        ) : (
                          <span className="text-lg sm:text-xl font-bold text-gray-900">
                            {formatPrice(item.originalPrice)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500">
                        {item.category && (
                          <span className="truncate font-medium">{item.category}</span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
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
                View All Products
                <ArrowLeft className="ml-3 h-6 w-6 transform rotate-180" />
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}