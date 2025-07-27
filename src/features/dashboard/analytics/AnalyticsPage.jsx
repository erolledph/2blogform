import React, { useState } from 'react';
import { useSiteAnalytics, useBackendUsage } from '@/hooks/useAnalytics';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
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
  const { analytics, loading: analyticsLoading, error: analyticsError, refetch } = useSiteAnalytics(activeBlogId, selectedPeriod);
  const { usage, loading: usageLoading, error: usageError } = useBackendUsage(activeBlogId);

  const periods = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' }
  ];

  if (analyticsLoading || usageLoading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

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
          <button onClick={refetch} className="btn-secondary">
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
      </div>

      {/* Top Content */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Top Performing Content</h2>
          <p className="card-description">Most viewed articles based on Firebase tracking</p>
        </div>
        <div className="card-content">
          {analytics?.topContent?.length > 0 ? (
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
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Daily Activity</h2>
          <p className="card-description">Views and interactions over the last {selectedPeriod} days</p>
        </div>
        <div className="card-content">
          {analytics?.dailyStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                {Object.entries(analytics.dailyStats)
                  .slice(-7)
                  .map(([date, stats]) => (
                    <div key={date} className="text-center">
                      <div className="mb-2">{new Date(date).toLocaleDateString('en', { weekday: 'short' })}</div>
                      <div className="bg-primary/10 rounded p-2">
                        <div className="text-sm font-medium text-primary">{stats.views}</div>
                        <div className="flex justify-center">
                          <Eye className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                      <div className="bg-green-100 rounded p-2 mt-1">
                        <div className="text-sm font-medium text-green-600">{stats.interactions}</div>
                        <div className="flex justify-center">
                          <MousePointer className="h-3 w-3 text-green-600" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No daily activity data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Referrer Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Traffic Sources</h3>
            <p className="card-description">Where your visitors come from</p>
          </div>
          <div className="card-content">
            {analytics?.referrerStats && Object.keys(analytics.referrerStats).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.referrerStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([referrer, count]) => (
                    <div key={referrer} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground truncate max-w-xs">
                          {referrer === 'Direct' ? 'Direct Traffic' : referrer}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{count}</span>
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
            <h3 className="card-title">Interaction Types</h3>
            <p className="card-description">How users interact with your content</p>
          </div>
          <div className="card-content">
            {analytics?.interactionStats && Object.keys(analytics.interactionStats).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.interactionStats)
                  .sort(([,a], [,b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground capitalize">{type}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{count}</span>
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
