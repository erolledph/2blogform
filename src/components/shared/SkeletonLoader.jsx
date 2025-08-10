import React from 'react';

export default function SkeletonLoader({ 
  type = 'text', 
  lines = 1, 
  className = '',
  width = 'full',
  height = 'auto'
}) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-muted via-muted/70 to-muted rounded';
  
  const widthClasses = {
    'full': 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4'
  };

  const heightClasses = {
    'auto': 'h-4',
    'sm': 'h-3',
    'md': 'h-6',
    'lg': 'h-8',
    'xl': 'h-12'
  };

  if (type === 'card') {
    return (
      <div className={`${baseClasses} ${className}`}>
        <div className="p-6 space-y-4">
          <div className="h-6 bg-muted/80 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted/60 rounded"></div>
            <div className="h-4 bg-muted/60 rounded w-5/6"></div>
            <div className="h-4 bg-muted/60 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <tr className={className}>
        <td className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-32"></div>
              <div className="h-3 bg-muted/70 rounded w-24"></div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-muted rounded w-20"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-muted rounded w-16"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-muted rounded w-24"></div>
        </td>
        <td className="px-6 py-4">
          <div className="flex space-x-2">
            <div className="w-8 h-8 bg-muted rounded"></div>
            <div className="w-8 h-8 bg-muted rounded"></div>
            <div className="w-8 h-8 bg-muted rounded"></div>
          </div>
        </td>
      </tr>
    );
  }

  if (type === 'image') {
    return (
      <div className={`${baseClasses} ${widthClasses[width]} aspect-square ${className}`}>
        <div className="w-full h-full bg-muted/80 rounded flex items-center justify-center">
          <div className="w-8 h-8 bg-muted/60 rounded"></div>
        </div>
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div className={`${baseClasses} w-12 h-12 rounded-full ${className}`}></div>
    );
  }

  if (type === 'button') {
    return (
      <div className={`${baseClasses} h-10 w-24 ${className}`}></div>
    );
  }

  // Default text skeleton
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${widthClasses[width]} ${heightClasses[height]} ${
            index === lines - 1 && lines > 1 ? 'w-3/4' : ''
          }`}
        ></div>
      ))}
    </div>
  );
}

// Enhanced table skeleton that matches DataTable structure
export function TableSkeleton({ rows = 5, columns = 5, hasSelection = false, hasActions = true }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Search bar skeleton */}
      <div className="p-6 border-b border-border">
        <div className="relative">
          <div className="w-6 h-6 bg-muted rounded absolute left-3 top-1/2 transform -translate-y-1/2"></div>
          <div className="h-12 bg-muted rounded-md pl-12"></div>
        </div>
      </div>

      {/* Table header skeleton */}
      <div className="bg-muted/50 border-b border-border">
        <div className="flex items-center min-h-[60px]">
          {hasSelection && (
            <div className="px-6 py-4 flex-shrink-0">
              <div className="w-4 h-4 bg-muted rounded"></div>
            </div>
          )}
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="px-6 py-4 flex-1">
              <div className="flex items-center space-x-2">
                <div className={`h-4 bg-muted rounded ${
                  index === 0 ? 'w-20' : 
                  index === 1 ? 'w-24' : 
                  index === 2 ? 'w-16' : 
                  index === 3 ? 'w-20' : 'w-18'
                }`}></div>
                <div className="w-4 h-4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
          {hasActions && (
            <div className="px-6 py-4 w-32">
              <div className="h-4 bg-muted rounded w-16"></div>
            </div>
          )}
        </div>
      </div>

      {/* Table rows skeleton */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center min-h-[60px] hover:bg-muted/30">
            {hasSelection && (
              <div className="px-6 py-4 flex-shrink-0">
                <div className="w-4 h-4 bg-muted rounded"></div>
              </div>
            )}
            
            {/* Image column */}
            <div className="px-6 py-4 flex-shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-md"></div>
            </div>
            
            {/* Title/Name column */}
            <div className="px-6 py-4 flex-1 min-w-0">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted/70 rounded w-1/2"></div>
              </div>
            </div>
            
            {/* Status column */}
            <div className="px-6 py-4 flex-shrink-0">
              <div className="h-6 bg-muted rounded-full w-16"></div>
            </div>
            
            {/* Additional columns */}
            {Array.from({ length: Math.max(0, columns - 3) }).map((_, colIndex) => (
              <div key={colIndex} className="px-6 py-4 flex-shrink-0">
                <div className={`h-4 bg-muted rounded ${
                  colIndex === 0 ? 'w-20' : 
                  colIndex === 1 ? 'w-24' : 'w-16'
                }`}></div>
              </div>
            ))}
            
            {/* Actions column */}
            {hasActions && (
              <div className="px-6 py-4 w-32">
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div className="w-8 h-8 bg-muted rounded"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <div className="h-4 bg-muted rounded w-48"></div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="w-8 h-8 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Enhanced card grid skeleton
export function CardGridSkeleton({ cards = 6, cardType = 'default' }) {
  if (cardType === 'stat') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Array.from({ length: cards }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (cardType === 'content') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: cards }).map((_, index) => (
          <ContentCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: cards }).map((_, index) => (
        <SkeletonLoader key={index} type="card" />
      ))}
    </div>
  );
}

// Accurate stat card skeleton matching the real component
export function StatCardSkeleton() {
  return (
    <div className="card border-muted bg-muted/20">
      <div className="card-content p-8 sm:p-10">
        <div className="flex items-center justify-between">
          <div className="space-y-3 sm:space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
            <div className="h-8 sm:h-10 bg-muted animate-pulse rounded w-16"></div>
          </div>
          <div className="p-4 sm:p-5 bg-muted animate-pulse rounded-full">
            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-muted/70 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content card skeleton for preview pages
export function ContentCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-muted animate-pulse"></div>
      
      {/* Content skeleton */}
      <div className="p-6 sm:p-8 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 bg-muted animate-pulse rounded w-full"></div>
          <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-muted/70 animate-pulse rounded w-full"></div>
          <div className="h-4 bg-muted/70 animate-pulse rounded w-5/6"></div>
          <div className="h-4 bg-muted/70 animate-pulse rounded w-4/6"></div>
        </div>
        
        {/* Meta info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
            </div>
          </div>
          <div className="h-5 bg-muted animate-pulse rounded-full w-16"></div>
        </div>
      </div>
    </div>
  );
}

// Specialized skeleton for content preview pages
export function ContentPreviewSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 lg:p-16">
          <article className="max-w-4xl mx-auto">
            {/* Article Header Skeleton */}
            <header className="mb-12 sm:mb-16 lg:mb-20">
              {/* Status and Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-12">
                <div className="flex items-center space-x-3">
                  <div className="h-8 bg-muted animate-pulse rounded-full w-20"></div>
                  <div className="h-8 bg-muted animate-pulse rounded-full w-24"></div>
                </div>
                <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
              </div>

              {/* Title Skeleton */}
              <div className="mb-8 sm:mb-12 space-y-4">
                <div className="h-12 sm:h-16 md:h-20 lg:h-24 bg-muted animate-pulse rounded w-full"></div>
                <div className="h-12 sm:h-16 md:h-20 lg:h-24 bg-muted animate-pulse rounded w-3/4"></div>
              </div>

              {/* Meta Information Skeleton */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted animate-pulse rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    <div className="h-3 bg-muted/70 animate-pulse rounded w-16"></div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-muted animate-pulse rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    <div className="h-3 bg-muted/70 animate-pulse rounded w-16"></div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-muted animate-pulse rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                    <div className="h-3 bg-muted/70 animate-pulse rounded w-12"></div>
                  </div>
                </div>
              </div>

              {/* Tags Skeleton */}
              <div className="flex flex-wrap items-center gap-3 mb-8 sm:mb-12">
                <div className="w-5 h-5 bg-muted animate-pulse rounded"></div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 bg-muted animate-pulse rounded-full w-16"></div>
                  ))}
                </div>
              </div>
            </header>

            {/* Featured Image Skeleton */}
            <div className="mb-12 sm:mb-16 lg:mb-20">
              <div className="w-full h-64 sm:h-80 lg:h-96 bg-muted animate-pulse rounded-xl shadow-2xl"></div>
            </div>

            {/* Content Body Skeleton */}
            <div className="mb-12 sm:mb-16 lg:mb-20">
              <div className="prose prose-lg sm:prose-xl prose-gray max-w-none space-y-6">
                {/* Paragraph skeletons with varying widths */}
                <div className="space-y-4">
                  <div className="h-6 bg-muted animate-pulse rounded w-full"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-5/6"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-4/5"></div>
                </div>
                
                {/* Heading skeleton */}
                <div className="h-8 bg-muted animate-pulse rounded w-2/3 mt-8"></div>
                
                {/* More paragraph skeletons */}
                <div className="space-y-4">
                  <div className="h-6 bg-muted animate-pulse rounded w-full"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-4/5"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-5/6"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
                </div>
                
                {/* List skeleton */}
                <div className="space-y-3 mt-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-muted animate-pulse rounded-full"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-4/5"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* API Data Sections Skeleton */}
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            {/* Meta Description Section */}
            <div className="border-t border-gray-200 pt-8 lg:pt-16">
              <div className="h-8 bg-muted animate-pulse rounded w-64 mb-8"></div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-muted animate-pulse rounded-lg"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-48"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-5 bg-muted/70 animate-pulse rounded w-full"></div>
                  <div className="h-5 bg-muted/70 animate-pulse rounded w-4/5"></div>
                </div>
              </div>
            </div>

            {/* SEO Section */}
            <div className="border-t border-gray-200 pt-8">
              <div className="h-8 bg-muted animate-pulse rounded w-48 mb-8"></div>
              <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    <div className="h-4 bg-muted/70 animate-pulse rounded w-64"></div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-6 bg-muted animate-pulse rounded-full w-16"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Content Section */}
      <section className="mt-20 sm:mt-24 lg:mt-32">
        <div className="text-center mb-12 sm:mb-16">
          <div className="h-10 sm:h-12 lg:h-14 bg-muted animate-pulse rounded w-64 mx-auto mb-4 sm:mb-6"></div>
          <div className="h-5 sm:h-6 bg-muted/70 animate-pulse rounded w-96 mx-auto"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {Array.from({ length: 6 }).map((_, index) => (
            <ContentCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Specialized skeleton for product preview pages
export function ProductPreviewSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-6 sm:p-8 lg:p-16">
          
          {/* Product Image Gallery Skeleton */}
          <div className="space-y-6 order-1 lg:order-1">
            {/* Main Image */}
            <div className="aspect-square bg-muted animate-pulse rounded-2xl shadow-lg"></div>
            
            {/* Thumbnail Gallery */}
            <div className="space-y-4">
              <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl"></div>
                ))}
              </div>
              <div className="text-center">
                <div className="h-6 bg-muted animate-pulse rounded-full w-20 mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Product Details Skeleton */}
          <div className="space-y-8 sm:space-y-10 order-2 lg:order-2">
            {/* Status and Category */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 bg-muted animate-pulse rounded-full w-20"></div>
                <div className="h-8 bg-muted animate-pulse rounded-full w-24"></div>
              </div>
              <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
            </div>

            {/* Product Name and Rating */}
            <div>
              <div className="mb-4 sm:mb-6 space-y-4">
                <div className="h-12 sm:h-16 md:h-20 bg-muted animate-pulse rounded w-full"></div>
                <div className="h-12 sm:h-16 md:h-20 bg-muted animate-pulse rounded w-3/4"></div>
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-5 h-5 bg-muted animate-pulse rounded"></div>
                  ))}
                </div>
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              </div>
            </div>

            {/* Pricing Skeleton */}
            <div className="py-6 sm:py-8 border-y border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl px-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="h-12 sm:h-16 bg-muted animate-pulse rounded w-32"></div>
                  <div className="h-8 bg-muted animate-pulse rounded w-24"></div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-6 bg-muted animate-pulse rounded-full w-20"></div>
                  <div className="h-5 bg-muted animate-pulse rounded w-28"></div>
                </div>
              </div>
            </div>

            {/* Tags Skeleton */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-5 h-5 bg-muted animate-pulse rounded"></div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-6 bg-muted animate-pulse rounded-full w-16"></div>
                ))}
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8">
              <div className="h-14 bg-muted animate-pulse rounded-2xl w-full"></div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="h-12 bg-muted animate-pulse rounded-xl flex-1"></div>
                <div className="h-12 bg-muted animate-pulse rounded-xl flex-1"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description Skeleton */}
        <div className="px-6 sm:px-8 lg:px-16 pb-8 lg:pb-16">
          <div className="border-t border-gray-200 pt-8 lg:pt-16">
            <div className="h-8 bg-muted animate-pulse rounded w-64 mb-8"></div>
            <div className="prose prose-lg sm:prose-xl prose-gray max-w-none space-y-6">
              {/* Multiple paragraph skeletons */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-6 bg-muted animate-pulse rounded w-full"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-5/6"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-4/5"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Metadata Skeleton */}
        <div className="px-6 sm:px-8 lg:px-16 pb-8 lg:pb-16">
          <div className="border-t border-gray-200 pt-8">
            <div className="h-8 bg-muted animate-pulse rounded w-56 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 bg-muted animate-pulse rounded"></div>
                  <div className="h-5 bg-muted animate-pulse rounded w-32"></div>
                </div>
                <div className="h-5 bg-muted/70 animate-pulse rounded w-24"></div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 bg-muted animate-pulse rounded"></div>
                  <div className="h-5 bg-muted animate-pulse rounded w-28"></div>
                </div>
                <div className="h-5 bg-muted/70 animate-pulse rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section Skeleton */}
      <section className="mt-20 sm:mt-24 lg:mt-32">
        <div className="text-center mb-12 sm:mb-16">
          <div className="h-10 sm:h-12 lg:h-14 bg-muted animate-pulse rounded w-64 mx-auto mb-4 sm:mb-6"></div>
          <div className="h-5 sm:h-6 bg-muted/70 animate-pulse rounded w-80 mx-auto"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Product card skeleton for related products
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Image with discount badge skeleton */}
      <div className="relative">
        <div className="aspect-[4/3] bg-muted animate-pulse"></div>
        <div className="absolute top-4 left-4 h-6 bg-muted animate-pulse rounded-full w-12"></div>
        <div className="absolute top-4 right-4 h-5 bg-muted animate-pulse rounded-full w-6"></div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-6 sm:p-8 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 bg-muted animate-pulse rounded w-full"></div>
          <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
        </div>
        
        {/* Pricing */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
            <div className="h-5 bg-muted/70 animate-pulse rounded w-16"></div>
          </div>
        </div>
        
        {/* Meta info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
            </div>
          </div>
          <div className="h-5 bg-muted animate-pulse rounded-full w-16"></div>
        </div>
      </div>
    </div>
  );
}

// Specialized skeleton for account settings forms
export function AccountSettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Profile Information Skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-muted animate-pulse rounded-lg">
              <div className="h-8 w-8 bg-muted/70 rounded"></div>
            </div>
            <div className="h-6 bg-muted animate-pulse rounded w-40"></div>
          </div>
          <div className="h-4 bg-muted/70 animate-pulse rounded w-64 mt-2"></div>
        </div>
        <div className="card-content space-y-8">
          {/* Form fields */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
            </div>
          ))}
          <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
        </div>
      </div>

      {/* User Information Skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-muted animate-pulse rounded-lg">
              <div className="h-8 w-8 bg-muted/70 rounded"></div>
            </div>
            <div className="h-6 bg-muted animate-pulse rounded w-36"></div>
          </div>
          <div className="h-4 bg-muted/70 animate-pulse rounded w-56 mt-2"></div>
        </div>
        <div className="card-content space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-28"></div>
              <div className="h-12 bg-muted animate-pulse rounded-md w-full opacity-75"></div>
              <div className="h-3 bg-muted/70 animate-pulse rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Currency Settings Skeleton */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-muted animate-pulse rounded-lg">
              <div className="h-8 w-8 bg-muted/70 rounded"></div>
            </div>
            <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
          </div>
          <div className="h-4 bg-muted/70 animate-pulse rounded w-72 mt-2"></div>
        </div>
        <div className="card-content space-y-8">
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded w-28"></div>
            <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
          </div>
          <div className="p-6 bg-muted/30 rounded-lg border border-border">
            <div className="h-4 bg-muted animate-pulse rounded w-16 mb-3"></div>
            <div className="h-5 bg-muted/70 animate-pulse rounded w-32"></div>
          </div>
          <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
        </div>
      </div>
    </div>
  );
}

// File storage page skeleton
export function FileStorageSkeleton() {
  return (
    <div className="space-y-12">
      {/* Header skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div>
          <div className="h-10 lg:h-12 bg-muted animate-pulse rounded w-48 mb-6"></div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded w-24"></div>
          ))}
        </div>
      </div>

      {/* Breadcrumb skeleton */}
      <div className="flex items-center space-x-3 p-4 bg-muted/20 rounded-lg">
        <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
        <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
        <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
        <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
        <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
      </div>

      {/* Storage overview skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      {/* File table skeleton */}
      <TableSkeleton rows={10} columns={6} hasActions={true} />
    </div>
  );
}

// Analytics page skeleton
export function AnalyticsSkeleton() {
  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header mb-16">
        <div className="h-10 lg:h-12 bg-muted animate-pulse rounded w-64 mb-6"></div>
        <div className="h-5 bg-muted/70 animate-pulse rounded w-96"></div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      {/* Charts and content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Chart skeleton */}
        <div className="card">
          <div className="card-header">
            <div className="h-6 bg-muted animate-pulse rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted/70 animate-pulse rounded w-64"></div>
          </div>
          <div className="card-content">
            <div className="h-80 bg-muted/30 animate-pulse rounded-lg"></div>
          </div>
        </div>

        {/* List skeleton */}
        <div className="card">
          <div className="card-header">
            <div className="h-6 bg-muted animate-pulse rounded w-40 mb-2"></div>
            <div className="h-4 bg-muted/70 animate-pulse rounded w-56"></div>
          </div>
          <div className="card-content">
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-6 bg-muted/30 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-3 bg-muted/70 animate-pulse rounded w-1/2"></div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-6 bg-muted animate-pulse rounded w-12"></div>
                    <div className="h-3 bg-muted/70 animate-pulse rounded w-8"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard overview skeleton
export function DashboardOverviewSkeleton() {
  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header mb-16">
        <div className="h-10 lg:h-12 bg-muted animate-pulse rounded w-56 mb-6"></div>
        <div className="h-5 bg-muted/70 animate-pulse rounded w-80"></div>
      </div>

      {/* Content stats */}
      <div className="mb-16">
        <div className="h-8 bg-muted animate-pulse rounded w-32 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </div>

      {/* Product stats */}
      <div className="mb-16">
        <div className="h-8 bg-muted animate-pulse rounded w-24 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 bg-muted animate-pulse rounded w-32 mb-2"></div>
          <div className="h-4 bg-muted/70 animate-pulse rounded w-56"></div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="p-8 sm:p-10 border border-border rounded-xl">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-muted animate-pulse rounded mb-6"></div>
                <div className="h-5 bg-muted animate-pulse rounded w-32 mb-4"></div>
                <div className="h-4 bg-muted/70 animate-pulse rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Form skeleton for create/edit pages
export function FormSkeleton({ sections = 3, fieldsPerSection = 3 }) {
  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header mb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <div className="h-10 lg:h-12 bg-muted animate-pulse rounded w-48 mb-6"></div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-6 pt-8 border-t border-border">
          <div className="h-12 bg-muted animate-pulse rounded w-24"></div>
          <div className="h-12 bg-muted animate-pulse rounded w-32"></div>
        </div>
      </div>

      {/* Form sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 lg:gap-12">
        <div className="xl:col-span-2 space-y-10">
          {Array.from({ length: sections }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="card">
              <div className="card-header">
                <div className="h-6 bg-muted animate-pulse rounded w-40"></div>
              </div>
              <div className="card-content space-y-8">
                {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card">
              <div className="card-header">
                <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
              </div>
              <div className="card-content space-y-6">
                {Array.from({ length: 2 }).map((_, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// User management skeleton
export function UserManagementSkeleton() {
  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header mb-16">
        <div className="h-10 lg:h-12 bg-muted animate-pulse rounded w-48 mb-6"></div>
        <div className="h-5 bg-muted/70 animate-pulse rounded w-80"></div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      {/* Users table */}
      <TableSkeleton rows={10} columns={7} hasSelection={false} hasActions={true} />
    </div>
  );
}

// Loading state for individual components
export function ComponentSkeleton({ type = 'default', className = '' }) {
  switch (type) {
    case 'sidebar':
      return (
        <div className={`w-16 bg-muted/50 h-screen ${className}`}>
          <div className="p-4 space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded"></div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      );
      
    case 'header':
      return (
        <div className={`h-16 bg-muted/50 border-b border-border ${className}`}>
          <div className="flex items-center justify-between h-full px-6">
            <div className="h-6 bg-muted animate-pulse rounded w-8"></div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
              <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      );
      
    case 'modal':
      return (
        <div className={`bg-white rounded-xl shadow-xl border border-border ${className}`}>
          <div className="flex items-center justify-between p-8 border-b border-border">
            <div className="h-6 bg-muted animate-pulse rounded w-48"></div>
            <div className="w-6 h-6 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="p-8 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end space-x-4 p-8 pt-6 border-t border-border">
            <div className="h-10 bg-muted animate-pulse rounded w-20"></div>
            <div className="h-10 bg-muted animate-pulse rounded w-24"></div>
          </div>
        </div>
      );
      
    default:
      return (
        <div className={`space-y-4 ${className}`}>
          <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
        </div>
      );
  }
}

// Staggered skeleton animation for lists
export function StaggeredSkeleton({ items = 5, delay = 100, children }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse"
          style={{ 
            animationDelay: `${index * delay}ms`,
            animationDuration: '1.5s'
          }}
        >
          {children || (
            <div className="h-16 bg-muted rounded-lg"></div>
          )}
        </div>
      ))}
    </div>
  );
}