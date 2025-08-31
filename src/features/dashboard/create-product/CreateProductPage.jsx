import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSave } from '@/hooks/useAutoSave';
import { settingsService } from '@/services/settingsService';
import { productsService } from '@/services/productsService';
import { validateField, validateImageUrls } from '@/utils/validation';
import SimpleMDE from 'react-simplemde-editor';
import InputField from '@/components/shared/InputField';
import AutoSaveIndicator from '@/components/shared/AutoSaveIndicator';
import ImageGalleryModal from '@/components/shared/ImageGalleryModal';
import ImageUploader from '@/components/shared/ImageUploader';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { Save, ArrowLeft, DollarSign, Percent, Image as ImageIcon, Trash2, Plus, Upload, Info } from 'lucide-react';
import { generateSlug, parseArrayInput } from '@/utils/helpers';
import toast from 'react-hot-toast';
import 'easymde/dist/easymde.min.css';

export default function CreateProductPage({ activeBlogId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthToken, currentUser } = useAuth();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    percentOff: '',
    imageUrls: [], // Changed to array for multiple images
    productUrl: '',
    category: '',
    tags: [],
    status: 'draft'
  });

  // Separate state for array input fields
  const [tagsInput, setTagsInput] = useState('');
  const [userCurrency, setUserCurrency] = useState('$');
  const [existingContent, setExistingContent] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [galleryModal, setGalleryModal] = useState({ isOpen: false });
  const [uploadModal, setUploadModal] = useState({ isOpen: false });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save functionality for editing
  const autoSaveFunction = async (dataToSave) => {
    if (!isEditing || !id) return;
    
    const token = await getAuthToken();
    const response = await fetch(`/.netlify/functions/admin-product`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        id, 
        blogId: activeBlogId,
        ...dataToSave,
        price: parseFloat(dataToSave.price) || 0,
        percentOff: parseFloat(dataToSave.percentOff) || 0,
        tags: parseArrayInput(tagsInput)
      })
    });

    if (!response.ok) {
      throw new Error('Auto-save failed');
    }
  };

  const { autoSaveStatus, lastSaved, forceSave, retryCount } = useAutoSave(
    hasUnsavedChanges ? formData : null,
    autoSaveFunction,
    {
      delay: 3000,
      enabled: isEditing,
      showNotifications: false
    }
  );

  // Update product images in database immediately after upload
  const updateProductImagesInDatabase = async (newImageUrls, uploadResult) => {
    if (!isEditing || !id) return;
    
    try {
      await productsService.updateProductImages(
        currentUser.uid,
        id,
        activeBlogId,
        newImageUrls,
        {
          lastUpload: uploadResult.fileName,
          uploadedAt: new Date().toISOString()
        }
      );
      console.log('Product images updated in database:', newImageUrls);
    } catch (error) {
      console.error('Failed to update product images in database:', error);
      toast.warning('Image uploaded but database update failed. Save the product to persist changes.');
    }
  };

  // Memoize SimpleMDE options
  const simpleMDEOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: 'Write your product description in Markdown...',
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', '|',
      'guide'
    ]
  }), []);

  useEffect(() => {
    fetchUserSettings();
    if (isEditing) {
      fetchProduct();
    }
  }, [id, isEditing, currentUser]);

  const fetchUserSettings = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const settings = await settingsService.getUserSettings(currentUser.uid);
      setUserCurrency(settings.currency || '$');
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Keep default currency on error
    }
  };

  const fetchProduct = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const data = await productsService.fetchProductById(currentUser.uid, id, activeBlogId);
      
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        price: data.price?.toString() || '',
        percentOff: data.percentOff?.toString() || '',
        imageUrls: data.imageUrls || data.imageUrl ? [data.imageUrl] : [], // Handle both old and new format
        productUrl: data.productUrl || '',
        category: data.category || '',
        tags: data.tags || [],
        status: data.status || 'draft'
      });

      setTagsInput((data.tags || []).join(', '));
      setExistingContent(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to fetch product');
      navigate('/dashboard/manage-products');
    } finally {
      setLoading(false);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    if (isEditing && existingContent) {
      const hasChanges = 
        formData.name !== (existingContent.name || '') ||
        formData.slug !== (existingContent.slug || '') ||
        formData.description !== (existingContent.description || '') ||
        formData.price !== (existingContent.price?.toString() || '') ||
        formData.percentOff !== (existingContent.percentOff?.toString() || '') ||
        JSON.stringify(formData.imageUrls) !== JSON.stringify(existingContent.imageUrls || []) ||
        formData.productUrl !== (existingContent.productUrl || '') ||
        formData.category !== (existingContent.category || '') ||
        formData.status !== (existingContent.status || 'draft') ||
        tagsInput !== ((existingContent.tags || []).join(', '));
      
      setHasUnsavedChanges(hasChanges);
    } else if (!isEditing) {
      const hasContent = 
        formData.name.trim() ||
        formData.description.trim() ||
        formData.price ||
        formData.imageUrls.length > 0 ||
        tagsInput.trim();
      
      setHasUnsavedChanges(hasContent);
    }
  }, [formData, tagsInput, isEditing, existingContent]);

  const validateForm = () => {
    const newErrors = {};
    
    // Product name validation using centralized rules
    const nameError = validateField('productName', formData.name);
    if (nameError) newErrors.name = nameError;
    
    // Slug validation using centralized rules
    const slugError = validateField('slug', formData.slug);
    if (slugError) newErrors.slug = slugError;
    
    // Description validation using centralized rules
    const descriptionError = validateField('description', formData.description);
    if (descriptionError) newErrors.description = descriptionError;

    // Price validation using centralized rules
    const priceError = validateField('price', formData.price);
    if (priceError) newErrors.price = priceError;

    // Percent off validation using centralized rules
    const percentOffError = validateField('percentOff', formData.percentOff);
    if (percentOffError) newErrors.percentOff = percentOffError;

    // Category validation using centralized rules
    const categoryError = validateField('category', formData.category);
    if (categoryError) newErrors.category = categoryError;

    // Product URL validation using centralized rules
    const productUrlError = validateField('url', formData.productUrl, ['format']);
    if (productUrlError) newErrors.productUrl = productUrlError;
    
    const productUrlLengthError = validateField('url', formData.productUrl, ['length']);
    if (productUrlLengthError) newErrors.productUrl = productUrlLengthError;

    // Image URLs validation using centralized rules
    const imageUrlsError = validateImageUrls(formData.imageUrls);
    if (imageUrlsError) newErrors.imageUrls = imageUrlsError;
    
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
    
    // Handle name and slug updates
    if (name === 'name' && !isEditing) {
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

  const handleTagsBlur = () => {
    const tagsArray = parseArrayInput(tagsInput);
    setFormData(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  const handleImageSelect = (images) => {
    // Handle both single and multiple image selection
    const imageArray = Array.isArray(images) ? images : [images];
    const imageUrls = imageArray.map(img => img.downloadURL);
    
    setFormData(prev => ({
      ...prev,
      imageUrls: [...prev.imageUrls, ...imageUrls].slice(0, 5) // Limit to 5 images
    }));
    
    toast.success(`${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''} selected`);
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const calculateDiscountedPrice = () => {
    const price = parseFloat(formData.price) || 0;
    const percentOff = parseFloat(formData.percentOff) || 0;
    if (percentOff > 0) {
      return price - (price * (percentOff / 100));
    }
    return price;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const finalFormData = {
      ...formData,
      blogId: activeBlogId,
      price: parseFloat(formData.price),
      percentOff: parseFloat(formData.percentOff) || 0,
      tags: parseArrayInput(tagsInput)
    };

    try {
      setLoading(true);
      
      const token = await getAuthToken();
      const url = `/.netlify/functions/admin-product`;
      
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
      
      setTimeout(() => navigate('/dashboard/manage-products'), 500);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
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

  const discountedPrice = calculateDiscountedPrice();
  const savings = parseFloat(formData.price) - discountedPrice;

  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header mb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="page-title">
                {isEditing ? 'Edit Product' : 'Create New Product'}
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
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-6 pt-8 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/dashboard/manage-products')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="btn-primary"
          >
            <Save className="h-5 w-5 mr-3" />
            {loading ? 'Saving...' : (isEditing ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 lg:gap-12">
          
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2 space-y-10">
            {/* Product Details */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Product Details</h2>
              </div>
              <div className="card-content space-y-8">
                <div className="grid-responsive-2">
                  <InputField
                    label="Product Name"
                    name="name"
                    required
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={errors.name}
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
                    Description <span className="text-destructive">*</span>
                  </label>
                  <SimpleMDE
                    value={formData.description}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, description: value }));
                      if (errors.description) {
                        setErrors(prev => ({ ...prev, description: '' }));
                      }
                    }}
                    options={simpleMDEOptions}
                  />
                  {errors.description && (
                    <p className="mt-3 text-sm text-destructive">{errors.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Images */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Product Images</h3>
                <p className="card-description">Add up to 5 product images</p>
              </div>
              <div className="card-content space-y-8">
                {/* Image Grid */}
                {formData.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {formData.imageUrls.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border border-border shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs rounded">
                            Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Images Button */}
                {formData.imageUrls.length < 5 && (
                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <button
                      type="button"
                      onClick={() => setGalleryModal({ isOpen: true })}
                      className="btn-secondary inline-flex items-center"
                    >
                      <Plus className="h-5 w-5 mr-3" />
                      Add Images ({formData.imageUrls.length}/5)
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
                )}
                
                {/* Image URL Input as Alternative */}
                <div className="border-t border-border pt-8">
                  <h4 className="text-base font-medium text-foreground mb-3">Or add image URL</h4>
                  <div className="flex gap-4">
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="input-field flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const url = e.target.value.trim();
                          if (url && formData.imageUrls.length < 5) {
                            setFormData(prev => ({
                              ...prev,
                              imageUrls: [...prev.imageUrls, url]
                            }));
                            e.target.value = '';
                            toast.success('Image URL added');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        const url = input.value.trim();
                        if (url && formData.imageUrls.length < 5) {
                          setFormData(prev => ({
                            ...prev,
                            imageUrls: [...prev.imageUrls, url]
                          }));
                          input.value = '';
                          toast.success('Image URL added');
                        }
                      }}
                      className="btn-secondary"
                      disabled={formData.imageUrls.length >= 5}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-10">
            {/* Pricing */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pricing</h3>
              </div>
              <div className="card-content space-y-8">
                <InputField
                  label="Price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={formData.price}
                  onChange={handleInputChange}
                  error={errors.price}
                  currencySymbol={userCurrency}
                />

                <InputField
                  label="Percent Off"
                  name="percentOff"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.percentOff}
                  onChange={handleInputChange}
                  error={errors.percentOff}
                  icon={Percent}
                />

              </div>
            </div>

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
                  label="Category"
                  name="category"
                  placeholder="e.g., Electronics, Clothing, Books"
                  value={formData.category}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Organization */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Organization</h3>
              </div>
              <div className="card-content">
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
                    placeholder="electronics, gadget, popular"
                  />
                </div>
              </div>
            </div>

            {/* External Link */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">External Link</h3>
              </div>
              <div className="card-content">
                <InputField
                  label="Product URL"
                  name="productUrl"
                  type="url"
                  placeholder="https://example.com/product-page"
                  value={formData.productUrl}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={galleryModal.isOpen}
        onClose={() => setGalleryModal({ isOpen: false })}
        onSelectMultiple={handleImageSelect}
        multiSelect={true}
        maxSelections={5 - formData.imageUrls.length}
        title="Select Product Images"
      />

      <Modal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false })}
        title="Upload Product Image"
        size="xl"
      >
        <ImageUploader
          onUploadSuccess={(uploadResult) => {
            if (formData.imageUrls.length < 5) {
              const newImageUrls = [...formData.imageUrls, uploadResult.downloadURL];
              setFormData(prev => ({
                ...prev,
                imageUrls: newImageUrls
              }));
              
              // If editing existing product, immediately update the database
              if (isEditing && id) {
                updateProductImagesInDatabase(newImageUrls, uploadResult);
              }
              
              setUploadModal({ isOpen: false });
              
              // Test image accessibility
              const testImg = new Image();
              testImg.onload = () => {
                toast.success(`Product image uploaded and verified: ${uploadResult.fileName} (${formData.imageUrls.length + 1}/5)`);
              };
              testImg.onerror = () => {
                toast.warning(`Image uploaded but may not display: ${uploadResult.fileName}`);
              };
              testImg.src = uploadResult.downloadURL;
            } else {
              toast.error('Maximum of 5 images allowed per product');
            }
          }}
          onUploadError={(error) => {
            console.error('Upload error:', error);
            toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
          }}
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
        title="Product Creation Guide"
        size="xl"
      >
        <div className="space-y-8">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-3">🛍️ Product Creation Guide</h3>
            <p className="text-sm text-green-700">
              This guide explains how to fill out each field and the validation rules that apply to product creation.
            </p>
          </div>

          <div className="space-y-6">
            {/* Product Details Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Product Details</h4>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Product Name *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - must not be empty</li>
                    <li>• Minimum 3 characters, maximum 200 characters</li>
                    <li>• Can contain letters, numbers, spaces, and common punctuation</li>
                    <li>• Used to generate the URL slug automatically</li>
                    <li>• Example: "Premium Wireless Headphones"</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Slug *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - auto-generated from product name</li>
                    <li>• Maximum 100 characters</li>
                    <li>• Only lowercase letters, numbers, and hyphens allowed</li>
                    <li>• Cannot start or end with hyphens</li>
                    <li>• Cannot contain consecutive hyphens</li>
                    <li>• Must be unique across all your products</li>
                    <li>• Example: "premium-wireless-headphones"</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Description *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - detailed product description</li>
                    <li>• Minimum 10 characters, maximum 10,000 characters</li>
                    <li>• Written in Markdown format</li>
                    <li>• Use the preview tab to see formatting</li>
                    <li>• Include features, specifications, and benefits</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Pricing</h4>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Price *</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required field</strong> - product price</li>
                    <li>• Must be a valid number greater than 0</li>
                    <li>• Maximum value: $999,999.99</li>
                    <li>• Can have up to 2 decimal places</li>
                    <li>• Currency symbol is set in your account settings</li>
                    <li>• Example: "199.99" (without currency symbol)</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Percent Off</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Optional discount percentage</li>
                    <li>• Must be between 0 and 100</li>
                    <li>• Can have up to 2 decimal places</li>
                    <li>• Automatically calculates discounted price</li>
                    <li>• Example: "15" for 15% off</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Product Images Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Product Images</h4>
              <div className="p-4 border border-border rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Image Guidelines</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Up to 5 images per product</li>
                  <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
                  <li>• Maximum file size: 10MB per image</li>
                  <li>• First image becomes the main product image</li>
                  <li>• Images are automatically optimized and compressed</li>
                  <li>• Recommended dimensions: 800x800px or larger</li>
                </ul>
              </div>
            </div>

            {/* Organization Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Organization</h4>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Category</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Optional field for product categorization</li>
                    <li>• Maximum 100 characters</li>
                    <li>• Can contain letters, numbers, spaces, hyphens, underscores, and ampersands</li>
                    <li>• Example: "Electronics", "Clothing & Accessories"</li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h5 className="font-medium text-foreground mb-2">Tags</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Comma-separated list of tags</li>
                    <li>• Example: "wireless, bluetooth, premium, noise-cancelling"</li>
                    <li>• Used for detailed product filtering</li>
                    <li>• More specific than categories</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* External Link Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">External Link</h4>
              <div className="p-4 border border-border rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Product URL</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Optional external link to purchase or learn more</li>
                  <li>• Must be a valid URL starting with http:// or https://</li>
                  <li>• Maximum 500 characters</li>
                  <li>• Can be affiliate links, store pages, or product details</li>
                  <li>• Example: "https://example.com/products/wireless-headphones"</li>
                </ul>
              </div>
            </div>

            {/* Publishing Section */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Publishing</h4>
              <div className="p-4 border border-border rounded-lg">
                <h5 className="font-medium text-foreground mb-2">Status Options</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Draft:</strong> Product is saved but not publicly visible</li>
                  <li>• <strong>Published:</strong> Product is live and accessible via API</li>
                  <li>• Only published products appear in your public API endpoints</li>
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
