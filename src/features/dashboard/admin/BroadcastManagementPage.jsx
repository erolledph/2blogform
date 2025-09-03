import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { broadcastService } from '@/services/broadcastService';
import { validateField } from '@/utils/validation';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton, StatCardSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import InputField from '@/components/shared/InputField';
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  RefreshCw,
  MessageSquare,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function BroadcastManagementPage() {
  const { currentUser, getAuthToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [createModal, setCreateModal] = useState({ isOpen: false });
  const [editModal, setEditModal] = useState({ isOpen: false, message: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, message: null });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchMessages();
    } else {
      setLoading(false);
      setError('Access denied: Admin privileges required');
    }
  }, [isAdmin]);

  const fetchMessages = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);
      
      const token = await getAuthToken();
      const messagesData = await broadcastService.fetchAllBroadcastMessages(token);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
      setError(error.message);
      if (!refreshing) {
        toast.error('Failed to fetch broadcast messages');
      }
    } finally {
      if (!refreshing) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMessages();
      toast.success('Broadcast messages refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh broadcast messages');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateMessage = async (messageData) => {
    try {
      setCreating(true);
      
      const token = await getAuthToken();
      await broadcastService.createBroadcastMessage(messageData, token);
      
      toast.success('Broadcast message created successfully');
      setCreateModal({ isOpen: false });
      await fetchMessages();
    } catch (error) {
      console.error('Error creating broadcast message:', error);
      toast.error(error.message || 'Failed to create broadcast message');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateMessage = async (id, updates) => {
    try {
      setUpdating(true);
      
      const token = await getAuthToken();
      await broadcastService.updateBroadcastMessage(id, updates, token);
      
      toast.success('Broadcast message updated successfully');
      setEditModal({ isOpen: false, message: null });
      await fetchMessages();
    } catch (error) {
      console.error('Error updating broadcast message:', error);
      toast.error(error.message || 'Failed to update broadcast message');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMessage = async (message) => {
    try {
      setDeleting(true);
      
      const token = await getAuthToken();
      await broadcastService.deleteBroadcastMessage(message.id, token);
      
      toast.success('Broadcast message deleted successfully');
      setDeleteModal({ isOpen: false, message: null });
      await fetchMessages();
    } catch (error) {
      console.error('Error deleting broadcast message:', error);
      toast.error(error.message || 'Failed to delete broadcast message');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMessageStatus = async (message) => {
    try {
      const newStatus = !message.isActive;
      const token = await getAuthToken();
      
      await broadcastService.updateBroadcastMessage(message.id, { isActive: newStatus }, token);
      
      toast.success(`Message ${newStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchMessages();
    } catch (error) {
      console.error('Error toggling message status:', error);
      toast.error('Failed to update message status');
    }
  };

  const columns = [
    {
      key: 'title',
      title: 'Message',
      render: (value, row) => (
        <div className="flex flex-col min-w-0">
          <div className="text-sm font-medium text-foreground truncate mb-1">
            {value}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {row.description}
          </div>
        </div>
      )
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleMessageStatus(row)}
            className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              value 
                ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
            }`}
            title={`Click to ${value ? 'deactivate' : 'activate'}`}
          >
            {value ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span>{value ? 'Active' : 'Inactive'}</span>
          </button>
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value) => (
        <span className="text-sm text-foreground">
          {value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}
        </span>
      )
    },
    {
      key: 'updatedAt',
      title: 'Updated',
      render: (value) => (
        <span className="text-sm text-foreground">
          {value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditModal({ isOpen: true, message: row })}
            className="text-primary p-2 rounded-md hover:bg-primary/10 transition-colors duration-200"
            title="Edit message"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, message: row })}
            className="text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors duration-200"
            title="Delete message"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (!isAdmin) {
    return (
      <div className="section-spacing">
        <div className="card border-red-200 bg-red-50">
          <div className="card-content p-8 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h2>
            <p className="text-lg text-red-700 mb-6">
              You need administrator privileges to access broadcast management.
            </p>
            <p className="text-base text-red-600">
              Contact your system administrator if you believe you should have access to this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      {/* Header and Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
        <div className="page-header mb-0 flex-1">
          <h1 className="page-title">Broadcast Management</h1>
          <p className="page-description">
            Create and manage broadcast messages for all users
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <LoadingButton
            onClick={handleRefresh}
            loading={refreshing}
            loadingText="Refreshing..."
            variant="secondary"
            icon={RefreshCw}
            disabled={loading}
          >
            Refresh
          </LoadingButton>
          <button
            onClick={() => setCreateModal({ isOpen: true })}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Broadcast
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="card border-blue-200 bg-blue-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-3">Total Messages</p>
                  <p className="text-3xl font-bold text-blue-900 leading-none">{messages.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card border-green-200 bg-green-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-3">Active Messages</p>
                  <p className="text-3xl font-bold text-green-900 leading-none">
                    {messages.filter(m => m.isActive).length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card border-purple-200 bg-purple-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-3">Reach</p>
                  <p className="text-3xl font-bold text-purple-900 leading-none">All Users</p>
                  <p className="text-sm text-purple-600">Global broadcast</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Table */}
      {loading ? (
        <div className="card">
          <div className="card-content p-0">
            <TableSkeleton rows={10} columns={5} />
          </div>
        </div>
      ) : (
        error ? (
          <div className="card border-red-200 bg-red-50">
            <div className="card-content p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-red-500" />
              <h3 className="text-xl font-bold text-red-800 mb-4">Error Loading Messages</h3>
              <p className="text-red-700 mb-6">{error}</p>
              <button onClick={fetchMessages} className="btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-20">
              <Bell className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold text-foreground mb-4">No broadcast messages</h3>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                Create your first broadcast message to communicate with all users about new features, contests, changelogs, or important announcements.
              </p>
              <button
                onClick={() => setCreateModal({ isOpen: true })}
                className="btn-primary"
              >
                <Plus className="h-5 w-5 mr-3" />
                Create First Broadcast
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-content p-0">
              <DataTable
                data={messages}
                columns={columns}
                searchable={true}
                sortable={true}
                pagination={true}
                pageSize={15}
              />
            </div>
          </div>
        )
      )}

      {/* Create Message Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false })}
        title="Create Broadcast Message"
        size="md"
      >
        <BroadcastMessageForm
          onSubmit={handleCreateMessage}
          onCancel={() => setCreateModal({ isOpen: false })}
          loading={creating}
          submitText="Create Broadcast"
        />
      </Modal>

      {/* Edit Message Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, message: null })}
        title="Edit Broadcast Message"
        size="md"
      >
        {editModal.message && (
          <BroadcastMessageForm
            initialData={editModal.message}
            onSubmit={(data) => handleUpdateMessage(editModal.message.id, data)}
            onCancel={() => setEditModal({ isOpen: false, message: null })}
            loading={updating}
            submitText="Update Broadcast"
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, message: null })}
        title="Delete Broadcast Message"
        size="sm"
      >
        {deleteModal.message && (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Delete Broadcast Message
                </h3>
                <p className="text-base text-muted-foreground mb-4">
                  Are you sure you want to delete the message "{deleteModal.message.title}"?
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">This action will:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Permanently delete the broadcast message</li>
                <li>• Remove it from all users' notification feeds</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-border">
              <button
                onClick={() => setDeleteModal({ isOpen: false, message: null })}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMessage(deleteModal.message)}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Deleting...' : 'Delete Message'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Broadcast Message Form Component
function BroadcastMessageForm({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  loading = false, 
  submitText = 'Create Broadcast' 
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Title validation using centralized rules
    const titleError = validateField('broadcastTitle', formData.title);
    if (titleError) newErrors.title = titleError;
    
    // Description validation using centralized rules
    const descriptionError = validateField('broadcastDescription', formData.description);
    if (descriptionError) newErrors.description = descriptionError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Broadcast Message Guidelines</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Keep titles concise and attention-grabbing (max 100 characters)</li>
          <li>• Descriptions support basic Markdown for links and emphasis (max 160 characters)</li>
          <li>• Active messages will be visible to all users in the header notifications</li>
          <li>• Inactive messages are hidden but can be reactivated later</li>
        </ul>
      </div>

      <div className="space-y-6">
        <InputField
          label="Title"
          name="title"
          required
          placeholder="Enter broadcast title"
          value={formData.title}
          onChange={handleInputChange}
          error={errors.title}
          maxLength={100}
          className="w-full"
        />

        <div>
          <label className="block text-base font-medium text-foreground mb-3">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            name="description"
            rows={4}
            className="input-field resize-none"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter broadcast description (supports basic Markdown)"
            maxLength={160}
            required
          />
          {errors.description && (
            <p className="mt-3 text-sm text-destructive">{errors.description}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {formData.description.length}/160 characters. Supports **bold**, *italic*, and [links](url).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleInputChange}
            className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-base font-medium text-foreground">
            Active (visible to all users)
          </label>
        </div>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="text-sm font-medium text-green-800 mb-2">Preview</h4>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-foreground mb-2">
            {formData.title || 'Your title will appear here'}
          </div>
          <div className="text-sm text-muted-foreground">
            {formData.description || 'Your description will appear here'}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || Object.keys(errors).length > 0}
          className="btn-primary"
        >
          {loading ? 'Processing...' : submitText}
        </button>
      </div>
    </form>
  );
}