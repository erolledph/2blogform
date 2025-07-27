import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blogService';
import InputField from '@/components/shared/InputField';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import CreateBlogModal from '@/components/shared/CreateBlogModal';
import { BookOpen, Save, Plus, Edit, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageBlogPage({ activeBlogId, setActiveBlogId }) {
  const { currentUser } = useAuth();
  const [currentBlog, setCurrentBlog] = useState(null);
  const [allBlogs, setAllBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (currentUser?.uid && activeBlogId) {
      fetchBlogData();
    }
  }, [currentUser?.uid, activeBlogId]);

  const fetchBlogData = async () => {
    try {
      setLoading(true);
      
      // Fetch all blogs for the user
      const blogs = await blogService.fetchUserBlogs(currentUser.uid);
      setAllBlogs(blogs);
      
      // Find the current active blog
      const activeBlog = blogs.find(blog => blog.id === activeBlogId);
      
      if (activeBlog) {
        setCurrentBlog(activeBlog);
        setFormData({
          name: activeBlog.name || '',
          description: activeBlog.description || ''
        });
      } else {
        // If active blog not found, try to get blog details directly
        try {
          const blogDetails = await blogService.getBlogById(currentUser.uid, activeBlogId);
          setCurrentBlog(blogDetails);
          setFormData({
            name: blogDetails.name || '',
            description: blogDetails.description || ''
          });
        } catch (error) {
          console.error('Error fetching blog details:', error);
          toast.error('Failed to load blog details');
        }
      }
    } catch (error) {
      console.error('Error fetching blog data:', error);
      toast.error('Failed to load blog data');
    } finally {
      setLoading(false);
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

    try {
      setSaving(true);
      
      await blogService.updateBlog(currentUser.uid, activeBlogId, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      // Update local state
      setCurrentBlog(prev => ({
        ...prev,
        name: formData.name.trim(),
        description: formData.description.trim()
      }));
      
      setSaved(true);
      toast.success('Blog updated successfully');
      
      // Reset saved state after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error('Failed to update blog');
    } finally {
      setSaving(false);
    }
  };

  const handleBlogCreated = async (newBlog) => {
    // Refresh the blogs list
    await fetchBlogData();
    
    // Switch to the new blog
    setActiveBlogId(newBlog.id);
    
    toast.success(`Switched to "${newBlog.name}"`);
  };

  const canManageMultipleBlogs = currentUser?.canManageMultipleBlogs || false;

  if (loading) {
    return (
      <div className="section-spacing">
        <div className="page-header">
          <h1 className="page-title">Manage Blog</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="page-header">
        <h1 className="page-title">Manage Blog</h1>
        <p className="page-description">
          Configure your blog settings and create new blogs
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Current Blog Settings */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h2 className="card-title">Current Blog Settings</h2>
            </div>
            <p className="card-description">
              Update your blog name and description
            </p>
          </div>
          <div className="card-content">
            <form onSubmit={handleSave} className="space-y-6">
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
                <label className="block text-base font-medium text-foreground mb-4">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={4}
                  className="input-field resize-none"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of your blog"
                  disabled={saving}
                />
              </div>

              {/* Blog Info */}
              {currentBlog && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Blog Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blog ID:</span>
                      <span className="font-mono text-xs">{currentBlog.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{currentBlog.createdAt?.toDate().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{currentBlog.updatedAt?.toDate().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}

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
          </div>
        </div>

        {/* Blog Management */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Plus className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="card-title">Blog Management</h2>
            </div>
            <p className="card-description">
              Manage your blogs and create new ones
            </p>
          </div>
          <div className="card-content space-y-6">
            {/* Current Blogs List */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Blogs</h3>
              <div className="space-y-3">
                {allBlogs.map((blog) => (
                  <div
                    key={blog.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      blog.id === activeBlogId 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-background hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">{blog.name}</div>
                          {blog.description && (
                            <div className="text-sm text-muted-foreground">{blog.description}</div>
                          )}
                        </div>
                      </div>
                      {blog.id === activeBlogId && (
                        <span className="badge badge-success text-xs">Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Blog Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Create New Blog</h3>
              
              {canManageMultipleBlogs ? (
                <div className="space-y-4">
                  <p className="text-base text-muted-foreground">
                    You have permission to create multiple blogs. Each blog will have its own content, products, and API endpoints.
                  </p>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="btn-primary w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Blog
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Multi-Blog Access Required</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    You currently have access to one blog. To create additional blogs, you need multi-blog access permissions.
                  </p>
                  <p className="text-xs text-amber-600">
                    Contact your administrator to request multi-blog access if you need to manage multiple blogs.
                  </p>
                </div>
              )}
            </div>

            {/* Blog Statistics */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-900">{allBlogs.length}</div>
                  <div className="text-sm text-blue-600">Total Blogs</div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {canManageMultipleBlogs ? '∞' : '1'}
                  </div>
                  <div className="text-sm text-green-600">Max Allowed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Blog Modal */}
      <CreateBlogModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onBlogCreated={handleBlogCreated}
      />
    </div>
  );
}