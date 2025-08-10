import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blogService';
import { ChevronDown, BookOpen, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BlogSelector({ activeBlogId, setActiveBlogId }) {
  const { currentUser } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    // Remove toast for blog switching to reduce UI noise
  };

  const getActiveBlog = () => {
    return blogs.find(blog => blog.id === activeBlogId);
  };

  const canManageMultipleBlogs = currentUser?.canManageMultipleBlogs || false;

  // Don't render if user can't manage multiple blogs
  if (!canManageMultipleBlogs) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Loading...</span>
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
            </div>
          </>
        )}
      </div>
    </>
  );
}