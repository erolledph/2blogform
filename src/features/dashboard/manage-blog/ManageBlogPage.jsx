import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blogService';
import InputField from '@/components/shared/InputField';
import CreateBlogModal from '@/components/shared/CreateBlogModal';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { BookOpen, Save, Plus, Edit, Check, Copy, Trash2, AlertTriangle, ExternalLink, RefreshCw, Globe, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageBlogPage({ activeBlogId, setActiveBlogId }) {
  const { currentUser, getAuthToken } = useAuth();
  const [currentBlog, setCurrentBlog] = useState(null);
  const [allBlogs, setAllBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBlog, setDeletingBlog] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (currentUser?.uid && activeBlogId) {
      fetchBlogData();
    }
  }, [currentUser?.uid, activeBlogId]);

  const refreshBlogData = async () => {
    setRefreshing(true);
    await fetchBlogData();
    setRefreshing(false);
    toast.success('Blog data refreshed');
  };

  const fetchBlogData = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      // Fetch all blogs for the user
      const blogs = await blogService.fetchUserBlogs(currentUser.uid);
      setAllBlogs(blogs);
      
      // If no blogs exist, this shouldn't happen due to ensureDefaultBlog
      if (blogs.length === 0) {
        console.warn('No blogs found for user');
        setCurrentBlog(null);
        setFormData({ name: '', description: '' });
        return;
      }
      
      // Find the current active blog
      const activeBlog = blogs.find(blog => blog.id === activeBlogId);
      
      if (activeBlog) {
        setCurrentBlog(activeBlog);
        setFormData({
          name: activeBlog.name || '',
          description: activeBlog.description || ''
        });
      } else {
        // Active blog not found in the list, switch to the first available blog
        console.warn(`Active blog ${activeBlogId} not found, switching to first available blog`);
        const firstBlog = blogs[0];
        setActiveBlogId(firstBlog.id);
        setCurrentBlog(firstBlog);
        setFormData({
          name: firstBlog.name || '',
          description: firstBlog.description || ''
        });
        toast.success(`Switched to "${firstBlog.name}" as the previous blog was not found.`);
      }
    } catch (error) {
      console.error('Error fetching blog data:', error);
      // Only show error toast if it's not a refresh operation
      if (!refreshing) {
        toast.error('Failed to load blog data');
      }
    } finally {
      if (!refreshing) {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset saved state when user makes changes
    if (saved) {
      setSaved(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Blog name is required');
      return;
    }

    const originalBlog = { ...currentBlog };
    const originalAllBlogs = [...allBlogs];
    
    // Optimistic UI update
    const updatedBlog = {
      ...currentBlog,
      name: formData.name.trim(),
      description: formData.description.trim()
    };
    setCurrentBlog(updatedBlog);
    
    const updatedAllBlogs = allBlogs.map(blog => 
      blog.id === activeBlogId 
        ? { ...blog, name: formData.name.trim(), description: formData.description.trim() }
        : blog
    );
    setAllBlogs(updatedAllBlogs);
    try {
      setSaving(true);
      
      await blogService.updateBlog(currentUser.uid, activeBlogId, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      setSaved(true);
      toast.success('Blog updated successfully');
      
      // Reset saved state after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error('Failed to update blog');
      // Rollback on error
      setCurrentBlog(originalBlog);
      setAllBlogs(originalAllBlogs);
    } finally {
      setSaving(false);
    }
  };

  const handleBlogCreated = async (newBlog) => {
    // Optimistic UI update - add new blog to the list
    setAllBlogs(prev => [newBlog, ...prev]);
    
    // Switch to the new blog
    setActiveBlogId(newBlog.id);
    
    toast.success(`Switched to "${newBlog.name}"`);
  };

  const handleBlogSwitch = (blog) => {
    if (blog.id !== activeBlogId) {
      setActiveBlogId(blog.id);
      toast.success(`Switched to "${blog.name}"`);
    }
  };
  
  const handleDeleteBlog = async () => {
    if (!currentBlog || allBlogs.length <= 1) {
      toast.error('Cannot delete the last blog');
      return;
    }

    const originalAllBlogs = [...allBlogs];
    const remainingBlogs = allBlogs.filter(blog => blog.id !== activeBlogId);
    
    // Optimistic UI update - remove blog and switch to another
    setAllBlogs(remainingBlogs);
    if (remainingBlogs.length > 0) {
      setActiveBlogId(remainingBlogs[0].id);
      setCurrentBlog(remainingBlogs[0]);
      setFormData({
        name: remainingBlogs[0].name || '',
        description: remainingBlogs[0].description || ''
      });
    }
    try {
      setDeletingBlog(true);
      
      const token = await getAuthToken();
      await blogService.deleteBlog(currentUser.uid, activeBlogId, token);
      
      toast.success(`Blog deleted. Switched to "${remainingBlogs[0].name}"`);
      
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting blog:', error);
      
      if (error.message.includes('LAST_BLOG_DELETION_FORBIDDEN')) {
        toast.error('Cannot delete your last blog. Users must have at least one blog.');
      } else {
        toast.error(error.message || 'Failed to delete blog');
      }
      
      // Rollback on error
      setAllBlogs(originalAllBlogs);
      setActiveBlogId(activeBlogId);
      setCurrentBlog(originalAllBlogs.find(blog => blog.id === activeBlogId));
    } finally {
      setDeletingBlog(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const getContentApiUrl = () => {
    return `${window.location.origin}/users/${currentUser?.uid}/blogs/${activeBlogId}/api/content.json`;
  };

  const getProductsApiUrl = () => {
    return `${window.location.origin}/users/${currentUser?.uid}/blogs/${activeBlogId}/api/products.json`;
  };

  const canManageMultipleBlogs = currentUser?.canManageMultipleBlogs || false;

  if (loading) {
    return (
      <div className="section-spacing">
        <div className="space-y-8">
          <SkeletonLoader lines={2} height="xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
        <div className="page-header mb-0 flex-1">
          <h1 className="page-title mb-2">Manage Blog</h1>
          <p className="page-description">
            Configure your blog settings and create new blogs
          </p>
        </div>
        <div className="flex items-center space-x-6">
          <button
            onClick={refreshBlogData}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Current Blog Status Bar */}
      {currentBlog && (
        <div className="card border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 mb-12">
          <div className="card-content p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900 mb-2">Currently Managing: {currentBlog.name}</h2>
                  <p className="text-blue-700 leading-relaxed">
                    {currentBlog.description || 'No description provided'}
                  </p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-blue-600">
                    <span>Blog ID: {currentBlog.id.substring(0, 12)}...</span>
                    <span>•</span>
                    <span>Created: {currentBlog.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-900 leading-none">{allBlogs.length}</div>
                <div className="text-sm text-blue-600">Total Blogs</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Current Blog Settings */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-green-100 rounded-lg">
                <Edit className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="card-title">Edit Blog Details</h2>
            </div>
            <p className="card-description">
              Update your blog name and description
            </p>
          </div>
          <div className="card-content">
            <form onSubmit={handleSave} className="space-y-8">
              <InputField
                label="Blog Name"
                name="name"
                required
                placeholder="Enter blog name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={saving}
              />

              <div>
                <label className="block text-base font-medium text-foreground mb-3">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={5}
                  className="input-field resize-none"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of your blog"
                  disabled={saving}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="btn-primary w-full"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </>
                )}
              </button>
            </form>

            {/* Delete Blog Section */}
            {allBlogs.length > 1 && (
              <div className="border-t border-border pt-8">
                <h4 className="text-base font-medium text-foreground mb-6">Danger Zone</h4>
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-red-800 mb-3">Delete This Blog</h5>
                      <p className="text-sm text-red-700 mb-6 leading-relaxed">
                        This will permanently delete this blog and all its content and products. This action cannot be undone.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDeleteModalOpen(true)}
                        className="btn-danger btn-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Blog
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Blog Management */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-purple-100 rounded-lg">
                <Database className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="card-title">Blog Management</h2>
            </div>
            <p className="card-description">
              Switch between blogs and create new ones
            </p>
          </div>
          <div className="card-content space-y-8">
            {/* Current Blogs List */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-6">Your Blogs</h3>
              <div className="space-y-4">
                {allBlogs.map((blog) => (
                  <div
                    key={blog.id}
                    onClick={() => handleBlogSwitch(blog)}
                    className={`p-6 border-2 rounded-xl transition-all duration-200 ${
                      blog.id === activeBlogId
                        ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-lg transform scale-105'
                        : 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          blog.id === activeBlogId 
                            ? 'bg-blue-500' 
                            : 'bg-gray-100'
                        }`}>
                          <BookOpen className={`h-5 w-5 ${
                            blog.id === activeBlogId 
                              ? 'text-white' 
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className={`font-semibold ${
                            blog.id === activeBlogId 
                              ? 'text-blue-900' 
                              : 'text-gray-900'
                          }`}>
                            {blog.name}
                          </div>
                          {blog.description && (
                            <div className={`text-sm mt-2 leading-relaxed ${
                              blog.id === activeBlogId 
                                ? 'text-blue-700' 
                                : 'text-gray-600'
                            }`}>
                              {blog.description}
                            </div>
                          )}
                          <div className={`text-xs mt-2 ${
                            blog.id === activeBlogId 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                          }`}>
                            Created {blog.createdAt?.toDate().toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {blog.id === activeBlogId && (
                          <span className="px-4 py-2 bg-blue-500 text-white text-xs font-semibold rounded-full">
                            Active
                          </span>
                        )}
                        {blog.id !== activeBlogId && (
                          <span className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            Click to switch
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Instructions for switching blogs */}
              {allBlogs.length > 1 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 leading-relaxed">
                    💡 <strong>Tip:</strong> Click on any blog above to switch to it. The active blog determines which content and products you're managing.
                  </p>
                </div>
              )}
            </div>

            {/* Create New Blog Section */}
            <div className="border-t border-border pt-8">
              <h3 className="text-lg font-semibold text-foreground mb-6">Create New Blog</h3>
              
              {(canManageMultipleBlogs || (currentUser?.maxBlogs && currentUser.maxBlogs > 1)) ? (
                <div className="space-y-6">
                  {allBlogs.length < (currentUser?.maxBlogs || 1) ? (
                    <>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        You can create up to {currentUser?.maxBlogs || 1} blogs. Currently have {allBlogs.length}.
                      </p>
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="btn-primary w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Blog ({allBlogs.length}/{currentUser?.maxBlogs || 1})
                      </button>
                    </>
                  ) : (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="text-sm font-medium text-amber-800 mb-3">Blog Limit Reached</h4>
                      <p className="text-sm text-amber-700 mb-4 leading-relaxed">
                        You have reached your maximum of {currentUser?.maxBlogs || 1} blog{(currentUser?.maxBlogs || 1) > 1 ? 's' : ''}. 
                        To create more blogs, contact an administrator to increase your limit.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-800 mb-3">Multi-Blog Access Required</h4>
                  <p className="text-sm text-amber-700 mb-4 leading-relaxed">
                    You currently have access to one blog. To create additional blogs, you need multi-blog access permissions.
                  </p>
                  <p className="text-xs text-amber-600">
                    Contact your administrator to request multi-blog access if you need to manage multiple blogs.
                  </p>
                </div>
              )}
            </div>

            {/* Blog Statistics */}
            <div className="border-t border-border pt-8">
              <h3 className="text-lg font-semibold text-foreground mb-6">Statistics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-900 leading-none">{allBlogs.length}</div>
                  <div className="text-sm text-blue-600">Total Blogs</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-900 leading-none">
                    {currentUser?.maxBlogs || 1}
                  </div>
                  <div className="text-sm text-green-600">Max Allowed</div>
                </div>
              </div>
              
              {/* Storage Information */}
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-purple-900 leading-none">{currentUser?.totalStorageMB || 100} MB</div>
                    <div className="text-sm text-purple-600">Storage Limit</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-purple-700">Shared across all blogs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoints Section */}
      <div className="card mt-12">
        <div className="card-header">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-indigo-100 rounded-lg">
              <Globe className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="card-title">API Endpoints</h2>
          </div>
          <p className="card-description">
            Public API endpoints for accessing your blog content and products
          </p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-blue-800">Content API</h4>
                  <p className="text-sm text-blue-600">Access all published blog content</p>
                </div>
              </div>
              <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
                <code className="text-xs text-blue-800 break-all font-mono">
                  {getContentApiUrl()}
                </code>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => copyToClipboard(getContentApiUrl(), 'Content API URL')}
                  className="btn-secondary btn-sm flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </button>
                <a
                  href={getContentApiUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary btn-sm flex-1 inline-flex items-center justify-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </a>
              </div>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-green-500 rounded-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-800">Products API</h4>
                  <p className="text-sm text-green-600">Access all published products</p>
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded-lg p-4 mb-4">
                <code className="text-xs text-green-800 break-all font-mono">
                  {getProductsApiUrl()}
                </code>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => copyToClipboard(getProductsApiUrl(), 'Products API URL')}
                  className="btn-secondary btn-sm flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </button>
                <a
                  href={getProductsApiUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary btn-sm flex-1 inline-flex items-center justify-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Information Section */}
      {currentBlog && (
        <div className="card mt-12">
          <div className="card-header">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gray-100 rounded-lg">
                <Database className="h-8 w-8 text-gray-600" />
              </div>
              <h2 className="card-title">Blog Information</h2>
            </div>
            <p className="card-description">
              Technical details and metadata for the current blog
            </p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Blog ID</h4>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-gray-800 bg-white px-3 py-2 rounded border">
                    {currentBlog.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(currentBlog.id, 'Blog ID')}
                    className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                    title="Copy Blog ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Created Date</h4>
                <div className="text-sm text-gray-800">
                  {currentBlog.createdAt?.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Last Updated</h4>
                <div className="text-sm text-gray-800">
                  {currentBlog.updatedAt?.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Blog Modal */}
      <CreateBlogModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onBlogCreated={handleBlogCreated}
      />

      {/* Delete Blog Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Blog"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Delete "{currentBlog?.name}"?
              </h3>
              <p className="text-base text-muted-foreground mb-4">
                This action will permanently delete this blog and all associated content and products.
              </p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">What will be deleted:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• All blog content and articles</li>
              <li>• All products in this blog</li>
              <li>• Blog settings and configuration</li>
              <li>• Associated analytics data</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">This action cannot be undone</p>
                <p className="text-sm text-amber-700">
                  Make sure you have backed up any important content before proceeding.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingBlog}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteBlog}
              disabled={deletingBlog}
              className="btn-danger"
            >
              {deletingBlog ? (
                'Deleting...'
              ) : (
                'Delete Blog'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
