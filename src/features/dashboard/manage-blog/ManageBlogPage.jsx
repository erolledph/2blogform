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
      
      const blogs = await blogService.fetchUserBlogs(currentUser.uid);
      setAllBlogs(blogs);
      
      if (blogs.length === 0) {
        console.warn('No blogs found for user');
        setCurrentBlog(null);
        setFormData({ name: '', description: '' });
        return;
      }
      
      const activeBlog = blogs.find(blog => blog.id === activeBlogId);
      
      if (activeBlog) {
        setCurrentBlog(activeBlog);
        setFormData({
          name: activeBlog.name || '',
          description: activeBlog.description || ''
        });
      } else {
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
      
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error('Failed to update blog');
      setCurrentBlog(originalBlog);
      setAllBlogs(originalAllBlogs);
    } finally {
      setSaving(false);
    }
  };

  const handleBlogCreated = async (newBlog) => {
    setAllBlogs(prev => [newBlog, ...prev]);
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
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <SkeletonLoader lines={2} height="xl" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manage Blog</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Configure your blog settings and create new blogs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshBlogData}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Current Blog Settings */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Edit className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Blog Details</h2>
            </div>
            <p className="text-sm text-gray-600">
              Update your blog name and description
            </p>
          </div>
          <div>
            {currentBlog && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-blue-900 mb-1">Currently Managing: {currentBlog.name}</h2>
                      <p className="text-sm text-blue-700 line-clamp-2">
                        {currentBlog.description || 'No description provided'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-blue-600">
                        <span>Blog ID: {currentBlog.id.substring(0, 8)}...</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Created: {currentBlog.createdAt?.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">{allBlogs.length}</div>
                    <div className="text-xs text-blue-600">Total Blogs</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <InputField
                label="Blog Name"
                name="name"
                required
                placeholder="Enter blog name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of your blog"
                  disabled={saving}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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

            {allBlogs.length > 1 && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Danger Zone</h4>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-red-800 mb-2">Delete This Blog</h5>
                      <p className="text-sm text-red-700 mb-4">
                        This will permanently delete this blog and all its content and products. This action cannot be undone.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDeleteModalOpen(true)}
                        className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
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
        <div className="bg-white shadow-sm rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Database className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Blog Management</h2>
            </div>
            <p className="text-sm text-gray-600">
              Switch between blogs and create new ones
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Blogs</h3>
              <div className="space-y-3">
                {allBlogs.map((blog) => (
                  <div
                    key={blog.id}
                    onClick={() => handleBlogSwitch(blog)}
                    className={`p-4 border rounded-lg transition-all duration-200 ${
                      blog.id === activeBlogId
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          blog.id === activeBlogId 
                            ? 'bg-blue-500' 
                            : 'bg-gray-100'
                        }`}>
                          <BookOpen className={`h-4 w-4 ${
                            blog.id === activeBlogId 
                              ? 'text-white' 
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold text-sm ${
                            blog.id === activeBlogId 
                              ? 'text-blue-900' 
                              : 'text-gray-900'
                          }`}>
                            {blog.name}
                          </div>
                          {blog.description && (
                            <div className={`text-xs mt-1 line-clamp-2 ${
                              blog.id === activeBlogId 
                                ? 'text-blue-700' 
                                : 'text-gray-600'
                            }`}>
                              {blog.description}
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${
                            blog.id === activeBlogId 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                          }`}>
                            Created {blog.createdAt?.toDate().toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {blog.id === activeBlogId && (
                          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                        {blog.id !== activeBlogId && (
                          <span className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            Switch
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {allBlogs.length > 1 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Click on any blog to switch to it. The active blog determines which content and products you're managing.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Blog</h3>
              
              {(canManageMultipleBlogs || (currentUser?.maxBlogs && currentUser.maxBlogs > 1)) ? (
                <div className="space-y-4">
                  {allBlogs.length < (currentUser?.maxBlogs || 1) ? (
                    <>
                      <p className="text-sm text-gray-600">
                        You can create up to {currentUser?.maxBlogs || 1} blogs. Currently have {allBlogs.length}.
                      </p>
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Blog ({allBlogs.length}/{currentUser?.maxBlogs || 1})
                      </button>
                    </>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="text-sm font-medium text-amber-800 mb-2">Blog Limit Reached</h4>
                      <p className="text-sm text-amber-700">
                        You have reached your maximum of {currentUser?.maxBlogs || 1} blog{(currentUser?.maxBlogs || 1) > 1 ? 's' : ''}. 
                        Contact an administrator to increase your limit.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Multi-Blog Access Required</h4>
                  <p className="text-sm text-amber-700">
                    You currently have access to one blog. To create additional blogs, you need multi-blog access permissions.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-900">{allBlogs.length}</div>
                  <div className="text-xs text-blue-600">Total Blogs</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {currentUser?.maxBlogs || 1}
                  </div>
                  <div className="text-xs text-green-600">Max Allowed</div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold text-purple-900">{currentUser?.totalStorageMB || 100} MB</div>
                    <div className="text-xs text-purple-600">Storage Limit</div>
                  </div>
                  <div className="text-xs text-purple-700">Shared across all blogs</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">API Endpoints</h2>
            </div>
            <p className="text-sm text-gray-600">
              Public API endpoints for accessing your blog content and products
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-blue-800">Content API</h4>
                  <p className="text-xs text-blue-600">Access all published blog content</p>
                </div>
              </div>
              <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3 overflow-x-auto">
                <code className="text-xs text-blue-800 font-mono">
                  {getContentApiUrl()}
                </code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(getContentApiUrl(), 'Content API URL')}
                  className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </button>
                <a
                  href={getContentApiUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-green-800">Products API</h4>
                  <p className="text-xs text-green-600">Access all published products</p>
                </div>
              </div>
              <div className="bg-white border border-green-200 rounded-lg p-3 mb-3 overflow-x-auto">
                <code className="text-xs text-green-800 font-mono">
                  {getProductsApiUrl()}
                </code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(getProductsApiUrl(), 'Products API URL')}
                  className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </button>
                <a
                  href={getProductsApiUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Blog Information Section */}
        {currentBlog && (
          <div className="bg-white shadow-sm rounded-xl p-6">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Database className="h-6 w-6 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Blog Information</h2>
              </div>
              <p className="text-sm text-gray-600">
                Technical details and metadata for the current blog
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Blog ID</h4>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-gray-800 bg-white px-2 py-1 rounded border truncate">
                    {currentBlog.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(currentBlog.id, 'Blog ID')}
                    className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    title="Copy Blog ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Created Date</h4>
                <div className="text-sm text-gray-800">
                  {currentBlog.createdAt?.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h4>
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
        )}
      </div>

      <CreateBlogModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onBlogCreated={handleBlogCreated}
      />

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Blog"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete "{currentBlog?.name}"?
              </h3>
              <p className="text-sm text-gray-600">
                This action will permanently delete this blog and all associated content and products.
              </p>
            </div>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-2">What will be deleted:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• All blog content and articles</li>
              <li>• All products in this blog</li>
              <li>• Blog settings and configuration</li>
              <li>• Associated analytics data</li>
            </ul>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">This action cannot be undone</p>
                <p className="text-sm text-amber-700">
                  Make sure you have backed up any important content before proceeding.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingBlog}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteBlog}
              disabled={deletingBlog}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deletingBlog ? 'Deleting...' : 'Delete Blog'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}