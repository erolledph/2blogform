import React, { useState, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blogService';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Header from './Header';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';

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
const ManageBlogPage = React.lazy(() => import('@/features/dashboard/manage-blog/ManageBlogPage'));

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();
  
  // activeBlogId is now managed by BlogSelector component for multi-blog users
  const [activeBlogId, setActiveBlogId] = useState(null);
  const [blogInitialized, setBlogInitialized] = useState(false);
  
  // Prevent body scrolling when sidebar is open on mobile
  useEffect(() => {
    const handleBodyScroll = () => {
      if (sidebarOpen && window.innerWidth <= 1023) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
    };

    handleBodyScroll();

    // Clean up on unmount
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [sidebarOpen]);

  // Handle window resize to ensure proper scroll behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1023) {
        document.body.classList.remove('no-scroll');
      } else if (sidebarOpen) {
        document.body.classList.add('no-scroll');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Initialize activeBlogId when currentUser changes
  React.useEffect(() => {
    const initializeBlog = async () => {
      if (currentUser?.uid && !blogInitialized) {
        try {
          // Ensure user has a default blog and get the appropriate blog ID
          const defaultBlogId = await blogService.ensureDefaultBlog(currentUser.uid);
          setActiveBlogId(defaultBlogId);
          setBlogInitialized(true);
        } catch (error) {
          console.error('Error initializing blog:', error);
          // Create a new default blog if initialization fails
          try {
            const newBlogId = await blogService.createNewBlog(currentUser.uid, 'My Blog', 'My personal blog');
            setActiveBlogId(newBlogId.id);
            setBlogInitialized(true);
            toast.success('Created your first blog successfully');
          } catch (createError) {
            console.error('Error creating default blog:', createError);
            toast.error('Failed to initialize blog. Please refresh the page.');
          }
        }
      }
    };

    initializeBlog();
  }, [currentUser?.uid, blogInitialized]);

  // Reset blog initialization when user changes
  React.useEffect(() => {
    if (!currentUser?.uid) {
      setBlogInitialized(false);
      setActiveBlogId(null);
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
        <Header 
          onMenuClick={openSidebar}
        />

        <div className="content-section">
          <div className="page-container">
            <Suspense fallback={
              <div className="p-8">
                <div className="space-y-8">
                  <div className="h-10 bg-muted animate-pulse rounded w-64"></div>
                  <TableSkeleton rows={5} columns={4} hasSelection={false} hasActions={true} />
                </div>
              </div>
            }>
              {/* Only render routes when blog is initialized */}
              {blogInitialized && activeBlogId ? (
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
                  <Route path="/manage-blog" element={<ManageBlogPage activeBlogId={activeBlogId} setActiveBlogId={setActiveBlogId} />} />
                  <Route path="/account-settings" element={<AccountSettingsPage />} />
                  <Route path="/tips" element={<TipsPage />} />
                  <Route path="/documentation" element={<DocumentationPage activeBlogId={activeBlogId} />} />
                </Routes>
              ) : (
                <div className="p-8">
                  <div className="space-y-8">
                    <div className="h-10 bg-muted animate-pulse rounded w-64"></div>
                    <TableSkeleton rows={5} columns={4} hasSelection={false} hasActions={true} />
                  </div>
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}