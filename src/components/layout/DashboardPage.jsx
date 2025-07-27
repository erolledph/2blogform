import React, { useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Lazy load dashboard pages
const OverviewPage = React.lazy(() => import('@/features/dashboard/overview/OverviewPage'));
const ManageContentPage = React.lazy(() => import('@/features/dashboard/manage-content/ManageContentPage'));
const CreateContentPage = React.lazy(() => import('@/features/dashboard/create-content/CreateContentPage'));
const ManageProductsPage = React.lazy(() => import('@/features/dashboard/manage-products/ManageProductsPage'));
const CreateProductPage = React.lazy(() => import('@/features/dashboard/create-product/CreateProductPage'));
const AnalyticsPage = React.lazy(() => import('@/features/dashboard/analytics/AnalyticsPage'));
const FileStoragePage = React.lazy(() => import('@/features/dashboard/storage/FileStoragePage'));
const AccountSettingsPage = React.lazy(() => import('@/features/dashboard/settings/AccountSettingsPage'));
const TipsPage = React.lazy(() => import('@/features/dashboard/tips/TipsPage'));
const DocumentationPage = React.lazy(() => import('@/features/dashboard/documentation/DocumentationPage'));
const UserManagementPage = React.lazy(() => import('@/features/dashboard/admin/UserManagementPage'));

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();
  
  // For now, activeBlogId defaults to userId to maintain backward compatibility
  // In Phase 2, this will be managed by a BlogSelector component for premium users
  const [activeBlogId, setActiveBlogId] = useState(currentUser?.uid);
  
  // Update activeBlogId when currentUser changes
  React.useEffect(() => {
    if (currentUser?.uid) {
      setActiveBlogId(currentUser.uid);
    }
  }, [currentUser?.uid]);

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-container">
      {/* Overlay for mobile */}
      <div 
        className={`overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>

      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        closeSidebar={closeSidebar}
      />
      
      <main className="main-content">
        {/* Header is now sticky and positioned at the top */}
        <Header onMenuClick={openSidebar} />

        <div className="content-section">
          <div className="page-container">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="/overview" element={<OverviewPage activeBlogId={activeBlogId} />} />
                <Route path="/manage" element={<ManageContentPage activeBlogId={activeBlogId} />} />
                <Route path="/create" element={<CreateContentPage activeBlogId={activeBlogId} />} />
                <Route path="/edit/:id" element={<CreateContentPage activeBlogId={activeBlogId} />} />
                <Route path="/manage-products" element={<ManageProductsPage activeBlogId={activeBlogId} />} />
                <Route path="/create-product" element={<CreateProductPage activeBlogId={activeBlogId} />} />
                <Route path="/edit-product/:id" element={<CreateProductPage activeBlogId={activeBlogId} />} />
                <Route path="/analytics" element={<AnalyticsPage activeBlogId={activeBlogId} />} />
                <Route path="/storage" element={<FileStoragePage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
                <Route path="/account-settings" element={<AccountSettingsPage />} />
                <Route path="/tips" element={<TipsPage />} />
                <Route path="/documentation" element={<DocumentationPage activeBlogId={activeBlogId} />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}