import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Eye, Calendar, TrendingUp, Plus, BarChart3, Package, ShoppingBag } from 'lucide-react';
import { useContentStats } from '@/hooks/useContent';
import { useProductStats } from '@/hooks/useProducts';
import { StatCardSkeleton, DashboardOverviewSkeleton } from '@/components/shared/SkeletonLoader';

export default function OverviewPage({ activeBlogId }) {
  const { stats, loading, error } = useContentStats(activeBlogId);
  const { stats: productStats, loading: productLoading, error: productError } = useProductStats(activeBlogId);
  const { currentUser } = useAuth();

  const statCards = [
    {
      title: 'Total Content',
      value: stats.totalContent,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Published',
      value: stats.publishedContent,
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Drafts',
      value: stats.draftContent,
      icon: Calendar,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Recent (7 days)',
      value: stats.recentContent,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const productStatCards = [
    {
      title: 'Total Products',
      value: productStats.totalProducts,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Published',
      value: productStats.publishedProducts,
      icon: ShoppingBag,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      title: 'Drafts',
      value: productStats.draftProducts,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Recent (7 days)',
      value: productStats.recentProducts,
      icon: TrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    }
  ];



  return (
    <div className="section-spacing">
      <div className="page-header mb-16">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-description">
          Welcome to your dashboard overview
        </p>
      </div>

      {/* Content Statistics */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-foreground mb-8">Blog Content</h2>
        {loading ? (
          <DashboardOverviewSkeleton />
        ) : (
          <div className="grid-responsive-4">
            {statCards.map((stat, index) => (
              <div key={index} className={`card border ${stat.borderColor} ${stat.bgColor}`}>
                <div className="card-content p-8 sm:p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm sm:text-base font-medium text-muted-foreground mb-3 sm:mb-4">{stat.title}</p>
                      <p className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{stat.value}</p>
                    </div>
                    <div className={`p-4 sm:p-5 rounded-full ${stat.bgColor} border ${stat.borderColor}`}>
                      <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
       </div>

      {/* Product Statistics */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-foreground mb-8">Products</h2>
        {productLoading ? (
          <div className="grid-responsive-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid-responsive-4">
            {productStatCards.map((stat, index) => (
              <div key={index} className={`card border ${stat.borderColor} ${stat.bgColor}`}>
                <div className="card-content p-8 sm:p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm sm:text-base font-medium text-muted-foreground mb-3 sm:mb-4">{stat.title}</p>
                      <p className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{stat.value}</p>
                    </div>
                    <div className={`p-4 sm:p-5 rounded-full ${stat.bgColor} border ${stat.borderColor}`}>
                      <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
       </div>

      {/* Quick Actions - Always visible */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
          <p className="card-description">Get started with these common tasks</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Link
              to="/dashboard/create"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">Create Blog Post</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Start writing a new article</p>
            </Link>
            
            <Link
              to="/dashboard/create-product"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">Add Product</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Add a new product to your catalog</p>
            </Link>
            
            <Link
              to="/dashboard/manage"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">Manage Content</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Edit or delete existing content</p>
            </Link>
            
            <Link
              to="/dashboard/manage-products"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">Manage Products</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Edit or delete existing products</p>
            </Link>
            
            <Link
              to="/dashboard/analytics"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">View Analytics</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Track performance and usage</p>
            </Link>
            
            <a
              href={`/users/${currentUser?.uid}/blogs/${activeBlogId}/api/content.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <Eye className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">Content API</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Check your blog content API</p>
            </a>
            
            <a
              href={`/users/${currentUser?.uid}/blogs/${activeBlogId}/api/products.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-8 sm:p-10 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 hover:shadow-md"
            >
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-4">Products API</h3>
              <p className="text-base text-muted-foreground leading-relaxed">Check your products API endpoint</p>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}