import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Calendar, Search, Filter, MoreVertical, Edit, Trash2, Ban, CheckCircle } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Modal from '@/components/shared/Modal';

export default function UserManagementPage({ activeBlogId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [activeBlogId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockUsers = [
        {
          id: '1',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin',
          status: 'active',
          createdAt: new Date('2024-01-15'),
          lastLogin: new Date('2024-01-20'),
          blogAccess: ['blog1', 'blog2']
        },
        {
          id: '2',
          email: 'editor@example.com',
          displayName: 'Content Editor',
          role: 'editor',
          status: 'active',
          createdAt: new Date('2024-01-18'),
          lastLogin: new Date('2024-01-19'),
          blogAccess: ['blog1']
        },
        {
          id: '3',
          email: 'viewer@example.com',
          displayName: 'Content Viewer',
          role: 'viewer',
          status: 'inactive',
          createdAt: new Date('2024-01-20'),
          lastLogin: new Date('2024-01-20'),
          blogAccess: ['blog1']
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-50 border-red-200';
      case 'editor': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'viewer': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'text-green-600 bg-green-50 border-green-200'
      : 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="section-spacing">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="page-header mb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-description">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <button className="btn-primary">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card mb-8">
        <div className="card-content p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="input-field"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Users ({filteredUsers.length})</h2>
        </div>
        <div className="card-content p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Last Login</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {user.displayName || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                        {user.status === 'active' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Ban className="h-3 w-3 mr-1" />
                        )}
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {user.createdAt.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.status)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.status === 'active'
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                          title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.status === 'active' ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No users found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterRole !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add your first user to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Edit Modal */}
      {showUserModal && selectedUser && (
        <Modal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          title="Edit User"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={selectedUser.email}
                className="input-field"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={selectedUser.displayName || ''}
                className="input-field"
                placeholder="Enter display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Role
              </label>
              <select value={selectedUser.role} className="input-field">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          title="Delete User"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the user <strong>{selectedUser.email}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-danger">
                Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
