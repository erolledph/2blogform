import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/components/layout/DashboardPage';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ContentPreviewPage from '@/preview/ContentPreviewPage';
import ProductPreviewPage from '@/preview/ProductPreviewPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
          <Router>
            <div className="min-h-screen bg-neutral-50">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
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
            </div>
          </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;