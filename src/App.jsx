import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import { performanceService } from '@/services/performanceService';
import { realTimeAnalyticsService } from '@/services/realTimeAnalytics';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import DashboardPage from '@/components/layout/DashboardPage';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ContentPreviewPage from '@/preview/ContentPreviewPage';
import ProductPreviewPage from '@/preview/ProductPreviewPage';

function App() {
  React.useEffect(() => {
    // Setup service worker update notification
    if ('serviceWorker' in navigator) {
      window.showUpdateNotification = () => {
        // Show update available notification
        if (window.confirm('A new version is available. Reload to update?')) {
          window.location.reload();
        }
      };
    }
    
    // Initialize performance monitoring
    if (performanceService && !performanceService.isMonitoring) {
      performanceService.startMonitoring();
    }
    
    // Make services available globally for debugging
    window.performanceService = performanceService;
    window.realTimeAnalyticsService = realTimeAnalyticsService;
    
    // Track initial page load
    performanceService.recordMetric('APP_INITIALIZATION', performance.now());
  }, []);
  
  return (
    <ErrorBoundary>
      <AuthProvider>
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
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: 'hsl(142 76% 36%)',
                      secondary: 'hsl(0 0% 100%)',
                    },
                  },
                  error: {
                    duration: 6000,
                    iconTheme: {
                      primary: 'hsl(0 84.2% 60.2%)',
                      secondary: 'hsl(0 0% 100%)',
                    },
                  },
                  loading: {
                    duration: Infinity,
                  },
                }}
              />
              
            </div>
          </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
