import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settingsService';
import { productsService } from '@/services/productsService';
import SimpleMDE from 'react-simplemde-editor';
import InputField from '@/components/shared/InputField';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ImageGalleryModal from '@/components/shared/ImageGalleryModal';
import ImageUploader from '@/components/shared/ImageUploader';
import Modal from '@/components/shared/Modal';
import { Save, ArrowLeft, DollarSign, Percent, Image as ImageIcon, Trash2, Plus, Upload } from 'lucide-react';
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

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [galleryModal, setGalleryModal] = useState({ isOpen: false });
  const [uploadModal, setUploadModal] = useState({ isOpen: false });

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
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to fetch product');
      navigate('/dashboard/manage-products');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length > 200) {
      newErrors.name = 'Product name must be less than 200 characters';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Slug must be less than 100 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 10000) {
      newErrors.description = 'Description must be less than 10,000 characters';
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    } else if (parseFloat(formData.price) > 999999.99) {
      newErrors.price = 'Price cannot exceed $999,999.99';
    }

    if (formData.percentOff && (isNaN(parseFloat(formData.percentOff)) || parseFloat(formData.percentOff) < 0 || parseFloat(formData.percentOff) > 100)) {
      newErrors.percentOff = 'Percent off must be between 0 and 100';
    }

    if (formData.category && formData.category.length > 100) {
      newErrors.category = 'Category must be less than 100 characters';
    }

    if (formData.productUrl && formData.productUrl.length > 500) {
      newErrors.productUrl = 'Product URL must be less than 500 characters';
    }

    if (formData.imageUrls && formData.imageUrls.length > 5) {
      newErrors.imageUrls = 'Maximum 5 images allowed per product';
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

    setLoading(true);

    try {
      const token = await getAuthToken();
      const url = `/api/admin/product`;
      
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
        toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
        // Navigate immediately without waiting
        setTimeout(() => navigate('/dashboard/manage-products'), 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const discountedPrice = calculateDiscountedPrice();
  const savings = parseFloat(formData.price) - discountedPrice;

  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="page-title">
              {isEditing ? 'Edit Product' : 'Create New Product'}
            </h1>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-border">
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10">
          
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Product Details */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Product Details</h2>
              </div>
              <div className="card-content space-y-6">
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
                  <label className="block text-base font-medium text-foreground mb-4">
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
                    <p className="mt-2 text-sm text-destructive">{errors.description}</p>
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
              <div className="card-content space-y-6">
                {/* Image Grid */}
                {formData.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {formData.imageUrls.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-border shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                            Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Images Button */}
                {formData.imageUrls.length < 5 && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                <div className="border-t border-border pt-6">
                  <h4 className="text-base font-medium text-foreground mb-4">Or add image URL</h4>
                  <div className="flex gap-3">
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
          <div className="space-y-8">
            {/* Pricing */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Pricing</h3>
              </div>
              <div className="card-content space-y-6">
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
                  <label className="block text-base font-medium text-foreground mb-4">
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

      {/* Image Upload Modal */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false })}
        title="Upload & Optimize Product Image"
        size="xl"
      >
        <ImageUploader
          onUploadSuccess={(uploadResult) => {
            if (formData.imageUrls.length < 5) {
              setFormData(prev => ({
                ...prev,
                imageUrls: [...prev.imageUrls, uploadResult.downloadURL]
              }));
              setUploadModal({ isOpen: false });
              toast.success(`Product image uploaded successfully (${formData.imageUrls.length + 1}/5)`);
            } else {
              toast.error('Maximum of 5 images allowed per product');
            }
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
