import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { analyticsService } from '@/services/analyticsService';
import DataTable from '@/components/shared/DataTable';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Modal from '@/components/shared/Modal';
import { Edit, Trash2, Plus, ImageIcon, BarChart3, AlertTriangle, Eye, Upload, Download, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadgeClass } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ManageContentPage({ activeBlogId }) {
  const { content, loading, error, refetch } = useContent(activeBlogId);
  const { getAuthToken, currentUser } = useAuth();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, content: null });
  const [analyticsModal, setAnalyticsModal] = useState({ isOpen: false, content: null });
  const [selectedItems, setSelectedItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      try {
        setImporting(true);
        const token = await getAuthToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('blogId', activeBlogId);

        const response = await fetch('/api/import/content', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const results = await response.json();
        
        if (results.successCount > 0) {
          toast.success(`Successfully imported ${results.successCount} content item${results.successCount !== 1 ? 's' : ''}`);
          refetch(); // Refresh the content list
        }

        if (results.errorCount > 0) {
          toast.error(`${results.errorCount} item${results.errorCount !== 1 ? 's' : ''} failed to import. Check console for details.`);
          console.error('Import errors:', results.errors);
        }

      } catch (error) {
        console.error('Import error:', error);
        toast.error(error.message || 'Failed to import content');
      } finally {
        setImporting(false);
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
      setExporting(true);
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
      a.download = `content-export-${new Date().toISOString().split('T')[0]}.csv`;
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
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setExporting(true);
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
      a.download = `content-export-all-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Successfully exported all ${content.length} content item${content.length !== 1 ? 's' : ''}`);

    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export content');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (contentItem) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/.netlify/functions/admin-content`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: contentItem.id, blogId: activeBlogId })
      });

      if (response.ok) {
        toast.success('Content deleted successfully');
        refetch(); // Refresh the list
        setDeleteModal({ isOpen: false, content: null });
      } else {
        throw new Error('Failed to delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleViewAnalytics = (contentItem) => {
    setAnalyticsModal({ isOpen: true, content: contentItem });
  };

  const columns = [
    {
      key: 'featuredImageUrl',
      title: 'Image',
      sortable: false,
      render: (value, row) => (
        <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
          {value ? (
            <img
              src={value}
              alt={row.title}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-border"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
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
          {value ? format(value.toDate(), 'MMM dd, yyyy') : 'N/A'}
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
            onClick={() => handleViewAnalytics(row)}
            className="text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors duration-200"
            title="View Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, content: row })}
            className="text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors duration-200"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading content: {error}</p>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title mb-2">Manage Content</h1>
          {selectedItems.length > 0 && (
            <p className="text-base text-primary font-medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/dashboard/create"
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-3" />
            Create New
          </Link>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-secondary inline-flex items-center"
          >
            <Upload className="h-5 w-5 mr-3" />
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          {selectedItems.length > 0 ? (
            <button
              onClick={handleExportSelected}
              disabled={exporting}
              className="btn-secondary inline-flex items-center"
            >
              <Download className="h-5 w-5 mr-3" />
              {exporting ? 'Exporting...' : `Export Selected (${selectedItems.length})`}
            </button>
          ) : (
            <button
              onClick={handleExportAll}
              disabled={exporting || content.length === 0}
              className="btn-secondary inline-flex items-center"
            >
              <Download className="h-5 w-5 mr-3" />
              {exporting ? 'Exporting...' : 'Export All'}
            </button>
          )}
        </div>
      </div>

      {content.length === 0 ? (
        <div className="card">
          <div className="card-content text-center py-16">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-4">No content found</h3>
            <p className="text-lg text-muted-foreground mb-8">
              Get started by creating your first blog post. Once you have content, you can export it to get a genuine CSV template that matches your data structure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard/create" className="btn-primary">
                <Plus className="h-5 w-5 mr-3" />
                Create First Post
              </Link>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Pro Tip: Generate Your Own Template</h4>
              <p className="text-sm text-blue-700">
                Create at least one blog post, then use the "Export All" button to generate a CSV template that perfectly matches your data structure and image references.
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
              sortable={true}
              pagination={true}
              pageSize={10}
              selectable={true}
              selectedItems={selectedItems}
              onSelectAll={handleSelectAll}
              onSelectRow={handleSelectRow}
            />
          </div>
        </div>
      )}

      {/* Clear Selection Button */}
      {selectedItems.length > 0 && (
        <div className="flex justify-center">
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.content)}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal({ isOpen: false, content: null })}
        title={`Analytics: ${analyticsModal.content?.title}`}
        size="lg"
      >
        <ContentAnalyticsModal 
          contentId={analyticsModal.content?.id}
          contentTitle={analyticsModal.content?.title}
          activeBlogId={activeBlogId}
        />
      </Modal>
    </div>
  );
}

// Content Analytics Modal Component
function ContentAnalyticsModal({ contentId, contentTitle, activeBlogId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!contentId || !currentUser?.uid || !activeBlogId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await analyticsService.getContentAnalytics(currentUser.uid, contentId, activeBlogId, period);
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [contentId, period, currentUser?.uid, activeBlogId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
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