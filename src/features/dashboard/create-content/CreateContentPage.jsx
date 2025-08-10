import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContentById, useContent } from '@/hooks/useContent';
import { useAutoSave } from '@/hooks/useAutoSave';
import SimpleMDE from 'react-simplemde-editor';
import InputField from '@/components/shared/InputField';
import AutoSaveIndicator from '@/components/shared/AutoSaveIndicator';
import ImageGalleryModal from '@/components/shared/ImageGalleryModal';
import ImageUploader from '@/components/shared/ImageUploader';
import Modal from '@/components/shared/Modal';
import UploadDiagnostics from '@/components/shared/UploadDiagnostics';
import ImageDisplayDiagnostics from '@/components/shared/ImageDisplayDiagnostics';
import { FormSkeleton } from '@/components/shared/SkeletonLoader';
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
  const { invalidateCache, refetch } = useContent(activeBlogId);

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save functionality
  const autoSaveFunction = async (dataToSave) => {
    if (!isEditing || !id) return; // Only auto-save for existing content
    
    const token = await getAuthToken();
    const response = await fetch(`/.netlify/functions/admin-content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        id, 
        blogId: activeBlogId,
        ...dataToSave,
        keywords: parseArrayInput(keywordsInput),
        categories: parseArrayInput(categoriesInput),
        tags: parseArrayInput(tagsInput)
      })
    });

    if (!response.ok) {
      throw new Error('Auto-save failed');
    }
    
    // Invalidate cache after successful auto-save
    if (invalidateCache) {
      invalidateCache();
    }
  };

  const { autoSaveStatus, lastSaved, forceSave, retryCount } = useAutoSave(
    hasUnsavedChanges ? formData : null,
    autoSaveFunction,
    {
      delay: 3000, // 3 second delay for auto-save
      enabled: isEditing, // Only enable for editing existing content
      showNotifications: false // We'll show our own indicator
    }
  );

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

  // Track unsaved changes
  useEffect(() => {
    if (isEditing && existingContent) {
      const hasChanges = 
        formData.title !== (existingContent.title || '') ||
        formData.slug !== (existingContent.slug || '') ||
        formData.content !== (existingContent.content || '') ||
        formData.featuredImageUrl !== (existingContent.featuredImageUrl || '') ||
        formData.metaDescription !== (existingContent.metaDescription || '') ||
        formData.seoTitle !== (existingContent.seoTitle || '') ||
        formData.author !== (existingContent.author || '') ||
        formData.status !== (existingContent.status || 'draft') ||
        keywordsInput !== ((existingContent.keywords || []).join(', ')) ||
        categoriesInput !== ((existingContent.categories || []).join(', ')) ||
        tagsInput !== ((existingContent.tags || []).join(', '));
      
      setHasUnsavedChanges(hasChanges);
    } else if (!isEditing) {
      // For new content, consider it changed if any field has content
      const hasContent = 
        formData.title.trim() ||
        formData.content.trim() ||
        formData.featuredImageUrl ||
        keywordsInput.trim() ||
        categoriesInput.trim() ||
        tagsInput.trim();
      
      setHasUnsavedChanges(hasContent);
    }
  }, [formData, keywordsInput, categoriesInput, tagsInput, isEditing, existingContent]);

  const validateForm = () => {
    const newErrors = {};
    
    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    } else if (!/^[a-zA-Z0-9\s\-_.,!?()&:;'"]+$/.test(formData.title.trim())) {
      newErrors.title = 'Title contains invalid characters';
    }
    
    // Slug validation
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (formData.slug.trim().length < 3) {
      newErrors.slug = 'Slug must be at least 3 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Slug must be less than 100 characters';
    } else if (formData.slug.startsWith('-') || formData.slug.endsWith('-')) {
      newErrors.slug = 'Slug cannot start or end with a hyphen';
    } else if (formData.slug.includes('--')) {
      newErrors.slug = 'Slug cannot contain consecutive hyphens';
    }
    
    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    } else if (formData.content.length > 50000) {
      newErrors.content = 'Content must be less than 50,000 characters';
    }

    // Meta description validation
    if (formData.metaDescription && formData.metaDescription.length > 160) {
      newErrors.metaDescription = 'Meta description should be less than 160 characters';
    } else if (formData.metaDescription && formData.metaDescription.length > 0 && formData.metaDescription.length < 50) {
      newErrors.metaDescription = 'Meta description should be at least 50 characters for better SEO';
    }

    // SEO title validation
    if (formData.seoTitle && formData.seoTitle.length > 60) {
      newErrors.seoTitle = 'SEO title should be less than 60 characters';
    } else if (formData.seoTitle && formData.seoTitle.length > 0 && formData.seoTitle.length < 10) {
      newErrors.seoTitle = 'SEO title should be at least 10 characters';
    }

    // Author validation
    if (formData.author && formData.author.length > 100) {
      newErrors.author = 'Author name must be less than 100 characters';
    } else if (formData.author && formData.author.length > 0 && !/^[a-zA-Z\s\-'\.]+$/.test(formData.author)) {
      newErrors.author = 'Author name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }

    // Featured image URL validation
    if (formData.featuredImageUrl && formData.featuredImageUrl.length > 0) {
      try {
        new URL(formData.featuredImageUrl);
      } catch {
        newErrors.featuredImageUrl = 'Please enter a valid image URL';
      }
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

  const handleUploadSuccess = (uploadResult) => {
    setUploadModal({ isOpen: false });
    
    // Update featured image URL and verify it's accessible
    const newImageUrl = uploadResult.downloadURL;
    setFormData(prev => ({
      ...prev,
      featuredImageUrl: newImageUrl
    }));
    
    // Test image accessibility immediately
    const testImg = new Image();
    testImg.onload = () => {
      console.log('Uploaded image verified accessible:', newImageUrl);
      toast.success(`Image uploaded and verified: ${uploadResult.fileName}`);
    };
    testImg.onerror = () => {
      console.error('Uploaded image not accessible:', newImageUrl);
      toast.warning('Image uploaded but may not display correctly. Check diagnostics.');
    };
    testImg.src = newImageUrl;
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Ensure array fields are updated with current input values before submitting
    const finalFormData = {
      ...formData,
      blogId: isEditing ? existingContent?.blogId || activeBlogId : activeBlogId,
      featuredImageUrl: formData.featuredImageUrl || '',
      keywords: parseArrayInput(keywordsInput),
      categories: parseArrayInput(categoriesInput),
      tags: parseArrayInput(tagsInput)
    };

    // Use real-time operations for smooth experience
    try {
      setLoading(true);
      
      const token = await getAuthToken();
      const url = `/.netlify/functions/admin-content`;
      
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing 
        ? { id, blogId: finalFormData.blogId, ...finalFormData }
        : finalFormData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      toast.success(isEditing ? 'Content updated successfully' : 'Content created successfully');
      
      // Invalidate cache and refresh data to ensure UI synchronization
      if (invalidateCache) {
        invalidateCache();
      }
      if (refetch) {
        refetch();
      }
      
      // Navigate with smooth transition
      setTimeout(() => navigate('/dashboard/manage'), 500);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(error.message || 'Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  if (contentLoading && isEditing) {
    return (
      <FormSkeleton sections={2} fieldsPerSection={3} />
    );
  }

  return (
    <div className="section-spacing">
      {/* Header with Action Buttons */}
      <div className="page-header mb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <h1 className="page-title">
              {isEditing ? 'Edit Content' : 'Create New Content'}
            </h1>
            {/* Auto-save indicator for editing */}
            {isEditing && (
              <div className="mt-6">
                <AutoSaveIndicator 
                  status={autoSaveStatus}
                  lastSaved={lastSaved}
                  showRetryButton={autoSaveStatus === 'error'}
                  onRetry={forceSave}
                  retryCount={retryCount}
                  isOnline={navigator.onLine}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons at Top */}
        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-6 pt-8 border-t border-border">
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 lg:gap-12">
          
          {/* Left Column - Main Content (2/3 width on xl screens) */}
          <div className="xl:col-span-2 space-y-10">
            {/* Content Details */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Content Details</h2>
              </div>
              <div className="card-content space-y-8">
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
                  <label className="block text-base font-medium text-foreground mb-3">
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
                    <p className="mt-3 text-sm text-destructive">{errors.content}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Featured Image</h3>
              </div>
              <div className="card-content space-y-8">
                {/* Image Preview */}
                {formData.featuredImageUrl ? (
                  <div className="relative border border-border rounded-xl overflow-hidden bg-muted">
                    <div className="flex justify-center items-center h-64 w-full">
                      <img
                        src={formData.featuredImageUrl}
                        alt="Featured Preview"
                        className="object-contain max-h-full max-w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl text-center bg-muted/20">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-base">No featured image selected</p>
                  </div>
                )}

                {/* Gallery Selection Button */}
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
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
                <div className="border-t border-border pt-8">
                  <h4 className="text-base font-medium text-foreground mb-3">Or enter image URL</h4>
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
          <div className="space-y-10">
            {/* Publish Settings */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Publish Settings</h3>
              </div>
              <div className="card-content space-y-8">
                <div>
                  <label className="block text-base font-medium text-foreground mb-3">
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
              <div className="card-content space-y-8">
                <InputField
                  label="SEO Title"
                  name="seoTitle"
                  placeholder="SEO optimized title"
                  value={formData.seoTitle}
                  onChange={handleInputChange}
                />

                <div>
                  <label className="block text-base font-medium text-foreground mb-3">
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
                  <label className="block text-base font-medium text-foreground mb-3">
                    Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    rows={5}
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
              <div className="card-content space-y-8">
                <div>
                  <label className="block text-base font-medium text-foreground mb-3">
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
                  <label className="block text-base font-medium text-foreground mb-3">
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
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          maxFileSize={10 * 1024 * 1024} // 10MB
          initialQuality={80}
          initialMaxWidth={1920}
          initialMaxHeight={1080}
        />
      </Modal>
    </div>
  );
}
