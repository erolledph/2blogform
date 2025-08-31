import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContentById, useContent } from '@/hooks/useContent';
import { useAutoSave } from '@/hooks/useAutoSave';
import { validateField, validateArray } from '@/utils/validation';
import SimpleMDE from 'react-simplemde-editor';
import InputField from '@/components/shared/InputField';
import AutoSaveIndicator from '@/components/shared/AutoSaveIndicator';
import ImageGalleryModal from '@/components/shared/ImageGalleryModal';
import ImageUploader from '@/components/shared/ImageUploader';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { Save, ArrowLeft, Image as ImageIcon, Trash2, Upload, Info } from 'lucide-react';
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
  const [showInfoModal, setShowInfoModal] = useState(false);
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
    
    // Title validation using centralized rules
    const titleError = validateField('title', formData.title);
    if (titleError) newErrors.title = titleError;
    
    // Slug validation using centralized rules
    const slugError = validateField('slug', formData.slug);
    if (slugError) newErrors.slug = slugError;
    
    // Content validation using centralized rules
    const contentError = validateField('content', formData.content);
    if (contentError) newErrors.content = contentError;

    // Meta description validation using centralized rules
    const metaDescError = validateField('metaDescription', formData.metaDescription);
    if (metaDescError) newErrors.metaDescription = metaDescError;

    // SEO title validation using centralized rules
    const seoTitleError = validateField('seoTitle', formData.seoTitle);
    if (seoTitleError) newErrors.seoTitle = seoTitleError;

    // Author validation using centralized rules
    const authorError = validateField('author', formData.author);
    if (authorError) newErrors.author = authorError;

    // Featured image URL validation using centralized rules
    const imageUrlError = validateField('url', formData.featuredImageUrl);
    if (imageUrlError) newErrors.featuredImageUrl = imageUrlError;
    
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
      <div className="section-spacing">
        <div className="space-y-8">
          <SkeletonLoader lines={2} height="xl" />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2 space-y-8">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
            <div className="space-y-8">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      {/* Header with Action Buttons */}
      <div className="page-header mb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="page-title">
                {isEditing ? 'Edit Content' : 'Create New Content'}
              </h1>
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted/50"
                title="Field Guide & Validation Rules"
              >
                <Info className="h-6 w-6" />
              </button>
            </div>
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

      {/* Information Modal */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Content Creation Guide"
        size="xl"
      >
        <div className="space-y-8">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📝 Content Creation Guide</h3>
            <p className="text-sm text-blue-700">
              This guide explains how to fill out each field and the validation rules that apply.
            </p>
          </div>

          <div className="space-y-6">
            {/* Content Details Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Content Details</h4>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Title *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - must not be empty</li>
                    <li>• Minimum 3 characters, maximum 200 characters</li>
                    <li>• Can contain letters, numbers, spaces, and common punctuation</li>
                    <li>• Used to generate the URL slug automatically</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Slug *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - auto-generated from title</li>
                    <li>• Maximum 100 characters</li>
                    <li>• Only lowercase letters, numbers, and hyphens allowed</li>
                    <li>• Cannot start or end with hyphens</li>
                    <li>• Cannot contain consecutive hyphens</li>
                    <li>• Must be unique across all your content</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Content *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - main article content</li>
                    <li>• Minimum 10 characters, maximum 50,000 characters</li>
                    <li>• Written in Markdown format</li>
                    <li>• Use the preview tab to see how it will look</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SEO Settings Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">SEO Settings</h4>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">SEO Title</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Optional field for search engine optimization</li>
                    <li>• Maximum 160 characters (recommended: 50-60 for best results)</li>
                    <li>• Should include your main keyword</li>
                    <li>• Will appear as the clickable title in search results</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Keywords</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Comma-separated list of keywords</li>
                    <li>• Example: "react, javascript, tutorial, web development"</li>
                    <li>• Used for SEO and content organization</li>
                    <li>• Focus on 3-5 main keywords</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Meta Description</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Optional but highly recommended for SEO</li>
                    <li>• Maximum 160 characters (recommended: 150-160)</li>
                    <li>• Minimum 50 characters for better SEO</li>
                    <li>• Brief summary that appears in search results</li>
                    <li>• Should entice users to click on your content</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Organization Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Organization</h4>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Categories</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Comma-separated list of categories</li>
                    <li>• Example: "Web Development, Technology, Tutorials"</li>
                    <li>• Used for content organization and filtering</li>
                    <li>• Keep categories broad and consistent</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Tags</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Comma-separated list of tags</li>
                    <li>• Example: "react, hooks, javascript, frontend"</li>
                    <li>• More specific than categories</li>
                    <li>• Used for detailed content filtering</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Author</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Optional field for author name</li>
                    <li>• Maximum 100 characters</li>
                    <li>• Only letters, spaces, hyphens, apostrophes, and periods</li>
                    <li>• Example: "John Smith" or "Jane Doe-Wilson"</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Featured Image Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Featured Image</h4>
              <div className="p-4 border border-border rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Image Guidelines</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Optional but recommended for better engagement</li>
                  <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• Recommended dimensions: 1200x630px for social sharing</li>
                  <li>• Images are automatically optimized and compressed</li>
                  <li>• Use descriptive alt text for accessibility</li>
                </ul>
              </div>
            </div>

            {/* Status Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Publishing</h4>
              <div className="p-4 border border-border rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Status Options</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Draft:</strong> Content is saved but not publicly visible</li>
                  <li>• <strong>Published:</strong> Content is live and accessible via API</li>
                  <li>• Only published content appears in your public API endpoints</li>
                  <li>• You can change status anytime after creation</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={() => setShowInfoModal(false)}
              className="btn-primary"
            >
              Got it!
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
