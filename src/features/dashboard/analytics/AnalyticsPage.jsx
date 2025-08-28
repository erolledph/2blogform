import React from 'react';
import { useSiteAnalytics, useBackendUsage } from '@/hooks/useAnalytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Users, Eye, Wifi, AlertTriangle } from 'lucide-react';
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
    <div className="section-spacing px-4 sm:px-6 lg:px-8">
      <div className="page-header mb-8 sm:mb-12 lg:mb-16">
        <h1 className="page-title text-2xl sm:text-3xl lg:text-4xl">Analytics Dashboard</h1>
        <p className="page-description text-sm sm:text-base">
          Track your content performance
        </p>
      </div>

      {/* Site Analytics Overview */}
      {siteLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          <div className="card border-blue-200 bg-blue-50">
            <div className="card-content p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-2 sm:mb-3">Total Views</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 leading-none">
                    {siteAnalytics?.totalViews || 0}
                  </p>
                </div>
                <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card border-green-200 bg-green-50">
            <div className="card-content p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-2 sm:mb-3">Interactions</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-900 leading-none">
                    {siteAnalytics?.totalInteractions || 0}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card border-purple-200 bg-purple-50">
            <div className="card-content p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-2 sm:mb-3">Unique Sessions</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-900 leading-none">
                    {siteAnalytics?.uniqueSessions || 0}
                  </p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="card border-orange-200 bg-orange-50">
            <div className="card-content p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-2 sm:mb-3">Top Content</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-900 leading-none">
                    {siteAnalytics?.topContent?.length || 0}
                  </p>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10">
        {/* Top Content */}
        {siteLoading ? (
          <div className="card">
            <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
              <div className="h-5 sm:h-6 bg-muted animate-pulse rounded w-1/2 mb-2"></div>
              <div className="h-3 sm:h-4 bg-muted animate-pulse rounded w-3/4"></div>
            </div>
            <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
              <div className="space-y-4 sm:space-y-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 sm:p-6 bg-muted/30 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-5 sm:h-6 bg-muted animate-pulse rounded w-12"></div>
                      <div className="h-3 bg-muted animate-pulse rounded w-8"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="card-title text-lg sm:text-xl lg:text-2xl">Top Performing Content</h2>
              <p className="card-description text-sm">
                Most viewed content in the selected period
              </p>
            </div>
            <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
              {siteAnalytics?.topContent && siteAnalytics.topContent.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {siteAnalytics.topContent.slice(0, 5).map((content, index) => (
                    <div key={content.id} className="flex items-center justify-between p-4 sm:p-6 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-medium text-foreground truncate mb-1">
                          {content.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {content.status} • {content.author || 'No author'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold text-primary">
                          {content.viewCount || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">views</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">No content analytics available</p>
                  <p className="text-xs sm:text-sm mt-2">Publish some content to see analytics data</p>
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
            <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="card-title text-lg sm:text-xl lg:text-2xl">Analytics Summary</h2>
              <p className="card-description text-sm">
                Key insights from your content performance
              </p>
            </div>
            <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    <h4 className="text-sm sm:text-base font-semibold text-blue-800">Engagement Rate</h4>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">
                    {siteAnalytics.totalViews > 0 
                      ? ((siteAnalytics.totalInteractions / siteAnalytics.totalViews) * 100).toFixed(1)
                      : '0'
                    }%
                  </div>
                  <p className="text-sm text-blue-700">
                    {siteAnalytics.totalInteractions} interactions from {siteAnalytics.totalViews} views
                  </p>
                </div>
                
                <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    <h4 className="text-sm sm:text-base font-semibold text-green-800">Unique Visitors</h4>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-900 mb-2">
                    {siteAnalytics.uniqueSessions || 0}
                  </div>
                  <p className="text-sm text-green-700">
                    Unique sessions tracked
                  </p>
                </div>
                
                <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    <h4 className="text-sm sm:text-base font-semibold text-purple-800">Avg. Daily Views</h4>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-900 mb-2">
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

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
        {/* Daily Activity Chart */}
        <DynamicTransition 
          loading={siteLoading} 
          error={siteError}
          skeleton={
            <div className="card">
              <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
                <div className="h-5 sm:h-6 bg-muted animate-pulse rounded w-1/3 mb-2"></div>
                <div className="h-3 sm:h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </div>
              <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
                <div className="h-64 sm:h-80 bg-muted animate-pulse rounded-lg"></div>
              </div>
            </div>
          }
          transitionType="slide-up"
          delay={200}
        >
          <div className="card">
            <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="card-title text-lg sm:text-xl lg:text-2xl">Daily Activity (Last 14 Days)</h2>
              <p className="card-description text-sm">
                Views and interactions over time
              </p>
            </div>
            <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
              {chartData.length > 0 ? (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
                        interval="preserveStartEnd"
                        tickFormatter={(value) => value.split(' ')[0]}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={12}
                        tick={{ fill: '#64748b' }}
                        width={40}
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
                <div className="h-64 sm:h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-3">No activity data available</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
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
              <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
                <div className="h-5 sm:h-6 bg-muted animate-pulse rounded w-1/3 mb-2"></div>
                <div className="h-3 sm:h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </div>
              <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
                <div className="h-64 sm:h-80 bg-muted animate-pulse rounded-lg"></div>
              </div>
            </div>
          }
          transitionType="slide-up"
          delay={300}
        >
          <div className="card">
            <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="card-title text-lg sm:text-xl lg:text-2xl">Traffic Sources</h2>
              <p className="card-description text-sm">
                Where your visitors are coming from
              </p>
            </div>
            <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
              {referrerChartData.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Pie Chart */}
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={referrerChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={window.innerWidth < 640 ? 60 : 80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) => window.innerWidth < 640 ? (percentage > 10 ? `${name}: ${percentage}%` : '') : (percentage > 5 ? `${name}: ${percentage}%` : '')}
                          labelLine={true}
                          label={{ fontSize: 12, fill: '#64748b' }}
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
                        <div className="flex items-center space-x-3 min-w-0">
                          <div 
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          ></div>
                          <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
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
                <div className="h-64 sm:h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Wifi className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-3">No traffic source data available</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
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
            <div className="card-header px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="card-title text-lg sm:text-xl lg:text-2xl">Top Performing Content</h2>
              <p className="card-description text-sm">
                Most viewed content in the selected period
              </p>
            </div>
            <div className="card-content px-4 sm:px-6 lg:px-8 py-4">
              <div className="space-y-4 sm:space-y-6">
                {siteAnalytics.topContent.slice(0, 5).map((content, index) => (
                  <div key={content.id} className="flex items-center justify-between p-4 sm:p-6 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-medium text-foreground truncate mb-1">
                          {content.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {content.status} • {content.author || 'No author'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-primary">
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
        <div className="card border-red-200 bg-red-50 mt-6 sm:mt-8">
          <div className="card-content p-4 sm:p-6 lg:p-8 text-center">
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 text-red-500" />
            <h3 className="text-lg sm:text-xl font-bold text-red-800 mb-3 sm:mb-4">Error Loading Analytics</h3>
            <p className="text-sm sm:text-base text-red-700 mb-4 sm:mb-6">{error || usageError}</p>
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button onClick={refetchSite} className="btn-secondary text-sm px-4 py-2">
                Retry Site Analytics
              </button>
              <button onClick={refetchUsage} className="btn-secondary text-sm px-4 py-2">
                Retry Backend Usage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
