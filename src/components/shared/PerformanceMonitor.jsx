import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring } from '@/services/performanceService';
import { useCache } from '@/hooks/useCache';
import { Activity, Zap, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { CircularProgress } from './ProgressBar';

// Performance monitoring dashboard component
export default function PerformanceMonitor({ 
  className = '',
  showDetails = false,
  autoHide = true 
}) {
  const {
    performanceData,
    isMonitoring,
    getPerformanceScore,
    getCriticalIssues,
    getRecommendations
  } = usePerformanceMonitoring();

  const [isVisible, setIsVisible] = useState(!autoHide);
  const [expandedMetrics, setExpandedMetrics] = useState(false);

  const performanceScore = getPerformanceScore();
  const criticalIssues = getCriticalIssues();
  const recommendations = getRecommendations();

  // Auto-hide/show based on performance score
  useEffect(() => {
    if (autoHide) {
      if (performanceScore < 70 || criticalIssues.length > 0) {
        setIsVisible(true);
      } else {
        setTimeout(() => setIsVisible(false), 5000);
      }
    }
  }, [performanceScore, criticalIssues.length, autoHide]);

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return TrendingDown;
  };

  if (!isMonitoring || (!isVisible && autoHide)) {
    return null;
  }

  const ScoreIcon = getScoreIcon(performanceScore);

  return (
    <DynamicTransition show={isVisible} transitionType="slide-up" className={className}>
      <div className="fixed bottom-4 left-4 z-40 max-w-sm">
        <div className="bg-white border border-border rounded-lg shadow-lg p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Performance</span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>

          {/* Performance Score */}
          <div className="flex items-center space-x-4 mb-4">
            <CircularProgress
              progress={performanceScore}
              size={60}
              strokeWidth={6}
              color={performanceScore >= 90 ? 'success' : performanceScore >= 70 ? 'warning' : 'error'}
              showPercentage={true}
            />
            <div>
              <div className={`text-lg font-bold ${getScoreColor(performanceScore)}`}>
                {performanceScore}/100
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>

          {/* Critical Issues */}
          {criticalIssues.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {criticalIssues.length} Critical Issue{criticalIssues.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1">
                {criticalIssues.slice(0, 2).map((issue, index) => (
                  <div key={index} className="text-xs text-red-700">
                    {issue.metric}: {issue.value.toFixed(0)}ms (limit: {issue.threshold}ms)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Metrics */}
          {performanceData?.metrics && (
            <div className="space-y-2 mb-4">
              {Object.entries(performanceData.metrics).slice(0, 3).map(([metric, data]) => (
                <div key={metric} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{metric}:</span>
                  <span className="font-medium text-foreground">
                    {typeof data.latest === 'number' ? data.latest.toFixed(0) : data.latest}
                    {metric.includes('TIME') ? 'ms' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setExpandedMetrics(!expandedMetrics)}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                {expandedMetrics ? 'Hide' : 'Show'} Recommendations
              </button>
              
              {expandedMetrics && (
                <div className="mt-2 space-y-1">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Refresh
            </button>
            <span className="text-xs text-muted-foreground">•</span>
            <button
              onClick={() => setExpandedMetrics(!expandedMetrics)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {expandedMetrics ? 'Less' : 'More'} Details
            </button>
          </div>
        </div>
      </div>
    </DynamicTransition>
  );
}

// Performance metrics widget for admin
export function PerformanceWidget({ className = '' }) {
  const { performanceData, getPerformanceScore } = usePerformanceMonitoring();
  const [showWidget, setShowWidget] = useState(false);

  const performanceScore = getPerformanceScore();

  // Show widget if performance is poor
  useEffect(() => {
    setShowWidget(performanceScore < 80);
  }, [performanceScore]);

  if (!showWidget || !performanceData) return null;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${
      performanceScore >= 90 
        ? 'bg-green-50 border-green-200 text-green-600'
        : performanceScore >= 70
        ? 'bg-amber-50 border-amber-200 text-amber-600'
        : 'bg-red-50 border-red-200 text-red-600'
    } ${className}`}>
      <Activity className="h-4 w-4" />
      <span className="text-sm font-medium">
        Performance: {performanceScore}%
      </span>
    </div>
  );
}

// Cache performance monitor
export function CachePerformanceMonitor({ className = '' }) {
  const [cacheStats, setCacheStats] = useState(null);
  const cache = useCache();

  useEffect(() => {
    const updateStats = () => {
      setCacheStats(cache.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [cache]);

  if (!cacheStats) return null;

  const hitRate = parseFloat(cacheStats.hitRate);
  const getHitRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border bg-blue-50 border-blue-200 ${className}`}>
      <Zap className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-600">
        Cache: {cacheStats.size}/{cacheStats.maxSize}
      </span>
      <span className={`text-sm font-medium ${getHitRateColor(hitRate)}`}>
        {cacheStats.hitRate} hit rate
      </span>
    </div>
  );
}