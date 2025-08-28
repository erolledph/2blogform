import React from 'react';
import { useSiteAnalytics, useBackendUsage } from '@/hooks/useAnalytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Users, Eye, Database, HardDrive, Wifi, AlertTriangle } from 'lucide-react';
import { StatCardSkeleton } from '@/components/shared/SkeletonLoader';
import DynamicTransition from '@/components/shared/DynamicTransition';

export default function AnalyticsPage({ activeBlogId }) {
  const { analytics: siteAnalytics, loading: siteLoading, error: siteError, refetch: refetchSite } = useSiteAnalytics(activeBlogId);
  const { usage: backendUsage, loading: usageLoading, error: usageError, refetch: refetchUsage } = useBackendUsage(activeBlogId);

  const loading = siteLoading || usageLoading;
  const error = siteError || usageError;

  // Transform daily stats for chart visualization
  const chartData = React.useMemo(() => {
    if (!siteAnalytics?.dailyStats) return [];
    
    return Object.entries(siteAnalytics.dailyStats)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date,
        views: stats.views || 0,
        interactions: stats.interactions || 0,
        total: (stats.views || 0) + (stats.interactions || 0)
      }))
      .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate))
      .slice(-14); // Show last 14 days
  }, [siteAnalytics?.dailyStats]);

  // Transform referrer stats for pie chart
  const referrerChartData = React.useMemo(() => {
    if (!siteAnalytics?.referrerStats) return [];
    
    return Object.entries(siteAnalytics.referrerStats)
      .map(([referrer, count]) => ({
        name: referrer === 'Direct' ? 'Direct Traffic' : referrer,
        value: count,
        percentage: 0 // Will be calculated below
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 referrers
  }, [siteAnalytics?.referrerStats]);

  // Calculate percentages for referrer data
  React.useEffect(() => {
    if (referrerChartData.length > 0) {
      const total = referrerChartData.reduce((sum, item) => sum + item.value, 0);
      referrerChartData.forEach(item => {
        item.percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      });
    }
  }, [referrerChartData]);

  // Chart colors
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
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
                Firebase resource usage estimates
              </p>
            </div>
            <div className="card-content">
              {backendUsage ? (
                <div className="space-y-8">
                  {/* Important Notice */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Usage Data Limitations</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>• Document counts are limited to 100 items per collection due to client-side query constraints</p>
                          <p>• Storage, read, and write estimates are approximations based on available data</p>
                          <p>• For precise billing-level usage data, check your Firebase Console</p>
                          <p>• Consider implementing server-side aggregation for accurate totals</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Counts */}
                  <div>
                    <h4 className="text-base font-medium text-foreground mb-4">Document Counts (Limited to 100 per collection)</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xl font-bold text-blue-900">
                          {backendUsage.documentCounts?.content || 0}
                        </div>
                        <div className="text-xs text-blue-600">Content Items</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xl font-bold text-green-900">
                          {backendUsage.documentCounts?.pageViews || 0}
                        </div>
                        <div className="text-xs text-green-600">Page Views (max 100)</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">
                          {backendUsage.documentCounts?.interactions || 0}
                        </div>
                        <div className="text-xs text-purple-600">Interactions (max 100)</div>
                      </div>
                    </div>
                  </div>

                  {/* Storage Usage */}
                  {backendUsage.storageUsage && !backendUsage.storageUsage.error && (
                    <div>
                      <h4 className="text-base font-medium text-foreground mb-4">Storage Usage (Estimated)</h4>
                      <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xl font-bold text-orange-900">
                              Estimated
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

                  {/* Estimated Operations */}
                  <div>
                    <h4 className="text-base font-medium text-foreground mb-4">Estimated Operations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-indigo-900">
                              {backendUsage.estimatedReads?.approximateReads || 'N/A'}
                            </div>
                            <div className="text-sm text-indigo-600">Estimated Reads</div>
                          </div>
                          <Database className="h-6 w-6 text-indigo-600" />
                        </div>
                        {backendUsage.estimatedReads?.note && (
                          <p className="text-xs text-indigo-600 mt-2">
                            {backendUsage.estimatedReads.note}
                          </p>
                        )}
                      </div>
                      
                      <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-teal-900">
                              {backendUsage.estimatedWrites?.approximateWrites || 'N/A'}
                            </div>
                            <div className="text-sm text-teal-600">Estimated Writes</div>
                          </div>
                          <Database className="h-6 w-6 text-teal-600" />
                        </div>
                        {backendUsage.estimatedWrites?.note && (
                          <p className="text-xs text-teal-600 mt-2">
                            {backendUsage.estimatedWrites.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Error Messages */}
                  {(backendUsage.error || backendUsage.note) && (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 font-medium mb-2">Additional Information</p>
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
                  <p className="text-sm mt-2">Check your Firebase Console for detailed usage statistics</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Summary */}
      {siteAnalytics && (
        <DynamicTransition 
          loading={siteLoading} 
          error={siteError}
          transitionType="slide-up"
          delay={500}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Analytics Summary</h2>
              <p className="card-description">
                Key insights from your content performance
              </p>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                  <div className="flex items-center space-x-3 mb-4">
                    <Eye className="h-6 w-6 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Engagement Rate</h4>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mb-2">
                    {siteAnalytics.totalViews > 0 
                      ? ((siteAnalytics.totalInteractions / siteAnalytics.totalViews) * 100).toFixed(1)
                      : '0'
                    }%
                  </div>
                  <p className="text-sm text-blue-700">
                    {siteAnalytics.totalInteractions} interactions from {siteAnalytics.totalViews} views
                  </p>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="h-6 w-6 text-green-600" />
                    <h4 className="font-semibold text-green-800">Unique Visitors</h4>
                  </div>
                  <div className="text-2xl font-bold text-green-900 mb-2">
                    {siteAnalytics.uniqueSessions || 0}
                  </div>
                  <p className="text-sm text-green-700">
                    Unique sessions tracked
                  </p>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl">
                  <div className="flex items-center space-x-3 mb-4">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                    <h4 className="font-semibold text-purple-800">Avg. Daily Views</h4>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mb-2">
                    {chartData.length > 0 
                      ? Math.round(chartData.reduce((sum, day) => sum + day.views, 0) / chartData.length)
                      : 0
                    }
                  </div>
                  <p className="text-sm text-purple-700">
                    Based on last {chartData.length} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DynamicTransition>
      )}

      {/* Data Quality Notice */}
      <div className="card border-amber-200 bg-amber-50">
        <div className="card-content p-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Analytics Data Quality Notice</h3>
              <div className="text-base text-amber-700 space-y-2">
                <p>
                  The analytics shown here are based on Firebase Firestore data with the following limitations:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Document counts are capped at 100 items per collection due to client-side query limits</li>
                  <li>Page views and interactions are tracked only when visitors access your published content</li>
                  <li>Storage and operation estimates are approximations based on available data</li>
                  <li>For comprehensive analytics, consider integrating Google Analytics or similar tools</li>
                  <li>Precise usage data is available in your Firebase Console under Usage tab</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Daily Activity Chart */}
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
              <h2 className="card-title">Daily Activity (Last 14 Days)</h2>
              <p className="card-description">
                Views and interactions over time
              </p>
            </div>
            <div className="card-content">
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b"
                        fontSize={12}
                        tick={{ fill: '#64748b' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12}
                        tick={{ fill: '#64748b' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ color: '#1f2937' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stackId="1"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorViews)"
                        name="Page Views"
                      />
                      <Area
                        type="monotone"
                        dataKey="interactions"
                        stackId="1"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorInteractions)"
                        name="Interactions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-3">No activity data available</p>
                    <p className="text-sm text-muted-foreground">
                      Publish some content and get visitors to see activity charts
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DynamicTransition>

        {/* Traffic Sources Chart */}
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
              {referrerChartData.length > 0 ? (
                <div className="space-y-6">
                  {/* Pie Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={referrerChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          labelLine={false}
                        >
                          {referrerChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-2">
                    {referrerChartData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          ></div>
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-primary">{item.value}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-3">No traffic source data available</p>
                    <p className="text-sm text-muted-foreground">
                      Traffic sources will appear here as visitors access your content
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DynamicTransition>
      </div>

      {/* Top Content Performance */}
      {siteAnalytics?.topContent && siteAnalytics.topContent.length > 0 && (
        <DynamicTransition 
          loading={siteLoading} 
          error={siteError}
          transitionType="slide-up"
          delay={400}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Top Performing Content</h2>
              <p className="card-description">
                Most viewed content in the selected period
              </p>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                {siteAnalytics.topContent.slice(0, 10).map((content, index) => (
                  <div key={content.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-foreground truncate mb-1">
                          {content.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {content.status} • {content.author || 'No author'}
                        </div>
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
