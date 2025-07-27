import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blogService';
import Modal from './Modal';
import InputField from './InputField';
import LoadingSpinner from './LoadingSpinner';
import { ChevronDown, Plus, BookOpen, Settings, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BlogSelector({ activeBlogId, setActiveBlogId }) {
  const { currentUser } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createModal, setCreateModal] = useState({ isOpen: false });
  const [creating, setCreating] = useState(false);
  const [newBlogForm, setNewBlogForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (currentUser?.uid) {
      fetchBlogs();
    }
  }, [currentUser?.uid]);

  const fetchBlogs = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const userBlogs = await blogService.fetchUserBlogs(currentUser.uid);
      setBlogs(userBlogs);
      
      // If no active blog is set, or the active blog doesn't exist in the list, set the first one
      if (!activeBlogId || !userBlogs.find(blog => blog.id === activeBlogId)) {
        if (userBlogs.length > 0) {
          setActiveBlogId(userBlogs[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleBlogSelect = (blogId) => {
    setActiveBlogId(blogId);
    setDropdownOpen(false);
    toast.success('Blog switched successfully');
  };

  const handleCreateBlog = async (e) => {
    e.preventDefault();
    
    if (!newBlogForm.name.trim()) {
      toast.error('Blog name is required');
      return;
    }

    try {
      setCreating(true);
      const newBlog = await blogService.createNewBlog(
        currentUser.uid,
        newBlogForm.name.trim(),
        newBlogForm.description.trim()
      );
      
      toast.success('Blog created successfully');
      
      // Refresh blogs list
      await fetchBlogs();
      
      // Switch to the new blog
      setActiveBlogId(newBlog.id);
      
      // Reset form and close modal
      setNewBlogForm({ name: '', description: '' });
      setCreateModal({ isOpen: false });
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('Failed to create blog');
    } finally {
      setCreating(false);
    }
  };

  const getActiveBlog = () => {
    return blogs.find(blog => blog.id === activeBlogId);
  };

  const canManageMultipleBlogs = currentUser?.canManageMultipleBlogs || false;

  // Don't render if user can't manage multiple blogs and only has one blog
  if (!canManageMultipleBlogs && blogs.length <= 1) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-muted-foreground">Loading blogs...</span>
      </div>
    );
  }

  const activeBlog = getActiveBlog();

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-3 px-4 py-2 bg-white border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200 min-w-48"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-foreground truncate max-w-32">
                {activeBlog?.name || 'Select Blog'}
              </span>
              {blogs.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {blogs.length} blog{blogs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setDropdownOpen(false)}
            />
            
            {/* Dropdown Content */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
              {/* Blog List */}
              <div className="py-2">
                {blogs.map((blog) => (
                  <button
                    key={blog.id}
                    onClick={() => handleBlogSelect(blog.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-200 ${
                      blog.id === activeBlogId ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {blog.name}
                        </span>
                        {blog.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {blog.description}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(blog.createdAt?.toDate()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {blog.id === activeBlogId && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Create New Blog Button */}
              {canManageMultipleBlogs && (
                <>
                  <div className="border-t border-border" />
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setCreateModal({ isOpen: true });
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors duration-200 text-primary"
                    >
                      <Plus className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Create New Blog</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Blog Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={() => {
          setCreateModal({ isOpen: false });
          setNewBlogForm({ name: '', description: '' });
        }}
        title="Create New Blog"
        size="md"
      >
        <form onSubmit={handleCreateBlog} className="space-y-6">
          <div className="space-y-4">
            <InputField
              label="Blog Name"
              name="name"
              required
              placeholder="Enter blog name"
              value={newBlogForm.name}
              onChange={(e) => setNewBlogForm(prev => ({ ...prev, name: e.target.value }))}
              disabled={creating}
            />

            <div>
              <label className="block text-base font-medium text-foreground mb-4">
                Description (Optional)
              </label>
              <textarea
                name="description"
                rows={3}
                className="input-field resize-none"
                value={newBlogForm.description}
                onChange={(e) => setNewBlogForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your blog"
                disabled={creating}
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• A new blog will be created with its own content and products</li>
              <li>• You'll be automatically switched to the new blog</li>
              <li>• All content you create will be associated with the active blog</li>
              <li>• Each blog has its own API endpoints for public access</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setCreateModal({ isOpen: false });
                setNewBlogForm({ name: '', description: '' });
              }}
              disabled={creating}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newBlogForm.name.trim()}
              className="btn-primary"
            >
              {creating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Blog
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}