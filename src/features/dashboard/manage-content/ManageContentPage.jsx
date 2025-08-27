import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import { Edit, Trash2, Plus, ImageIcon, Eye, Upload, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadgeClass, truncateText } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ManageContentPage({ activeBlogId }) {
  const { content, setContent, loading, error, refetch } = useContent(activeBlogId);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, content: null });
  const [selectedItems, setSelectedItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  
  // Individual loading states for each bulk action
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [unpublishingLoading, setUnpublishingLoading] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [exportingSelectedLoading, setExportingSelectedLoading] = useState(false);
  const [exportingAllLoading, setExportingAllLoading] = useState(false);
  const { getAuthToken, currentUser } = useAuth();

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
        const response = await fetch('/api/import/content', {
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const results = await response.json();
        
        if (results.successCount > 0) {
          toast.success(`Successfully imported ${results.successCount} of ${results.totalItems} content item${results.successCount !== 1 ? 's' : ''}`);
        }

        if (results.errorCount > 0) {
          toast.error(`${results.errorCount} content item${results.errorCount !== 1 ? 's' : ''} failed to import. Check console for details.`);
          console.error('Import errors:', results.errors);
        }

      } catch (error) {
        toast.error(error.message || 'Failed to import content');
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
      
      const response = await fetch('/api/export/content', {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

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
      toast.error(error.message || 'Failed to export content');
    } finally {
      setExportingSelectedLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setExportingAllLoading(true);
      const token = await getAuthToken();
      
      const response = await fetch('/api/export/content', {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

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
      toast.error(error.message || 'Failed to export content');
    } finally {
      setExportingAllLoading(false);
    }
  };

  const handleBulkPublish = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to publish');
      return;
    }

    try {
      setPublishingLoading(true);
      
      const token = await getAuthToken();
      
      const promises = selectedItems.map(async (itemId) => {
        const response = await fetch(`/.netlify/functions/admin-content`, {
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
      });

      await Promise.all(promises);
      
      toast.success(`Successfully published ${selectedItems.length} content item${selectedItems.length !== 1 ? 's' : ''}`);
      
      setSelectedItems([]);
      refetch(); // Refresh data to show updated status
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

    try {
      setUnpublishingLoading(true);
      
      const token = await getAuthToken();
      
      const promises = selectedItems.map(async (itemId) => {
        const response = await fetch(`/.netlify/functions/admin-content`, {
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
      });

      await Promise.all(promises);
      
      toast.success(`Successfully unpublished ${selectedItems.length} content item${selectedItems.length !== 1 ? 's' : ''}`);
      
      setSelectedItems([]);
      refetch(); // Refresh data to show updated status
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

    if (!confirm(`Are you sure you want to delete ${selectedItems.length} content item${selectedItems.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingLoading(true);
      
      const token = await getAuthToken();
      
      const promises = selectedItems.map(async (itemId) => {
        const response = await fetch(`/.netlify/functions/admin-content`, {
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
      });

      await Promise.all(promises);
      
      toast.success(`Successfully deleted ${selectedItems.length} content item${selectedItems.length !== 1 ? 's' : ''}`);
      
      setSelectedItems([]);
      refetch(); // Refresh data to show updated list
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete selected items');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleDelete = async (contentItem) => {
    try {
      setDeletingItemId(contentItem.id);
      
      const token = await getAuthToken();
      const response = await fetch(`/.netlify/functions/admin-content`, {
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
      refetch(); // Refresh data to show updated list
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    } finally {
      setDeletingItemId(null);
    }
  };

  const columns = [
    {
      key: 'image',
      title: 'Image',
      sortable: false,
      render: (value, row) => (
        <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
          {row.featuredImageUrl ? (
            <EnhancedContentThumbnail
              src={row.featuredImageUrl}
              alt={row.title}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-border"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-md border border-border flex items-center justify-center">
              <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'title',
      title: 'Content',
      render: (value, row) => (
        <div className="flex flex-col min-w-0">
          <div className="text-sm sm:text-base font-medium text-foreground truncate mb-1">
            {value}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            /{row.slug}
          </div>
          {row.author && (
            <div className="text-xs text-muted-foreground mt-1">
              by {row.author}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'categories',
      title: 'Categories',
      render: (value) => (
        <div className="text-sm text-foreground">
          {value && value.length > 0 ? value.join(', ') : 'None'}
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
      key: 'createdAt',
      title: 'Created',
      render: (value) => (
        <span className="text-sm sm:text-base text-foreground">
          {value ? format(value, 'MMM dd, yyyy') : 'N/A'}
        </span>
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
    <div className="section-spacing">
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
            Create Content
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
      {loading ? (
        <div className="card">
          <div className="card-content p-0">
            <TableSkeleton rows={8} columns={6} />
          </div>
        </div>
      ) : (
        error ? (
          <div className="card border-red-200 bg-red-50">
            <div className="card-content p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-red-500" />
              <h3 className="text-xl font-bold text-red-800 mb-4">Error Loading Content</h3>
              <p className="text-red-700 mb-6">{error}</p>
              <button onClick={refetch} className="btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        ) : content.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-20">
              <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold text-foreground mb-4">No content found</h3>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                Get started by creating your first blog post. Once you have content, you can export it to get a genuine JSON template that matches your data structure.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/dashboard/create" className="btn-primary">
                  <Plus className="h-5 w-5 mr-3" />
                  Create Your First Post
                </Link>
              </div>
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg max-w-2xl mx-auto">
                <h4 className="text-sm font-medium text-green-800 mb-2">💡 Pro Tip: Generate Your Own JSON Template</h4>
                <p className="text-sm text-green-700 leading-relaxed">
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
                onFiltersChange={(filters) => {
                  // Filters are handled internally by DataTable
                  // This callback can be used for additional logic if needed
                }}
              />
            </div>
          </div>
        )
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
        <div className="space-y-4">
          <p className="text-base text-foreground">
            Are you sure you want to delete "{deleteModal.content?.title}"?
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => setDeleteModal({ isOpen: false, content: null })}
              disabled={deletingItemId === deleteModal.content?.id}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.content)}
              disabled={deletingItemId === deleteModal.content?.id}
              className="btn-danger"
            >
              {deletingItemId === deleteModal.content?.id ? (
                'Deleting...'
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Enhanced thumbnail component for content table
function EnhancedContentThumbnail({ src, alt, className = '' }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="relative">
      {!imageError && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => {
            setImageLoaded(true);
            console.log('Content thumbnail loaded:', src);
          }}
          onError={(e) => {
            setImageError(true);
            console.error('Content thumbnail failed to load:', src);
          }}
        />
      )}
      {(imageError || !imageLoaded) && (
        <div className={`${className} bg-muted flex items-center justify-center ${imageError ? '' : 'absolute inset-0'}`}>
          <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}