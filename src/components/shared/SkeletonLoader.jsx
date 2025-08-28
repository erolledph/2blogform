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

// Specialized skeleton components
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-4">
                <SkeletonLoader width="3/4" height="sm" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background divide-y divide-border">
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonLoader key={index} type="table-row" />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: cards }).map((_, index) => (
        <SkeletonLoader key={index} type="card" />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card">
      <div className="card-content p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonLoader width="1/2" height="sm" />
            <SkeletonLoader width="1/3" height="xl" />
          </div>
          <div className="w-12 h-12 bg-muted rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

// Specialized skeleton for content preview pages
export function ContentPreviewSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <article className="max-w-4xl mx-auto">
        {/* Article Header Skeleton */}
        <header className="mb-12 sm:mb-16 lg:mb-20">
          {/* Status and Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-12">
            <div className="flex items-center space-x-3">
              <SkeletonLoader width="1/4" height="md" className="rounded-full" />
              <SkeletonLoader width="1/4" height="md" className="rounded-full" />
            </div>
            <SkeletonLoader width="1/3" height="sm" className="rounded-lg" />
          </div>

          {/* Title Skeleton */}
          <div className="mb-8 sm:mb-12">
            <SkeletonLoader width="full" height="xl" className="mb-4" />
            <SkeletonLoader width="3/4" height="xl" />
          </div>

          {/* Meta Information Skeleton */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <SkeletonLoader type="avatar" className="w-12 h-12 sm:w-14 sm:h-14" />
              <div className="space-y-2">
                <SkeletonLoader width="1/2" />
                <SkeletonLoader width="1/3" height="sm" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <SkeletonLoader type="avatar" className="w-8 h-8 rounded-lg" />
              <div className="space-y-2">
                <SkeletonLoader width="1/2" />
                <SkeletonLoader width="1/3" height="sm" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <SkeletonLoader type="avatar" className="w-8 h-8 rounded-lg" />
              <div className="space-y-2">
                <SkeletonLoader width="1/2" />
                <SkeletonLoader width="1/3" height="sm" />
              </div>
            </div>
          </div>

          {/* Tags Skeleton */}
          <div className="flex flex-wrap items-center gap-3 mb-8 sm:mb-12">
            <SkeletonLoader type="avatar" className="w-5 h-5" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLoader key={i} width="1/4" height="sm" className="rounded-full" />
              ))}
            </div>
          </div>
        </header>

        {/* Featured Image Skeleton */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <SkeletonLoader type="image" className="w-full max-h-[70vh] shadow-2xl rounded-xl" />
        </div>

        {/* Content Body Skeleton */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <div className="prose prose-lg sm:prose-xl prose-gray max-w-none">
            <SkeletonLoader lines={12} className="space-y-4" />
          </div>
        </div>
      </article>
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
            <SkeletonLoader type="image" className="aspect-square w-full shadow-lg rounded-2xl" />
            
            {/* Thumbnail Gallery */}
            <div className="space-y-4">
              <SkeletonLoader width="1/3" height="lg" />
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonLoader key={i} type="image" className="aspect-square rounded-xl" />
                ))}
              </div>
              <div className="text-center">
                <SkeletonLoader width="1/4" height="sm" className="rounded-full mx-auto" />
              </div>
            </div>
          </div>

          {/* Product Details Skeleton */}
          <div className="space-y-8 sm:space-y-10 order-2 lg:order-2">
            {/* Status and Category */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <SkeletonLoader width="1/4" height="md" className="rounded-full" />
                <SkeletonLoader width="1/4" height="md" className="rounded-full" />
              </div>
              <SkeletonLoader width="1/3" height="sm" className="rounded-lg" />
            </div>

            {/* Product Name and Rating */}
            <div>
              <div className="mb-4 sm:mb-6">
                <SkeletonLoader width="full" height="xl" className="mb-4" />
                <SkeletonLoader width="3/4" height="xl" />
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonLoader key={i} className="w-5 h-5 rounded" />
                  ))}
                </div>
                <SkeletonLoader width="1/4" height="sm" />
              </div>
            </div>

            {/* Pricing Skeleton */}
            <div className="py-6 sm:py-8 border-y border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl px-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <SkeletonLoader width="1/3" height="xl" />
                  <SkeletonLoader width="1/4" height="lg" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SkeletonLoader width="1/4" height="md" className="rounded-full" />
                  <SkeletonLoader width="1/3" height="sm" />
                </div>
              </div>
            </div>

            {/* Tags Skeleton */}
            <div className="flex flex-wrap items-center gap-3">
              <SkeletonLoader width="1/6" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonLoader key={i} width="1/4" height="sm" className="rounded-full" />
                ))}
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8">
              <SkeletonLoader type="button" className="w-full h-14 rounded-2xl" />
              <div className="flex flex-col sm:flex-row gap-3">
                <SkeletonLoader type="button" className="flex-1 h-12 rounded-xl" />
                <SkeletonLoader type="button" className="flex-1 h-12 rounded-xl" />
              </div>
            </div>
          </div>
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
        <div className="card-content">
          <div className="space-y-6">
            <div className="space-y-4">
              <SkeletonLoader width="1/3" height="sm" />
              <SkeletonLoader type="button" className="w-full h-12" />
            </div>
            <div className="space-y-4">
              <SkeletonLoader width="1/4" height="sm" />
              <SkeletonLoader className="w-full h-24 rounded-md" />
            </div>
            <div className="space-y-4">
              <SkeletonLoader width="1/3" height="sm" />
              <SkeletonLoader type="button" className="w-full h-12" />
            </div>
            <div className="space-y-4">
              <SkeletonLoader width="1/4" height="sm" />
              <SkeletonLoader type="button" className="w-full h-12" />
            </div>
            <SkeletonLoader type="button" className="w-full h-12" />
          </div>
        </div>
      </div>

      {/* User Information Skeleton */}
      <div className="card">
        <div className="card-content space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <SkeletonLoader width="1/3" height="sm" />
              <SkeletonLoader type="button" className="w-full h-12 opacity-75" />
              <SkeletonLoader width="3/4" height="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Currency Settings Skeleton */}
      <div className="card">
        <div className="card-content">
          <div className="space-y-6">
            <div className="space-y-4">
              <SkeletonLoader width="1/3" height="sm" />
              <SkeletonLoader type="button" className="w-full h-12" />
            </div>
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <SkeletonLoader width="1/4" height="sm" className="mb-2" />
              <SkeletonLoader width="1/2" />
            </div>
            <SkeletonLoader type="button" className="w-full h-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
