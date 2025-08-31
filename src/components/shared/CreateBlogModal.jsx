import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blogService';
import Modal from './Modal';
import InputField from './InputField';
import { Plus, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateBlogModal({ isOpen, onClose, onBlogCreated }) {
  const { currentUser } = useAuth();
  const [creating, setCreating] = useState(false);
  const [checkingLimits, setCheckingLimits] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Blog name is required');
      return;
    }

    try {
      setCreating(true);
      
      // Server-side validation will handle limit checking
      const newBlog = await blogService.createNewBlog(
        currentUser.uid,
        formData.name.trim(),
        formData.description.trim()
      );
      
      toast.success('Blog created successfully');
      
      // Reset form
      setFormData({ name: '', description: '' });
      
      // Call the callback to handle post-creation actions
      if (onBlogCreated) {
        onBlogCreated(newBlog);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating blog:', error);
      
      // Handle specific error codes from server
      if (error.message.includes('BLOG_LIMIT_EXCEEDED')) {
        toast.error('Blog limit exceeded. Contact an administrator to increase your limit.');
      } else if (error.message.includes('Blog limit exceeded')) {
        toast.error(error.message);
      } else {
        toast.error(error.message || 'Failed to create blog');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Blog"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <InputField
            label="Blog Name"
            name="name"
            required
            placeholder="Enter blog name"
            value={formData.name}
            onChange={handleInputChange}
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
              value={formData.description}
              onChange={handleInputChange}
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
            <li>• Storage is shared across all your blogs ({currentUser?.totalStorageMB || 100} MB total)</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={creating || checkingLimits}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || checkingLimits || !formData.name.trim()}
            className="btn-primary"
          >
            {checkingLimits ? (
              'Checking limits...'
            ) : creating ? (
              'Creating...'
            ) : (
              'Create Blog'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}