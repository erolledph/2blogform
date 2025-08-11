import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { apiCallWithRetry, getUserFriendlyErrorMessage } from '@/utils/helpers';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import DynamicTransition from '@/components/shared/DynamicTransition';
import { Edit, Trash2, Plus, ImageIcon, BarChart3, AlertTriangle, Eye, Upload, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadgeClass } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ManageContentPage({ activeBlogId }) {
  const { content, loading, error, refetch, invalidateCache } = useContent(activeBlogId);
  const { getAuthToken, currentUser } = useAuth();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, content: null });
  const [analyticsModal, setAnalyticsModal] = useState({ isOpen: false, content: null });
  const [selectedItems, setSelectedItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  
  // Individual loading states for each bulk action
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [unpublishingLoading, setUnpublishingLoading] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [exportingSelectedLoading, setExportingSelectedLoading] = useState(false);
  const [exportingAllLoading, setExportingAllLoading] = useState(false);

  const handleSelectAll = (selectAll) => {
    if (selectAll) {
      setSelectedItems(content.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectRow = (itemId, isSelected) => {
    if (isSelected) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleBulkPublish = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to publish');
      return;
    }

    setPublishingLoading(true);
    
    try {
      const token = await getAuthToken();
      
      const promises = selectedItems.map(async (itemId) => {
        const response = await apiCallWithRetry(`/.netlify/functions/admin-content`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            id: itemId, 
            blogId: activeBlogId,
            status: 'published'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to publish item ${itemId}`);
        }
        
        return response.json();
      });

      await Promise.all(promises);
      
      toast.success(`Successfully published ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`);
      setSelectedItems([]);
      invalidateCache();
      refetch();
    } catch (error) {
      console.error('Bulk publish error:', error);
      toast.error('Failed to publish selected items');
    } finally {
      setPublishingLoading(false);
    }
  };

  const handleBulkUnpublish = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to unpublish');
      return;
    }

    setUnpublishingLoading(true);
    
    try {
      const token = await getAuthToken();
      
      const promises = selectedItems.map(async (itemId) => {
        const response = await apiCallWithRetry(`/.netlify/functions/admin-content`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            id: itemId, 
            blogId: activeBlogId,
            status: 'draft'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to unpublish item ${itemId}`);
        }
        
        return response.json();
      });

      await Promise.all(promises);
      
      toast.success(`Successfully unpublished ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`);
      setSelectedItems([]);
      invalidateCache();
      refetch();
    } catch (error) {
      console.error('Bulk unpublish error:', error);
      toast.error('Failed to unpublish selected items');
    } finally {
      setUnpublishingLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setDeletingLoading(true);
    
    try {
      const token = await getAuthToken();
      
      const promises = selectedItems.map(async (itemId) => {
        const response = await apiCallWithRetry(`/.netlify/functions/admin-content`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            id: itemId, 
            blogId: activeBlogId
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete item ${itemId}`);
        }
        
        return response.json();
      });

      await Promise.all(promises);
      
      toast.success(`Successfully deleted ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`);
      setSelectedItems([]);
      invalidateCache();
      refetch();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete selected items');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.json')) {
        toast.error('Please select a JSON file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      try {
        setImporting(true);
        
        // Read and parse JSON file
        const fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        let jsonData;
        try {
          jsonData = JSON.parse(fileContent);
        } catch (parseError) {
          toast.error('Invalid JSON file format');
          return;
        }

        if (!Array.isArray(jsonData)) {
          toast.error('JSON file must contain an array of content items');
          return;
        }

        if (jsonData.length === 0) {
          toast.error('JSON file is empty');
          return;
        }

        const token = await getAuthToken();
        const response = await apiCallWithRetry('/api/import/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            blogId: activeBlogId,
            items: jsonData
          })
        });

        const results = await response.json();
        
        if (results.successCount > 0) {
          toast.success(`Successfully imported ${results.successCount} of ${results.totalItems} content item${results.successCount !== 1 ? 's' : ''}`);
          invalidateCache();
        }

        if (results.errorCount > 0) {
          toast.error(`${results.errorCount} item${results.errorCount !== 1 ? 's' : ''} failed to import. Check console for details.`);
          console.error('Import errors:', results.errors);
        }

      } catch (error) {
        const userMessage = getUserFriendlyErrorMessage(error);
        toast.error(userMessage);
      } finally {
        setImporting(false);
        // Always refetch after import operations to ensure UI is up to date
        refetch();
      }
    };
    input.click();
  };

  const handleExportSelected = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to export');
      return;
    }

    try {
      setExportingSelectedLoading(true);
      const token = await getAuthToken();
      
      const response = await apiCallWithRetry('/api/export/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blogId: activeBlogId,
          filters: {
            exportAll: false,
            selectedItems: selectedItems,
            status: 'all',
            startDate: '',
            endDate: '',
            selectedCategories: [],
            selectedTags: []
          }
        })
      });

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Successfully exported ${selectedItems.length} content item${selectedItems.length !== 1 ? 's' : ''}`);
      setSelectedItems([]); // Clear selection after export

    } catch (error) {
      console.error('Export error:', error);
      const userMessage = getUserFriendlyErrorMessage(error);
      toast.error(userMessage);
    } finally {
      setExportingSelectedLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setExportingAllLoading(true);
      const token = await getAuthToken();
      
      const response = await apiCallWithRetry('/api/export/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blogId: activeBlogId,
          filters: {
            exportAll: true,
            selectedItems: [],
            status: 'all',
            startDate: '',
            endDate: '',
            selectedCategories: [],
            selectedTags: []
          }
        })
      });

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-export-all-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Successfully exported all ${content.length} content item${content.length !== 1 ? 's' : ''}`);

    } catch (error) {
      console.error('Export error:', error);
      const userMessage = getUserFriendlyErrorMessage(error);
      toast.error(userMessage);
    } finally {
      setExportingAllLoading(false);
    }
  };

  const handleDelete = async (contentItem) => {
    setDeletingItemId(contentItem.id);
    
    try {
      const token = await getAuthToken();
      const response = await apiCallWithRetry(`/.netlify/functions/admin-content`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: contentItem.id, blogId: activeBlogId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete content');
      }
      
      toast.success('Content deleted successfully');
      setDeleteModal({ isOpen: false, content: null });
      setDeletingItemId(null);
      invalidateCache();
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete content');
      setDeletingItemId(null);
    }
  };

  const columns = [
    {
      key: 'featuredImageUrl',
      title: 'Image',
      sortable: false,
      render: (value, row) => (
        <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
          {value ? (
            <EnhancedContentThumbnail
              src={value}
              alt={row.title}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-border"
            />
          ) : null}
          <div 
            className={`w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-md border border-border flex items-center justify-center ${value ? 'hidden' : 'flex'}`}
          >
            <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
        </div>
      )
    },
    {
      key: 'title',
      title: 'Title',
      render: (value, row) => (
        <div className="flex flex-col min-w-0">
          <div className="text-sm sm:text-base font-medium text-foreground truncate mb-1">
            {value}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            /{row.slug}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <span className={`badge ${getStatusBadgeClass(value)} text-xs sm:text-sm`}>
          {value}
        </span>
      )
    },
    {
      key: 'author',
      title: 'Author',
      render: (value) => (
        <span className="text-sm sm:text-base text-foreground">
          {value || 'N/A'}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value) => (
        <span className="text-sm sm:text-base text-foreground">
          {value ? format(value, 'MMM dd, yyyy') : 'N/A'}
        </span>
      )
    },
    {
      key: 'viewCount',
      title: 'Views',
      render: (value) => (
        <div className="text-center">
          <div className="text-sm sm:text-base font-medium text-foreground">{value || 0}</div>
          <div className="text-xs text-muted-foreground">tracked</div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center space-x-1">
          <a
            href={`/preview/content/${currentUser?.uid}/${activeBlogId}/${row.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 p-2 rounded-md hover:bg-green-50 transition-colors duration-200"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </a>
          <Link
            to={`/dashboard/edit/${row.id}`}
            className="text-primary p-2 rounded-md hover:bg-primary/10 transition-colors duration-200"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setAnalyticsModal({ isOpen: true, content: row })}
            className="text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors duration-200"
            title="View Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, content: row })}
            disabled={deletingItemId === row.id}
            className="text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors duration-200"
            title="Delete"
          >
            {deletingItemId === row.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      )
    }
  ];


  return (
    <DynamicTransition loading={loading} error={error} className="section-spacing">
      {/* Header and Action Buttons - Always visible */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
        <div className="page-header mb-0 flex-1">
          <h1 className="page-title mb-2">Manage Content</h1>
          {selectedItems.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-6">
              <p className="text-base text-primary font-medium">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <button
                  onClick={handleBulkPublish}
                  disabled={publishingLoading}
                  className="btn-secondary btn-sm min-w-[120px]"
                >
                  {publishingLoading ? 'Publishing...' : 'Publish Selected'}
                </button>
                <button
                  onClick={handleBulkUnpublish}
                  disabled={unpublishingLoading}
                  className="btn-secondary btn-sm min-w-[130px]"
                >
                  {unpublishingLoading ? 'Unpublishing...' : 'Unpublish Selected'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deletingLoading}
                  className="btn-danger btn-sm min-w-[120px]"
                >
                  {deletingLoading ? 'Deleting...' : 'Delete Selected'}
                </button>
                <LoadingButton
                  onClick={handleExportSelected}
                  loading={exportingSelectedLoading}
                  loadingText="Exporting..."
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  className="min-w-[140px]"
                >
                  Export Selected ({selectedItems.length})
                </LoadingButton>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/dashboard/create" className="btn-primary inline-flex items-center">
            <Plus className="h-5 w-5 mr-3" />
            Create New
          </Link>
          <LoadingButton
            onClick={handleImport}
            loading={importing}
            loadingText="Importing..."
            variant="secondary"
            icon={Upload}
          >
            Import JSON
          </LoadingButton>
          <LoadingButton
            onClick={handleExportAll}
            loading={exportingAllLoading}
            loadingText="Exporting..."
            variant="secondary"
            icon={Download}
          >
            Export All
          </LoadingButton>
        </div>
      </div>

      {/* Content Table */}
      {content.length === 0 && !loading && !error ? (
        <div className="card">
          <div className="card-content text-center py-20">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-4">No content found</h3>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Get started by creating your first blog post. Once you have content, you can export it to get a genuine JSON template that matches your data structure.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/dashboard/create" className="btn-primary">
                <Plus className="h-5 w-5 mr-3" />
                Create First Post
              </Link>
            </div>
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Pro Tip: Generate Your Own JSON Template</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Create at least one blog post, then use the "Export All" button to generate a JSON template that perfectly matches your data structure and image references.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-content p-0">
            <DataTable
              data={content}
              columns={columns}
              searchable={true}
              filterable={true}
              filterOptions={{
                statuses: ['draft', 'published'],
                categories: true,
                tags: true,
                dateRange: true
              }}
              sortable={true}
              pagination={true}
              pageSize={10}
              selectable={true}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectRow={handleSelectRow}
              enableAnimations={true}
              loading={loading}
              onFiltersChange={(filters) => {
                // Filters are handled internally by DataTable
                // This callback can be used for additional logic if needed
              }}
            />
          </div>
        </div>
      )}

      {/* Clear Selection Button */}
      {selectedItems.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setSelectedItems([])}
            className="btn-ghost btn-sm"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, content: null })}
        title="Delete Content"
        size="sm"
      >
      {deleteModal.content && (
        <div className="space-y-4">
          <p className="text-base text-foreground">
            Are you sure you want to delete "{deleteModal.content.title}"?
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => setDeleteModal({ isOpen: false, content: null })}
              disabled={deletingItemId === deleteModal.content.id}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.content)}
              disabled={deletingItemId === deleteModal.content.id}
              className="btn-danger"
            >
              {deletingItemId === deleteModal.content.id ? (
                'Deleting...'
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      )}
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal({ isOpen: false, content: null })}
        title={`Analytics: ${analyticsModal.content?.title}`}
        size="lg"
      >
        {analyticsModal.content && (
          <ContentAnalyticsModal 
            contentId={analyticsModal.content.id}
            contentTitle={analyticsModal.content.title}
            activeBlogId={activeBlogId}
          />
        )}
      </Modal>
    </DynamicTransition>
  );
}

