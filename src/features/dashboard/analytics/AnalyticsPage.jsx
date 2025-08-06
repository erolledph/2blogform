import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSiteAnalytics, useBackendUsage } from '@/hooks/useAnalytics';
import { useCachedData } from '@/hooks/useCache';
import SkeletonLoader, { StatCardSkeleton } from '@/components/shared/SkeletonLoader';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Database,
  AlertTriangle,
  Info,
  ExternalLink,
  Calendar,
  Clock,
  Globe
} from 'lucide-react';

export default function AnalyticsPage({ activeBlogId }) {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  
  // Use cached analytics data with 2-minute TTL
  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useCachedData(
    `analytics-${activeBlogId}-${selectedPeriod}`,
    () => import('@/services/analyticsService').then(({ analyticsService }) => 
      analyticsService.getSiteAnalytics(activeBlogId, activeBlogId, selectedPeriod)
    ),
    [activeBlogId, selectedPeriod],
    2 * 60 * 1000 // 2 minutes TTL
  );

  // Use cached usage data with 5-minute TTL
  const {
    data: usage,
    loading: usageLoading,
    error: usageError,
    refetch: refetchUsage
  } = useCachedData(
    `usage-${activeBlogId}`,
    () => import('@/services/analyticsService').then(({ analyticsService }) => 
      analyticsService.getBackendUsage(activeBlogId, activeBlogId)
    ),
    [activeBlogId],
    5 * 60 * 1000 // 5 minutes TTL
  );

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  const periods = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' }
  ];

  const handleRefresh = () => {
    refetchAnalytics();
    refetchUsage();
  };
  // Prepare chart data
  const prepareChartData = () => {
    if (!analytics?.dailyStats) return [];
    
    return Object.entries(analytics.dailyStats)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        fullDate: date,
        views: stats.views,
        interactions: stats.interactions
      }));
  };

  const prepareReferrerData = () => {
    if (!analytics?.referrerStats) return [];
    
    return Object.entries(analytics.referrerStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({
        name: name === 'Direct' ? 'Direct Traffic' : name.length > 20 ? name.substring(0, 20) + '...' : name,
        value,
        fullName: name
      }));
  };

  const prepareInteractionData = () => {
    if (!analytics?.interactionStats) return [];
    
    return Object.entries(analytics.interactionStats)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));
  };

  const chartData = prepareChartData();
  const referrerData = prepareReferrerData();
  const interactionData = prepareInteractionData();


  if (analyticsError || usageError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading analytics: {analyticsError || usageError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">Analytics & Platform Usage</h1>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="input-field w-auto"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          <button onClick={handleRefresh} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Important Notice */}
      <div className="card border-amber-200 bg-amber-50">
        <div className="card-content p-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Analytics Limitations</h3>
              <div className="text-base text-amber-700 space-y-2">
                <p>
                  <strong>Static Site + CDN:</strong> Since your content is statically generated and served through a CDN,
                  these analytics only track interactions that trigger backend functions.
                </p>
                <p>
                  <strong>Accuracy Note:</strong> View counts and interactions are only recorded when users interact with
                  backend-connected features. For complete analytics, consider integrating Google Analytics or CDN analytics.
                </p>
                <p>
                  <strong>Real-time Data:</strong> Analytics are updated in real-time when backend interactions occur,
                  but may not reflect all actual page views due to static caching.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))
        ) : (
          <>
            <div className="card border-blue-200 bg-blue-50">
              <div className="card-content p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-2">Total Views</p>
                    <p className="text-3xl font-bold text-blue-900">{analytics?.totalViews || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">Last {selectedPeriod} days</p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card border-green-200 bg-green-50">
              <div className="card-content p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-2">Interactions</p>
                    <p className="text-3xl font-bold text-green-900">{analytics?.totalInteractions || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Clicks, shares, etc.</p>
                  </div>
                  <MousePointer className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card border-purple-200 bg-purple-50">
              <div className="card-content p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-2">Unique Sessions</p>
                    <p className="text-3xl font-bold text-purple-900">{analytics?.uniqueSessions || 0}</p>
                    <p className="text-xs text-purple-600 mt-1">Estimated unique visitors</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="card border-orange-200 bg-orange-50">
              <div className="card-content p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 mb-2">Avg. Daily Views</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {Math.round((analytics?.totalViews || 0) / selectedPeriod)}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Per day average</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top Content */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Top Performing Content</h2>
          <p className="card-description">Most viewed articles based on Firebase tracking</p>
        </div>
        <div className="card-content">
          {analyticsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <SkeletonLoader type="avatar" className="w-8 h-8 rounded-full" />
                    <div className="space-y-2">
                      <SkeletonLoader width="3/4" />
                      <SkeletonLoader width="1/2" height="sm" />
                    </div>
                  </div>
                  <SkeletonLoader width="1/4" />
                </div>
              ))}
            </div>
          ) : analytics?.topContent?.length > 0 ? (
            <div className="space-y-4">
              {analytics.topContent.slice(0, 5).map((content, index) => (
                <div key={content.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{content.title}</h3>
                      <p className="text-sm text-muted-foreground">/{content.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">{content.viewCount || 0}</p>
                    <p className="text-xs text-muted-foreground">views</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analytics data available yet</p>
              <p className="text-sm mt-2">Data will appear as users interact with your content</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Activity Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Daily Activity Trend</h2>
            <p className="card-description">Views and interactions over the last {selectedPeriod} days</p>
          </div>
          <div className="card-content">
            {analyticsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <SkeletonLoader type="card" className="w-full h-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Views"
                    />
                    <Area
                      type="monotone"
                      dataKey="interactions"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Interactions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No daily activity data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Traffic Sources Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Traffic Sources</h2>
            <p className="card-description">Distribution of visitor sources</p>
          </div>
          <div className="card-content">
            {analyticsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <SkeletonLoader type="card" className="w-full h-full" />
              </div>
            ) : referrerData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={referrerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {referrerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No traffic source data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interaction Types Bar Chart */}
      {interactionData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">User Interactions</h2>
            <p className="card-description">Types of user interactions with your content</p>
          </div>
          <div className="card-content">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interactionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Referrer Stats */}
      {/* Detailed Analytics Tables */}
      {(referrerData.length > 0 || interactionData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Top Traffic Sources</h3>
              <p className="card-description">Detailed breakdown of visitor sources</p>
            </div>
            <div className="card-content">
              {referrerData.length > 0 ? (
                <div className="space-y-3">
                  {referrerData.map((item, index) => (
                    <div key={item.fullName} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-foreground truncate max-w-xs" title={item.fullName}>
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                        <div className="text-xs text-muted-foreground">
                          {((item.value / analytics.totalViews) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No referrer data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Interaction Breakdown</h3>
              <p className="card-description">How users engage with your content</p>
            </div>
            <div className="card-content">
              {interactionData.length > 0 ? (
                <div className="space-y-3">
                  {interactionData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-foreground">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                        <div className="text-xs text-muted-foreground">
                          {((item.value / analytics.totalInteractions) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MousePointer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No interaction data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Firebase Usage */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Database className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="card-title">Platform Usage Statistics</h2>
          </div>
          <p className="card-description">Current platform resource usage and estimates</p>
        </div>
        <div className="card-content">
          {usage ? (
            <div className="space-y-8">
              {/* Error/Warning Notice */}
              {(usage.error || usage.errors) && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">Limited Data Available</h3>
                      <p className="text-base text-amber-700 mb-2">
                        {usage.error || 'Some data collections could not be accessed due to security rules or permissions.'}
                      </p>
                      {usage.note && (
                        <p className="text-sm text-amber-600">{usage.note}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-amber-600 mt-3">
                    <strong>Why this happens:</strong> Backend security rules prevent client-side access to exact billing data.
                    For precise usage statistics, check your admin console directly.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backend usage data available yet.</p>
              <p className="text-sm mt-2">Ensure your backend functions are active and accessible.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Analytics Recommendations</h2>
          <p className="card-description">Improve your analytics and tracking setup</p>
        </div>
        <div className="card-content">
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Analytics Recommendations</h3>
              <ul className="space-y-2 text-base text-blue-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Integrate Google Analytics 4 for comprehensive page view tracking
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Use CDN analytics for server-side traffic insights
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Add client-side tracking scripts to your static site
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Consider using analytics SDKs in your frontend
                </li>
              </ul>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Platform Optimization</h3>
              <ul className="space-y-2 text-base text-green-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Regularly clean up old analytics data to save storage
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Use serverless functions for server-side analytics processing
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Implement data aggregation to reduce read operations
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  Monitor platform usage in the admin console regularly
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
          <p className="card-description">Useful links for analytics and monitoring</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <BarChart3 className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Google Analytics</h3>
              <p className="text-base text-muted-foreground">Set up comprehensive tracking</p>
              <ExternalLink className="h-4 w-4 text-muted-foreground mt-2" />
            </a>

            <a
              href="/dashboard/storage"
              className="group p-6 border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <Database className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">File Storage</h3>
              <p className="text-base text-muted-foreground">Manage uploaded files and images</p>
            </a>

            <a
              href="/dashboard/account-settings"
              className="group p-6 border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <Globe className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Account Settings</h3>
              <p className="text-base text-muted-foreground">Configure your account preferences</p>
            </a>

            <a
              href="https://dash.cloudflare.com/?account=workers" // Assuming this is the Cloudflare Workers analytics link
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <Globe className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Cloudflare Analytics</h3>
              <p className="text-base text-muted-foreground">View CDN and traffic analytics</p>
              <ExternalLink className="h-4 w-4 text-muted-foreground mt-2" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
