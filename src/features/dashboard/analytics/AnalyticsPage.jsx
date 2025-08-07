import React from 'react';
import { useAnalytics } from '../../../hooks/useAnalytics';

const AnalyticsPage = () => {
  const { siteAnalytics, backendUsage, loading, error } = useAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">View your site performance and usage statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Page Views</h3>
          <p className="text-2xl font-bold text-gray-900">
            {siteAnalytics?.pageViews || 0}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Unique Visitors</h3>
          <p className="text-2xl font-bold text-gray-900">
            {siteAnalytics?.uniqueVisitors || 0}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Bounce Rate</h3>
          <p className="text-2xl font-bold text-gray-900">
            {siteAnalytics?.bounceRate || 0}%
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg. Session</h3>
          <p className="text-2xl font-bold text-gray-900">
            {siteAnalytics?.avgSession || '0m'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Backend Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">API Calls</h4>
            <p className="text-xl font-bold text-gray-900">
              {backendUsage?.apiCalls || 0}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Storage Used</h4>
            <p className="text-xl font-bold text-gray-900">
              {backendUsage?.storageUsed || '0 MB'}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Bandwidth</h4>
            <p className="text-xl font-bold text-gray-900">
              {backendUsage?.bandwidth || '0 GB'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;