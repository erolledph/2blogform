import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiCallWithRetry, getUserFriendlyErrorMessage, categorizeError } from '@/utils/helpers';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton, StatCardSkeleton, UserManagementSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import InputField from '@/components/shared/InputField';
import UserDeletionProgress from '@/components/shared/UserDeletionProgress';
import { userDeletionValidator } from '@/utils/userDeletionValidator';
import { performanceService } from '@/services/performanceService';
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  Crown, 
  User, 
  Mail, 
  Calendar,
  Settings,
  AlertTriangle,
  Check,
  X,
  HardDrive,
  Database,
  Trash2,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const { currentUser, getAuthToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState({ isOpen: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [deletionProgressModal, setDeletionProgressModal] = useState({ isOpen: false, result: null });
  const [deletionValidation, setDeletionValidation] = useState(null);
  const [validatingDeletion, setValidatingDeletion] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
      setError('Access denied: Admin privileges required');
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      // Use enhanced API call with retry logic
      const response = await apiCallWithRetry('/.netlify/functions/admin-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, 3);

      const data = await response.json();
      setUsers(data.users || []);
      
      // Track successful operation
      performanceService.trackOperation(true);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Track failed operation
      performanceService.trackOperation(false);
      
      // Provide user-friendly error messages
      const userMessage = getUserFriendlyErrorMessage(error);
      
      setError(userMessage);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      setUpdating(true);
      
      const token = await getAuthToken();
      
      const response = await apiCallWithRetry('/.netlify/functions/admin-users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, ...updates })
      }, 3);
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      // Update user in the list
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, ...updates } : user
      ));
      
      toast.success('User updated successfully');
      setEditModal({ isOpen: false, user: null });
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const originalUsers = [...users];
    
    try {
      setDeletingUserId(user.uid);
      
      // Optimistic UI update - remove user immediately
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      console.log('Starting user deletion process:', {
        targetUser: { uid: user.uid, email: user.email, role: user.role },
        requestingUser: { uid: currentUser?.uid, email: currentUser?.email, role: currentUser?.role }
      });
      
      const response = await apiCallWithRetry('/.netlify/functions/admin-users', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.uid }),
        retryOn: ['network', '5xx']
      }, 3);
      
      const result = await response.json();
      
      // Handle partial success (207 Multi-Status)
      if (response.status === 207 && result.partialSuccess && result.deletionSummary) {
        const summary = result.deletionSummary;
        toast.warning(
          `User partially deleted: ${summary.successfulOperations}/${summary.totalOperations} operations completed.`,
          { duration: 10000 }
        );
        
        setDeletionProgressModal({ isOpen: true, result });
      } else {
        // Full success
        if (result.deletionSummary) {
          const summary = result.deletionSummary;
          toast.success(
            `User deleted successfully! ${summary.successfulOperations}/${summary.totalOperations} operations completed.`,
            { duration: 6000 }
          );
          
          if (summary.failedOperations > 0) {
            toast.warning(
              `Note: ${summary.failedOperations} cleanup operations failed.`,
              { duration: 8000 }
            );
          }
          
          setDeletionProgressModal({ isOpen: true, result });
        } else {
          toast.success('User deleted successfully');
        }
      }
      
      setDeleteModal({ isOpen: false, user: null });
      setDeletingUserId(null);
      setDeletionValidation(null);
      
    } catch (error) {
      // This catch block handles errors that occur before executeOperation
      console.error('Pre-operation error:', error);
      
      // Rollback optimistic update
      setUsers(originalUsers);
      
      // Categorize and display appropriate error message
      const errorCategory = categorizeError(error);
      const userMessage = getUserFriendlyErrorMessage(error);
      
      // Show different toast types based on error category
      switch (errorCategory) {
        case 'network':
          toast.error(`Network error: ${userMessage}. The user may have been deleted - refreshing list to verify.`, { duration: 8000 });
          // Refresh to check actual state
          setTimeout(() => fetchUsers(), 2000);
          break;
        case 'authentication':
          toast.error(userMessage, { duration: 8000 });
          break;
        case 'permission':
          toast.error(userMessage, { duration: 8000 });
          break;
        default:
          toast.error(`Deletion failed: ${userMessage}`, { duration: 8000 });
      }
      
      setDeletingUserId(null);
      setDeleteModal({ isOpen: false, user: null });
      setDeletionValidation(null);
    }
  };

  const handleDeleteUserClick = async (user) => {
    try {
      setValidatingDeletion(true);
      
      // Basic client-side validation
      if (user.uid === currentUser?.uid) {
        toast.error('Cannot delete your own account');
        return;
      }
      
      if (!user.uid || typeof user.uid !== 'string') {
        toast.error('Invalid user ID');
        return;
      }
      
      // Perform basic validation
      try {
        const validation = await userDeletionValidator.validateUserDeletion(user.uid, currentUser?.uid);
        setDeletionValidation(validation);
        
        if (!validation.canDelete) {
          toast.error(`Cannot delete user: ${validation.blockers.join(', ')}`);
          return;
        }
        
        // Show warnings if any
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => {
            toast.warning(warning, { duration: 6000 });
          });
        }
      } catch (validationError) {
        console.warn('Validation failed, proceeding with basic checks:', validationError);
        // Set basic validation data if detailed validation fails
        setDeletionValidation({
          canDelete: true,
          warnings: ['Could not perform complete validation - proceeding with caution'],
          blockers: [],
          dataEstimate: {
            blogs: 'Unknown',
            content: 'Unknown',
            products: 'Unknown',
            estimatedTime: '1-5 minutes'
          }
        });
      }
      
      setDeleteModal({ isOpen: true, user });
    } catch (error) {
      console.error('Error validating user deletion:', error);
      toast.error('Validation failed, but you can still proceed with deletion if needed.');
      
      // Allow deletion to proceed with minimal validation
      setDeletionValidation({
        canDelete: true,
        warnings: ['Validation failed - proceeding with basic safety checks'],
        blockers: [],
        dataEstimate: {
          blogs: 'Unknown',
          content: 'Unknown', 
          products: 'Unknown',
          estimatedTime: 'Unknown'
        }
      });
      setDeleteModal({ isOpen: true, user });
    } finally {
      setValidatingDeletion(false);
    }
  };


  const toggleAdminRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setUpdating(true);
    await handleUpdateUser(user.uid, { 
      role: newRole 
    });
  };

  const columns = [
    {
      key: 'email',
      title: 'User',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {row.displayName || 'No name'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {value}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          {value === 'admin' ? (
            <>
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="badge bg-amber-100 text-amber-800 border-amber-200">
                Admin
              </span>
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-gray-600" />
              <span className="badge badge-secondary">
                User
              </span>
            </>
          )}
        </div>
      )
    },
    {
      key: 'maxBlogs',
      title: 'Max Blogs',
      render: (value, row) => (
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{value || 1}</div>
          <div className="text-xs text-muted-foreground">allowed</div>
        </div>
      )
    },
    {
      key: 'totalStorageMB',
      title: 'Storage Limit',
      render: (value, row) => (
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{value || 100} MB</div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      )
    },
    {
      key: 'emailVerified',
      title: 'Email Status',
      render: (value) => (
        <div className="flex items-center space-x-2">
          {value ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Verified</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Unverified</span>
            </>
          )}
        </div>
      )
    },
    {
      key: 'creationTime',
      title: 'Created',
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
            onClick={() => setEditModal({ isOpen: true, user: row })}
            className="text-primary p-2 rounded-md hover:bg-primary/10 transition-colors duration-200"
            title="Edit user"
          >
            <Settings className="h-4 w-4" />
          </button>
          
          {/* Quick admin role toggle */}
          {row.uid !== currentUser?.uid && (
            <button
              onClick={() => toggleAdminRole(row)}
              disabled={updating}
              className={`p-2 rounded-md transition-colors duration-200 ${
                row.role === 'admin' 
                  ? 'text-amber-600 hover:bg-amber-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={`${row.role === 'admin' ? 'Remove admin' : 'Make admin'}`}
            >
              {row.role === 'admin' ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </button>
          )}
          
          {/* Delete user button */}
          {row.uid !== currentUser?.uid && (
            <button
              onClick={() => handleDeleteUserClick(row)}
              disabled={validatingDeletion}
              className="text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors duration-200"
              title="Delete user"
            >
              {deletingUserId === row.uid ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              ) : validatingDeletion ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
          
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
              You need administrator privileges to access user management.
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
      {/* Page Header - Always visible */}
      <div className="page-header mb-16">
        <h1 className="page-title">User Management</h1>
        <p className="page-description">
          Manage user roles and multi-blog access permissions
        </p>
      </div>

      {/* Stats Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          <div className="card border-blue-200 bg-blue-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-3">Total Users</p>
                  <p className="text-3xl font-bold text-blue-900 leading-none">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card border-amber-200 bg-amber-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 mb-3">Administrators</p>
                  <p className="text-3xl font-bold text-amber-900 leading-none">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="card border-green-200 bg-green-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-3">Multi-Blog Users</p>
                  <p className="text-3xl font-bold text-green-900 leading-none">
                    {users.filter(u => (u.maxBlogs && u.maxBlogs > 1)).length}
                  </p>
                </div>
                <Database className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card border-orange-200 bg-orange-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-3">Total Storage</p>
                  <p className="text-3xl font-bold text-orange-900 leading-none">
                    {(users.reduce((sum, u) => sum + (u.totalStorageMB || 100), 0) / 1024).toFixed(1)} GB
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <UserManagementSkeleton />
      ) : (
        error ? (
          <div className="card border-red-200 bg-red-50">
            <div className="card-content p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-red-500" />
              <h3 className="text-xl font-bold text-red-800 mb-4">Error Loading Users</h3>
              <p className="text-red-700 mb-6">{error}</p>
              <button onClick={fetchUsers} className="btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-content p-0">
              <DataTable
                data={users}
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

      {/* Edit User Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, user: null })}
        title={`Edit User: ${editModal.user?.email}`}
        size="md"
      >
        {editModal.user && (
          <UserEditForm
            user={editModal.user}
            onSave={handleUpdateUser}
            onCancel={() => setEditModal({ isOpen: false, user: null })}
            updating={updating}
            currentUserId={currentUser?.uid}
          />
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          // Only allow closing if not currently deleting
          if (!deletingUserId) {
            setDeleteModal({ isOpen: false, user: null });
            setDeletionValidation(null);
          }
        }}
        title={`Delete User: ${deleteModal.user?.email}`}
        size="md"
      >
        {deleteModal.user && (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Delete User Account
                </h3>
                <p className="text-base text-muted-foreground mb-4">
                  Are you sure you want to delete the account for <strong>{deleteModal.user.email}</strong>?
                </p>
              </div>
            </div>

            {/* Data Estimate */}
            {deletionValidation?.dataEstimate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Data to be deleted:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-blue-700">
                  <div>Blogs: {deletionValidation.dataEstimate.blogs}</div>
                  <div>Content: {deletionValidation.dataEstimate.content}</div>
                  <div>Products: {deletionValidation.dataEstimate.products}</div>
                  <div>Estimated time: {deletionValidation.dataEstimate.estimatedTime}</div>
                </div>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">This action will permanently delete:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• The user's account and authentication</li>
                <li>• All blogs and associated content</li>
                <li>• All products in their catalogs</li>
                <li>• All uploaded files and images</li>
                <li>• All analytics and usage data</li>
                <li>• All user settings and preferences</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">This action cannot be undone</p>
                  <p className="text-sm text-amber-700">
                    Make sure you have backed up any important data before proceeding. The deletion process may take several minutes for users with large amounts of data.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Additional warning for users with lots of data */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Deletion Process</p>
                  <p className="text-sm text-blue-700">
                    The system will attempt to delete all user data in the following order:
                  </p>
                  <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                    <li>All blogs, content, and products</li>
                    <li>User settings and preferences</li>
                    <li>Analytics and interaction data</li>
                    <li>Uploaded files and images</li>
                    <li>User authentication account</li>
                  </ol>
                  <p className="text-sm text-blue-700 mt-2">
                    If any step fails, the process will continue with remaining steps and report the results.
                  </p>
                </div>
              </div>
            </div>

            {/* Validation warnings */}
            {deletionValidation?.warnings && deletionValidation.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Warnings:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  {deletionValidation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t border-border">
              <button
                onClick={() => {
                  if (!deletingUserId) {
                    setDeleteModal({ isOpen: false, user: null });
                    setDeletionValidation(null);
                  }
                }}
                disabled={deletingUserId === deleteModal.user?.uid}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteModal.user)}
                disabled={deletingUserId === deleteModal.user?.uid}
                className="btn-danger"
              >
                {deletingUserId === deleteModal.user?.uid ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting User...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Deletion Progress Modal */}
      <UserDeletionProgress
        isVisible={deletionProgressModal.isOpen}
        onClose={() => setDeletionProgressModal({ isOpen: false, result: null })}
        deletionResult={deletionProgressModal.result}
      />
    </div>
  );
}

// User Edit Form Component
function UserEditForm({ user, onSave, onCancel, updating, currentUserId }) {
  const [formData, setFormData] = useState({
    role: user.role || 'user',
    canManageMultipleBlogs: user.canManageMultipleBlogs || false,
    maxBlogs: user.maxBlogs || 1,
    totalStorageMB: user.totalStorageMB || 100
  });
  const [errors, setErrors] = useState({});
  
  const [storageOption, setStorageOption] = useState('preset');
  const [customStorage, setCustomStorage] = useState('');

  const storagePresets = [
    { value: 100, label: '100 MB (Default)' },
    { value: 250, label: '250 MB' },
    { value: 500, label: '500 MB' },
    { value: 700, label: '700 MB' },
    { value: 1024, label: '1 GB' },
    { value: 2048, label: '2 GB' },
    { value: 5120, label: '5 GB' }
  ];

  useEffect(() => {
    // Determine if current storage is a preset or custom
    const isPreset = storagePresets.some(preset => preset.value === formData.totalStorageMB);
    if (isPreset) {
      setStorageOption('preset');
    } else {
      setStorageOption('custom');
      setCustomStorage(formData.totalStorageMB.toString());
    }
  }, [formData.totalStorageMB]);

  const validateForm = () => {
    const newErrors = {};
    
    // Role validation
    if (!formData.role || !['admin', 'user'].includes(formData.role)) {
      newErrors.role = 'Role must be either "admin" or "user"';
    }
    
    // Max blogs validation
    if (!Number.isInteger(formData.maxBlogs) || formData.maxBlogs < 1) {
      newErrors.maxBlogs = 'Maximum blogs must be a positive integer (minimum 1)';
    } else if (formData.maxBlogs > 50) {
      newErrors.maxBlogs = 'Maximum blogs cannot exceed 50';
    }
    
    // Storage validation
    if (!Number.isInteger(formData.totalStorageMB) || formData.totalStorageMB < 100) {
      newErrors.totalStorageMB = 'Storage limit must be at least 100 MB';
    } else if (formData.totalStorageMB > 100000) {
      newErrors.totalStorageMB = 'Storage limit cannot exceed 100 GB (100,000 MB)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleStorageOptionChange = (option) => {
    setStorageOption(option);
    if (option === 'preset') {
      setFormData(prev => ({ ...prev, totalStorageMB: 100 }));
      if (errors.totalStorageMB) {
        setErrors(prev => ({ ...prev, totalStorageMB: '' }));
      }
    }
  };

  const handleStoragePresetChange = (value) => {
    setFormData(prev => ({ ...prev, totalStorageMB: parseInt(value) }));
    if (errors.totalStorageMB) {
      setErrors(prev => ({ ...prev, totalStorageMB: '' }));
    }
  };

  const handleCustomStorageChange = (value) => {
    setCustomStorage(value);
    const numValue = parseInt(value) || 100;
    if (numValue >= 100) {
      setFormData(prev => ({ ...prev, totalStorageMB: numValue }));
      if (errors.totalStorageMB) {
        setErrors(prev => ({ ...prev, totalStorageMB: '' }));
      }
    }
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({ ...prev, role }));
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const handleMaxBlogsChange = (value) => {
    const numValue = parseInt(value) || 1;
    setFormData(prev => ({ 
      ...prev, 
      maxBlogs: numValue,
      canManageMultipleBlogs: numValue > 1
    }));
    if (errors.maxBlogs) {
      setErrors(prev => ({ ...prev, maxBlogs: '' }));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave(user.uid, formData);
  };

  const isCurrentUser = user.uid === currentUserId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Info */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">
              {user.displayName || 'No display name'}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Created:</span>
            <div className="text-muted-foreground">
              {user.creationTime ? format(new Date(user.creationTime), 'MMM dd, yyyy') : 'N/A'}
            </div>
          </div>
          <div>
            <span className="font-medium">Email Status:</span>
            <div className={user.emailVerified ? 'text-green-600' : 'text-red-600'}>
              {user.emailVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div>
        <label className="block text-base font-medium text-foreground mb-4">
          User Role
        </label>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              name="role"
              value="user"
              checked={formData.role === 'user'}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={updating || isCurrentUser}
              className="w-4 h-4 text-primary"
            />
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span>Regular User</span>
            </div>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              name="role"
              value="admin"
              checked={formData.role === 'admin'}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={updating || isCurrentUser}
              className="w-4 h-4 text-primary"
            />
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-amber-600" />
              <span>Administrator</span>
            </div>
          </label>
        </div>
        {errors.role && (
          <p className="mt-2 text-sm text-destructive">{errors.role}</p>
        )}
        {isCurrentUser && (
          <p className="text-sm text-muted-foreground mt-2">
            You cannot change your own role
          </p>
        )}
      </div>

      {/* Multi-Blog Access */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-base font-medium text-foreground mb-4">
              Maximum Blogs
            </label>
            <InputField
              type="number"
              min="1"
              max="50"
              value={formData.maxBlogs}
              onChange={(e) => handleMaxBlogsChange(e.target.value)}
              disabled={updating}
              placeholder="1"
              error={errors.maxBlogs}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Number of blogs this user can create (1-50)
            </p>
          </div>
          
          <div>
            <label className="block text-base font-medium text-foreground mb-4">
              Storage Limit
            </label>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="storageOption"
                    value="preset"
                    checked={storageOption === 'preset'}
                    onChange={(e) => handleStorageOptionChange(e.target.value)}
                    disabled={updating}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Preset</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="storageOption"
                    value="custom"
                    checked={storageOption === 'custom'}
                    onChange={(e) => handleStorageOptionChange(e.target.value)}
                    disabled={updating}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Custom</span>
                </label>
              </div>
              
              {storageOption === 'preset' ? (
                <select
                  value={formData.totalStorageMB}
                  onChange={(e) => handleStoragePresetChange(e.target.value)}
                  disabled={updating}
                  className="input-field"
                >
                  {storagePresets.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center space-x-2">
                  <InputField
                    type="number"
                    min="100"
                    max="100000"
                    value={customStorage}
                    onChange={(e) => handleCustomStorageChange(e.target.value)}
                    disabled={updating}
                    placeholder="100"
                    className="flex-1"
                    error={errors.totalStorageMB}
                  />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
              )}
              {errors.totalStorageMB && (
                <p className="text-sm text-destructive">{errors.totalStorageMB}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total storage shared across all user's blogs
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-border">
        <LoadingButton
          onClick={onCancel}
          variant="secondary"
          disabled={updating}
        >
          Cancel
        </LoadingButton>
        <LoadingButton
          loading={updating}
          loadingText="Updating..."
          variant="primary"
          disabled={Object.keys(errors).length > 0}
        >
          Save Changes
        </LoadingButton>
      </div>
    </form>
  );
}
