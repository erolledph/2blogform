import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import { realTimeManager } from '@/services/realTimeService';
import { webSocketService } from '@/services/webSocketService';
import { realTimeAnalyticsService } from '@/services/realTimeAnalytics';
import { performanceService } from '@/services/performanceService';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import DashboardPage from '@/components/layout/DashboardPage';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import DynamicTransition from '@/components/shared/DynamicTransition';
import ContentPreviewPage from '@/preview/ContentPreviewPage';
import ProductPreviewPage from '@/preview/ProductPreviewPage';
import PerformanceMonitor from '@/components/shared/PerformanceMonitor';

function App() {
  // Cleanup real-time connections on app unmount
  React.useEffect(() => {
    // Initialize performance monitoring
    performanceService.initialize();
    
    // Setup service worker update notification
    if ('serviceWorker' in navigator) {
      window.showUpdateNotification = () => {
        // Show update available notification
        if (window.confirm('A new version is available. Reload to update?')) {
          window.location.reload();
        }
      };
    }
    
    return () => {
      realTimeManager.disconnect();
      webSocketService.disconnect();
      realTimeAnalyticsService.stopStreaming();
      performanceService.cleanup();
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DynamicTransition transitionType="fade">
          <Router>
            <div className="min-h-screen bg-neutral-50">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                {/* Public Preview Routes with user and blog ID */}
                <Route path="/preview/content/:uid/:blogId/:slug" element={<ContentPreviewPage />} />
                <Route path="/preview/product/:uid/:blogId/:slug" element={<ProductPreviewPage />} />
                
                {/* Protected Dashboard Routes */}
                <Route path="/dashboard/*" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'hsl(0 0% 100%)',
                    color: 'hsl(222.2 84% 4.9%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                  },
                }}
              />
              
              {/* Performance Monitor */}
              <PerformanceMonitor autoHide={true} />
            </div>
          </Router>
        </DynamicTransition>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