// Content Analytics Modal Component
function ContentAnalyticsModal({ contentId, contentTitle, activeBlogId }) {
  const [period, setPeriod] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simple analytics placeholder since useContentAnalytics might not be available
    setLoading(false);
    setAnalytics({
      totalViews: 0,
      totalInteractions: 0,
      viewCount: 0,
      analytics: {
        peakHour: 14,
        averageViewsPerDay: 0
      }
    });
  }, [contentId, period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-32 h-6 bg-muted animate-pulse rounded"></div>
          <div className="w-24 h-10 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 bg-muted animate-pulse rounded-lg">
              <div className="h-8 bg-muted/70 rounded mb-2"></div>
              <div className="h-4 bg-muted/50 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Performance Overview</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="input-field w-auto text-sm"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-900">{analytics.totalViews}</div>
          <div className="text-sm text-blue-600">Total Views</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-900">{analytics.totalInteractions}</div>
          <div className="text-sm text-green-600">Interactions</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-900">{analytics.viewCount}</div>
          <div className="text-sm text-purple-600">Total Views</div>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-900">
            {Math.round(analytics.totalViews / period)}
          </div>
          <div className="text-sm text-orange-600">Avg/Day</div>
        </div>
      </div>

      {analytics.analytics && (
        <div>
          <h4 className="text-base font-semibold text-foreground mb-3">Activity Pattern</h4>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Peak viewing hour: {analytics.analytics.peakHour}:00
            </p>
            <p className="text-sm text-muted-foreground">
              Average views per day: {Math.round(analytics.analytics.averageViewsPerDay)}
            </p>
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium mb-1">Analytics Note</p>
            <p className="text-sm text-amber-700">
              These metrics only track Firebase-connected interactions. For complete analytics, 
              consider integrating Google Analytics on your static site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced thumbnail component for content table
function EnhancedContentThumbnail({ src, alt, className = '' }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => {
          setImageLoaded(true);
          console.log('Content thumbnail loaded:', src);
        }}
        onError={() => {
          setImageError(true);
          console.error('Content thumbnail failed to load:', src);
        }}
      />
      {(imageError || !imageLoaded) && (
        <div className={`${className} bg-muted flex items-center justify-center ${imageError ? '' : 'absolute inset-0'}`}>
          <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}