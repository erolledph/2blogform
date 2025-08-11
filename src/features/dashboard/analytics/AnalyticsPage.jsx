import React from 'react';
import { useSiteAnalytics, useBackendUsage } from '@/hooks/useAnalytics';
import { BarChart3, TrendingUp, Users, Eye, Database, HardDrive, Wifi, AlertTriangle } from 'lucide-react';
import { StatCardSkeleton, AnalyticsSkeleton } from '@/components/shared/SkeletonLoader';
import DynamicTransition from '@/components/shared/DynamicTransition';

export default function AnalyticsPage({ activeBlogId }) {
  const { analytics: siteAnalytics, loading: siteLoading, error: siteError, refetch: refetchSite } = useSiteAnalytics(activeBlogId);
  const { usage: backendUsage, loading: usageLoading, error: usageError, refetch: refetchUsage } = useBackendUsage(activeBlogId);

  const loading = siteLoading || usageLoading;
  const error = siteError || usageError;


  return (
    <div className="section-spacing">
      <div className="page-header mb-16">
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-description">
          Track your content performance and system usage
        </p>
      </div>

      {/* Site Analytics Overview */}
      {siteLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="card border-blue-200 bg-blue-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-3">Total Views</p>
                  <p className="text-3xl font-bold text-blue-900 leading-none">
                    {siteAnalytics?.totalViews || 0}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card border-green-200 bg-green-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-3">Interactions</p>
                  <p className="text-3xl font-bold text-green-900 leading-none">
                    {siteAnalytics?.totalInteractions || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card border-purple-200 bg-purple-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-3">Unique Sessions</p>
                  <p className="text-3xl font-bold text-purple-900 leading-none">
                    {siteAnalytics?.uniqueSessions || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="card border-orange-200 bg-orange-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-3">Top Content</p>
                  <p className="text-3xl font-bold text-orange-900 leading-none">
                    {siteAnalytics?.topContent?.length || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Top Content */}
        {siteLoading ? (
          <div className="card">
            <div className="card-header">
              <div className="h-6 bg-muted animate-pulse rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            </div>
            <div className="card-content">
              <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-6 bg-muted/30 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-6 bg-muted animate-pulse rounded w-12"></div>
                      <div className="h-3 bg-muted animate-pulse rounded w-8"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Top Performing Content</h2>
              <p className="card-description">
                Most viewed content in the selected period
              </p>
            </div>
            <div className="card-content">
              {siteAnalytics?.topContent && siteAnalytics.topContent.length > 0 ? (
                <div className="space-y-6">
                  {siteAnalytics.topContent.slice(0, 5).map((content, index) => (
                    <div key={content.id} className="flex items-center justify-between p-6 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-foreground truncate mb-1">
                          {content.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {content.status} • {content.author || 'No author'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                          {content.viewCount || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">views</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No content analytics available</p>
                  <p className="text-sm mt-2">Publish some content to see analytics data</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backend Usage */}
        {usageLoading ? (
          <div className="card">
            <div className="card-header">
              <div className="h-6 bg-muted animate-pulse rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            </div>
            <div className="card-content">
              <div className="space-y-8">
                <div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-4"></div>
                  <div className="grid grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="h-6 bg-muted animate-pulse rounded mb-2"></div>
                        <div className="h-3 bg-muted animate-pulse rounded w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4 mb-4"></div>
                  <div className="p-6 bg-muted/30 rounded-lg">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Backend Usage</h2>
              <p className="card-description">
                Firebase and system resource usage
              </p>
            </div>
            <div className="card-content">
              {backendUsage ? (
                <div className="space-y-8">
                  {/* Document Counts */}
                  <div>
                    <h4 className="text-base font-medium text-foreground mb-4">Document Counts</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xl font-bold text-blue-900">
                          {backendUsage.documentCounts?.content || 0}
                        </div>
                        <div className="text-xs text-blue-600">Content</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xl font-bold text-green-900">
                          {backendUsage.documentCounts?.pageViews || 0}
                        </div>
                        <div className="text-xs text-green-600">Page Views</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">
                          {backendUsage.documentCounts?.interactions || 0}
                        </div>
                        <div className="text-xs text-purple-600">Interactions</div>
                      </div>
                    </div>
                  </div>

                  {/* Storage Usage */}
                  {backendUsage.storageUsage && !backendUsage.storageUsage.error && (
                    <div>
                      <h4 className="text-base font-medium text-foreground mb-4">Storage Usage</h4>
                      <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xl font-bold text-orange-900">
                              {backendUsage.storageUsage.estimated ? 'Estimated' : 'Actual'}
                            </div>
                            <div className="text-sm text-orange-600">
                              {backendUsage.storageUsage.contentSize ? 
                                `${(backendUsage.storageUsage.contentSize / 1024).toFixed(1)} KB` : 
                                'No data'
                              }
                            </div>
                          </div>
                          <HardDrive className="h-8 w-8 text-orange-600" />
                        </div>
                        {backendUsage.storageUsage.note && (
                          <p className="text-xs text-orange-600 mt-3">
                            {backendUsage.storageUsage.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Messages */}
                  {(backendUsage.error || backendUsage.note) && (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 font-medium mb-2">Note</p>
                          <p className="text-sm text-amber-700 leading-relaxed">
                            {backendUsage.error || backendUsage.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No backend usage data available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Daily Stats Chart Placeholder */}
      {siteAnalytics?.dailyStats && (
        <DynamicTransition 
          loading={siteLoading} 
          error={siteError}
          skeleton={
            <div className="card">
              <div className="card-header">
                <div className="h-6 bg-muted animate-pulse rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </div>
              <div className="card-content">
                <div className="h-80 bg-muted animate-pulse rounded-lg"></div>
              </div>
            </div>
          }
          transitionType="slide-up"
          delay={200}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Daily Activity</h2>
              <p className="card-description">
                Views and interactions over time
              </p>
            </div>
            <div className="card-content">
              <div className="h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-3">Chart visualization would go here</p>
                  <p className="text-sm text-muted-foreground">
                    Consider integrating a charting library like Recharts for visual analytics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DynamicTransition>
      )}

      {/* Referrer Stats */}
      {siteAnalytics?.referrerStats && Object.keys(siteAnalytics.referrerStats).length > 0 && (
        <DynamicTransition 
          loading={siteLoading} 
          error={siteError}
          skeleton={
            <div className="card">
              <div className="card-header">
                <div className="h-6 bg-muted animate-pulse rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                      </div>
                      <div className="h-4 bg-muted animate-pulse rounded w-8"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
          transitionType="slide-up"
          delay={300}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Traffic Sources</h2>
              <p className="card-description">
                Where your visitors are coming from
              </p>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                {Object.entries(siteAnalytics.referrerStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([referrer, count]) => (
                    <div key={referrer} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                        <span className="text-base font-medium text-foreground">
                          {referrer === 'Direct' ? 'Direct Traffic' : referrer}
                        </span>
                      </div>
                      <div className="text-base font-bold text-primary">{count}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DynamicTransition>
      )}

      {/* Error State for Failed Requests */}
      {(error || usageError) && (
        <div className="card border-red-200 bg-red-50 mt-8">
          <div className="card-content p-8 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-red-500" />
            <h3 className="text-xl font-bold text-red-800 mb-4">Error Loading Analytics</h3>
            <p className="text-red-700 mb-6">{error || usageError}</p>
            <div className="flex justify-center space-x-4">
              <button onClick={refetchSite} className="btn-secondary">
                Retry Site Analytics
              </button>
              <button onClick={refetchUsage} className="btn-secondary">
                Retry Backend Usage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}