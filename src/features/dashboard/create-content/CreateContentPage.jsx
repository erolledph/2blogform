import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContentById } from '@/hooks/useContent';
import SimpleMDE from 'react-simplemde-editor';
import InputField from '@/components/shared/InputField';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ImageGalleryModal from '@/components/shared/ImageGalleryModal';
import ImageUploader from '@/components/shared/ImageUploader';
import Modal from '@/components/shared/Modal';
import { Save, ArrowLeft, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { generateSlug, parseArrayInput } from '@/utils/helpers';
import toast from 'react-hot-toast';
import 'easymde/dist/easymde.min.css';

export default function CreateContentPage({ activeBlogId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthToken } = useAuth();
  const isEditing = Boolean(id);
  const { content: existingContent, loading: contentLoading } = useContentById(id, activeBlogId);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    featuredImageUrl: '',
    metaDescription: '',
    seoTitle: '',
    keywords: [],
    author: '',
    categories: [],
    tags: [],
    status: 'draft'
  });

  // Separate state for array input fields to improve typing experience
  const [keywordsInput, setKeywordsInput] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [galleryModal, setGalleryModal] = useState({ isOpen: false });
  const [uploadModal, setUploadModal] = useState({ isOpen: false });

  // Memoize SimpleMDE options to prevent re-initialization on every render
  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: 'Write your content in Markdown...',
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', '|',
      'guide'
    ]
  }), []);

  useEffect(() => {
    if (isEditing && existingContent) {
      setFormData({
        title: existingContent.title || '',
        slug: existingContent.slug || '',
        content: existingContent.content || '',
        featuredImageUrl: existingContent.featuredImageUrl || '',
        metaDescription: existingContent.metaDescription || '',
        seoTitle: existingContent.seoTitle || '',
        keywords: existingContent.keywords || [],
        author: existingContent.author || '',
        categories: existingContent.categories || [],
        tags: existingContent.tags || [],
        status: existingContent.status || 'draft'
      });

      // Initialize array input fields with joined values
      setKeywordsInput((existingContent.keywords || []).join(', '));
      setCategoriesInput((existingContent.categories || []).join(', '));
      setTagsInput((existingContent.tags || []).join(', '));
    }
  }, [isEditing, existingContent]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Slug must be less than 100 characters';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length > 50000) {
      newErrors.content = 'Content must be less than 50,000 characters';
    }

    if (formData.metaDescription && formData.metaDescription.length > 160) {
      newErrors.metaDescription = 'Meta description should be less than 160 characters';
    }

    if (formData.seoTitle && formData.seoTitle.length > 60) {
      newErrors.seoTitle = 'SEO title should be less than 60 characters';
    }

    if (formData.author && formData.author.length > 100) {
      newErrors.author = 'Author name must be less than 100 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Handle title and slug updates in a single state update
    if (name === 'title' && !isEditing) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        slug: generateSlug(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleKeywordsBlur = () => {
    const keywordsArray = parseArrayInput(keywordsInput);
    setFormData(prev => ({
      ...prev,
      keywords: keywordsArray
    }));
  };

  const handleCategoriesBlur = () => {
    const categoriesArray = parseArrayInput(categoriesInput);
    setFormData(prev => ({
      ...prev,
      categories: categoriesArray
    }));
  };

  const handleTagsBlur = () => {
    const tagsArray = parseArrayInput(tagsInput);
    setFormData(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  const handleImageSelect = (image) => {
    setFormData(prev => ({
      ...prev,
      featuredImageUrl: image.downloadURL
    }));
    toast.success('Featured image selected');
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      featuredImageUrl: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Ensure array fields are updated with current input values before submitting
    const finalFormData = {
      ...formData,
      blogId: activeBlogId,
      featuredImageUrl: formData.featuredImageUrl || '',
      keywords: parseArrayInput(keywordsInput),
      categories: parseArrayInput(categoriesInput),
      tags: parseArrayInput(tagsInput)
    };

    setLoading(true);

    try {
      const token = await getAuthToken();
      const url = `/.netlify/functions/admin-content`;
      
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing 
        ? { id, ...finalFormData }
        : finalFormData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast.success(isEditing ? 'Content updated successfully' : 'Content created successfully');
        // Navigate immediately without waiting
        setTimeout(() => navigate('/dashboard/manage'), 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Server error: ${response.status} ${response.statusText}`;
        console.error('Server response error:', errorData);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(error.message || 'Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  if (contentLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="section-spacing">
      {/* Header with Action Buttons */}
      <div className="page-header">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="page-title">
              {isEditing ? 'Edit Content' : 'Create New Content'}
            </h1>
          </div>
        </div>
        
        {/* Action Buttons at Top */}
        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/dashboard/manage')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="content-form"
            disabled={loading}
            className="btn-primary"
          >
            <Save className="h-5 w-5 mr-3" />
            {loading ? 'Saving...' : (isEditing ? 'Update Content' : 'Create Content')}
          </button>
        </div>
      </div>

      <form id="content-form" onSubmit={handleSubmit}>
        {/* Two Column Layout for Wide Screens */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10">
          
          {/* Left Column - Main Content (2/3 width on xl screens) */}
          <div className="xl:col-span-2 space-y-8">
            {/* Content Details */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Content Details</h2>
              </div>
              <div className="card-content space-y-6">
                <div className="grid-responsive-2">
                  <InputField
                    label="Title"
                    name="title"
                    required
                    placeholder="Enter content title"
                    value={formData.title}
                    onChange={handleInputChange}
                    error={errors.title}
                  />

                  <InputField
                    label="Slug"
                    name="slug"
                    required
                    placeholder="url-friendly-slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    error={errors.slug}
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-foreground mb-4">
                    Content <span className="text-destructive">*</span>
                  </label>
                  <SimpleMDE
                    value={formData.content}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, content: value }));
                      if (errors.content) {
                        setErrors(prev => ({ ...prev, content: '' }));
                      }
                    }}
                    options={simpleMDEOptions}
                  />
                  {errors.content && (
                    <p className="mt-2 text-sm text-destructive">{errors.content}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Featured Image</h3>
              </div>
              <div className="card-content space-y-6">
                {/* Image Preview */}
                {formData.featuredImageUrl ? (
                  <div className="relative border border-border rounded-lg overflow-hidden bg-muted">
                    <div className="flex justify-center items-center h-48 w-full">
                      <img
                        src={formData.featuredImageUrl}
                        alt="Featured Preview"
                        className="object-contain max-h-full max-w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-base">No featured image selected</p>
                  </div>
                )}

                {/* Gallery Selection Button */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => setGalleryModal({ isOpen: true })}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ImageIcon className="h-5 w-5 mr-3" />
                    Select from Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadModal({ isOpen: true })}
                    className="btn-secondary inline-flex items-center"
                  >
                    <Upload className="h-5 w-5 mr-3" />
                    Upload New Image
                  </button>
                </div>
                
                {/* Alternative URL Input */}
                <div className="border-t border-border pt-6">
                  <h4 className="text-base font-medium text-foreground mb-4">Or enter image URL</h4>
                  <InputField
                    label=""
                    name="featuredImageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.featuredImageUrl}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Settings (1/3 width on xl screens) */}
          <div className="space-y-8">
            {/* Publish Settings */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Publish Settings</h3>
              </div>
              <div className="card-content space-y-6">
                <div>
                  <label className="block text-base font-medium text-foreground mb-4">
                    Status
                  </label>
                  <select
                    name="status"
                    className="input-field"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <InputField
                  label="Author"
                  name="author"
                  placeholder="Author name"
                  value={formData.author}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* SEO Settings */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">SEO Settings</h3>
              </div>
              <div className="card-content space-y-6">
                <InputField
                  label="SEO Title"
                  name="seoTitle"
                  placeholder="SEO optimized title"
                  value={formData.seoTitle}
                  onChange={handleInputChange}
                />

                <div>
                  <label className="block text-base font-medium text-foreground mb-4">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    onBlur={handleKeywordsBlur}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-foreground mb-4">
                    Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    rows={4}
                    className="input-field resize-none"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    placeholder="Brief description for search engines (150-160 characters recommended)"
                  />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Organization</h3>
              </div>
              <div className="card-content space-y-6">
                <div>
                  <label className="block text-base font-medium text-foreground mb-4">
                    Categories (comma separated)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={categoriesInput}
                    onChange={(e) => setCategoriesInput(e.target.value)}
                    onBlur={handleCategoriesBlur}
                    placeholder="Web Development, Technology"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-foreground mb-4">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onBlur={handleTagsBlur}
                    placeholder="react, javascript, tutorial"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={galleryModal.isOpen}
        onClose={() => setGalleryModal({ isOpen: false })}
        onSelectImage={handleImageSelect}
        title="Select Featured Image"
      />

      {/* Image Upload Modal */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false })}
        title="Upload & Optimize Featured Image"
        size="xl"
      >
        <ImageUploader
          onUploadSuccess={(uploadResult) => {
            setFormData(prev => ({
              ...prev,
              featuredImageUrl: uploadResult.downloadURL
            }));
            setUploadModal({ isOpen: false });
            toast.success('Featured image uploaded successfully');
          }}
          onUploadError={(error) => {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
          }}
          maxFileSize={10 * 1024 * 1024} // 10MB
          initialQuality={80}
          initialMaxWidth={1920}
          initialMaxHeight={1080}
        />
      </Modal>
    </div>
  );
}
