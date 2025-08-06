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