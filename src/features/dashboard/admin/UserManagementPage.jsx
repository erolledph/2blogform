import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton, StatCardSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import InputField from '@/components/shared/InputField';
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
  Trash2
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
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      
      const response = await fetch('/.netlify/functions/admin-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          
          // Log additional error details for debugging
          if (errorData.details) {
            console.error('Server error details:', errorData.details);
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('Authentication token')) {
        userMessage = 'Authentication failed. Please try logging out and logging back in.';
      } else if (error.message.includes('Admin access required')) {
        userMessage = 'You do not have administrator privileges to access this page.';
      } else if (error.message.includes('Insufficient permissions')) {
        userMessage = 'The system configuration needs to be updated by a system administrator.';
      }
      
      setError(userMessage);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    const originalUsers = [...users];
    
    // Optimistic UI update
    const updatedUsers = users.map(user => 
      user.uid === userId ? { ...user, ...updates } : user
    );
    setUsers(updatedUsers);
    try {
      setUpdating(true);
      
      const token = await getAuthToken();
      const response = await fetch('/.netlify/functions/admin-users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          ...updates
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      toast.success('User updated successfully');
      setEditModal({ isOpen: false, user: null });
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
      setUsers(originalUsers); // Rollback on error
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const originalUsers = [...users];
    
    // Optimistic UI update - remove user immediately
    const updatedUsers = users.filter(u => u.uid !== user.uid);
    setUsers(updatedUsers);
    try {
      setDeleting(true);
      
      const token = await getAuthToken();
      const response = await fetch('/.netlify/functions/admin-users', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      toast.success('User deleted successfully');
      setDeleteModal({ isOpen: false, user: null });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
      setUsers(originalUsers); // Rollback on error
    } finally {
      setDeleting(false);
    }
  };

  const toggleAdminRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
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

  if (loading) {
    return (
      <div className="section-spacing">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
          <p className="page-description">Loading user data...</p>
        </div>
        
        {/* Stats Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
        
        {/* Table Skeleton */}
        <div className="card">
          <div className="card-content p-0">
            <TableSkeleton rows={10} columns={7} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-spacing">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
        </div>
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
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-description">
          Manage user roles and multi-blog access permissions
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card border-blue-200 bg-blue-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Total Users</p>
                <p className="text-3xl font-bold text-blue-900">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card border-amber-200 bg-amber-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 mb-2">Administrators</p>
                <p className="text-3xl font-bold text-amber-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="card border-green-200 bg-green-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Multi-Blog Users</p>
                <p className="text-3xl font-bold text-green-900">
                  {users.filter(u => (u.maxBlogs && u.maxBlogs > 1)).length}
                </p>
              </div>
              <Database className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card border-orange-200 bg-orange-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">Total Storage</p>
                <p className="text-3xl font-bold text-orange-900">
                  {(users.reduce((sum, u) => sum + (u.totalStorageMB || 100), 0) / 1024).toFixed(1)} GB
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
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
        onClose={() => setDeleteModal({ isOpen: false, user: null })}
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
                    Make sure you have backed up any important data before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-border">
              <button
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteModal.user)}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive-foreground mr-2"></div>
                    Deleting...
                  </div>
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

  const handleStorageOptionChange = (option) => {
    setStorageOption(option);
    if (option === 'preset') {
      setFormData(prev => ({ ...prev, totalStorageMB: 100 }));
    }
  };

  const handleStoragePresetChange = (value) => {
    setFormData(prev => ({ ...prev, totalStorageMB: parseInt(value) }));
  };

  const handleCustomStorageChange = (value) => {
    setCustomStorage(value);
    const numValue = parseInt(value) || 100;
    if (numValue >= 100) {
      setFormData(prev => ({ ...prev, totalStorageMB: numValue }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate maxBlogs
    if (formData.maxBlogs < 1) {
      toast.error('Maximum blogs must be at least 1');
      return;
    }
    
    // Validate totalStorageMB
    if (formData.totalStorageMB < 100) {
      toast.error('Storage limit must be at least 100 MB');
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
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              disabled={updating || isCurrentUser}
              className="w-4 h-4 text-primary"
            />
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-amber-600" />
              <span>Administrator</span>
            </div>
          </label>
        </div>
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
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setFormData(prev => ({ 
                  ...prev, 
                  maxBlogs: value,
                  canManageMultipleBlogs: value > 1
                }));
              }}
              disabled={updating}
              placeholder="1"
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
                    value={customStorage}
                    onChange={(e) => handleCustomStorageChange(e.target.value)}
                    disabled={updating}
                    placeholder="100"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
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
        >
          Cancel
        </LoadingButton>
        <LoadingButton
          loading={updating}
          loadingText="Updating..."
          variant="primary"
        >
          Save Changes
        </LoadingButton>
      </div>
    </form>
  );
}