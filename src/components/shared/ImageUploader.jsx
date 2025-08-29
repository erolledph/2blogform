import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { storageService } from '@/services/storageService';
import { fromBlob } from 'image-resize-compress';
import InputField from './InputField';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { Upload, Image as ImageIcon, FileImage, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { firebaseErrorHandler } from '@/utils/firebaseErrorHandler';
import { formatBytes } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ImageUploader({ 
  onUploadSuccess, 
  onUploadError,
  currentPath = null, // Will be set to user-specific path if null
  className = '',
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  initialQuality = 80,
  initialMaxWidth = 1920,
  initialMaxHeight = 1080
}) {
  const { currentUser } = useAuth();
  const [userStoragePath, setUserStoragePath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 100 });
  const [checkingStorage, setCheckingStorage] = useState(false);

  // Set user-specific storage path
  useEffect(() => {
    if (currentUser?.uid) {
      const userPath = currentPath || `users/${currentUser.uid}/public_images`;
      setUserStoragePath(userPath);
    }
  }, [currentUser?.uid, currentPath]);

  // User-configurable optimization settings
  const [imageQuality, setImageQuality] = useState(initialQuality);
  const [imageMaxWidth, setImageMaxWidth] = useState(initialMaxWidth);
  const [imageMaxHeight, setImageMaxHeight] = useState(initialMaxHeight);
  const [outputFormat, setOutputFormat] = useState('webp');

  // Compression stats and confirmation modal
  const [originalFileSize, setOriginalFileSize] = useState(null);
  const [compressedFileSize, setCompressedFileSize] = useState(null);
  const [compressionStats, setCompressionStats] = useState(null);
  const [confirmUploadModal, setConfirmUploadModal] = useState(false);
  const [finalCompressedBlob, setFinalCompressedBlob] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (currentUser?.uid && storageService) {
      checkStorageUsage();
    }
  }, [currentUser?.uid]);

  const checkStorageUsage = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setCheckingStorage(true);
      const storageLimit = currentUser?.totalStorageMB || 100;
      
      // Get actual storage usage for this user
      const actualUsageBytes = await storageService.getUserTotalStorageUsage(currentUser.uid);
      const actualUsageMB = actualUsageBytes / (1024 * 1024);
      
      setStorageUsage({
        used: actualUsageMB,
        limit: storageLimit
      });
    } catch (error) {
      console.error('Error checking storage usage:', error);
    } finally {
      setCheckingStorage(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error(`Image size should be less than ${formatBytes(maxFileSize)}`);
      return;
    }

    // Check storage limits
    const estimatedCompressedSize = file.size * 0.8; // Conservative estimate
    const storageLimit = (currentUser?.totalStorageMB || 100) * 1024 * 1024; // Convert MB to bytes
    const currentUsageBytes = storageUsage.used * 1024 * 1024; // Convert MB to bytes
    
    if (currentUsageBytes + estimatedCompressedSize > storageLimit) {
      const limitMB = currentUser?.totalStorageMB || 100;
      const currentUsageMB = (currentUsageBytes / (1024 * 1024)).toFixed(1);
      toast.error(`Upload would exceed your storage limit of ${limitMB} MB. Current usage: ${currentUsageMB} MB. Contact an administrator to increase your storage.`);
      return;
    }
    setSelectedFile(file);
    setOriginalFileSize(file.size);
    
    // Generate default filename (remove extension and add timestamp)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    setNewFileName(`${nameWithoutExt}-${timestamp}`);

    // Detect image dimensions and create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Set the detected dimensions as the initial max width/height
        setImageMaxWidth(img.width);
        setImageMaxHeight(img.height);
        
        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const runCompressionPreview = async (file) => {
    try {
      setCompressing(true);

      // Compress image with current settings
      const compressedBlob = await fromBlob(
        file,
        imageQuality,
        imageMaxWidth,
        imageMaxHeight,
        outputFormat
      );

      // Validate compressed blob
      if (!compressedBlob) {
        throw new Error('Compression failed: No blob returned');
      }

      if (typeof compressedBlob.size !== 'number' || isNaN(compressedBlob.size) || compressedBlob.size < 0) {
        throw new Error('Compression failed: Invalid blob size');
      }

      const compressedSize = compressedBlob.size;
      const originalSize = file.size;
      
      // Validate original size to prevent division by zero
      if (!originalSize || originalSize <= 0) {
        throw new Error('Invalid original file size');
      }
      
      // Calculate compression ratio with proper validation
      let compressionRatio = 0;
      let sizeDifference = 0;
      
      if (originalSize > 0 && !isNaN(originalSize) && !isNaN(compressedSize)) {
        sizeDifference = originalSize - compressedSize;
        compressionRatio = Math.abs((sizeDifference / originalSize) * 100);
        
        // Ensure compressionRatio is a valid number
        if (isNaN(compressionRatio) || !isFinite(compressionRatio)) {
          compressionRatio = 0;
        }
      }
      
      setCompressedFileSize(compressedSize);
      setCompressionStats({
        originalSize,
        compressedSize,
        compressionRatio: compressionRatio.toFixed(1),
        sizeDifference,
        format: outputFormat,
        isLarger: compressedSize > originalSize
      });

    } catch (error) {
      console.error('Error in compression preview:', error);
      toast.error(`Failed to preview compression: ${error.message}`);
      
      // Reset compression stats on error
      setCompressedFileSize(null);
      setCompressionStats(null);
    } finally {
      setCompressing(false);
    }
  };

  // Re-run compression preview when settings change
  useEffect(() => {
    if (selectedFile && imageMaxWidth > 0 && imageMaxHeight > 0) {
      runCompressionPreview(selectedFile);
    }
  }, [selectedFile, imageQuality, imageMaxWidth, imageMaxHeight, outputFormat]);

  const handleInitiateUpload = async () => {
    if (!selectedFile || !newFileName.trim()) {
      toast.error('Please select a file and enter a filename');
      return;
    }

    // Final storage check with actual usage if storage service is available
    if (currentUser?.uid) {
      try {
        const uploadCheck = await storageService.canUserUploadFile(
          currentUser.uid,
          selectedFile.size,
          currentUser?.totalStorageMB || 100
        );
        
        if (!uploadCheck.canUpload) {
          const limitMB = currentUser?.totalStorageMB || 100;
          const currentUsageMB = (uploadCheck.currentUsage / (1024 * 1024)).toFixed(1);
          toast.error(`Upload would exceed your storage limit of ${limitMB} MB. Current usage: ${currentUsageMB} MB. Contact an administrator to increase your storage.`);
          return;
        }
      } catch (error) {
        console.warn('Storage check failed, proceeding with upload:', error);
      }
    }

    try {
      setCompressing(true);
      
      // Compress the image with current settings
      const compressedBlob = await fromBlob(
        selectedFile,
        imageQuality,
        imageMaxWidth,
        imageMaxHeight,
        outputFormat
      );
      
      setCompressing(false);

      // Check if compressed file is larger than original
      if (compressedBlob.size > selectedFile.size) {
        // Additional storage check for larger compressed files
        const storageLimit = (currentUser?.totalStorageMB || 100) * 1024 * 1024;
        const currentUsageBytes = storageUsage.used * 1024 * 1024;
        
        if (currentUsageBytes + compressedBlob.size > storageLimit) {
          toast.error(`Upload would exceed your storage limit of ${currentUser?.totalStorageMB || 100} MB. Try reducing quality or dimensions.`);
          setCompressing(false);
          return;
        }
        
        setFinalCompressedBlob(compressedBlob);
        setConfirmUploadModal(true);
      } else {
        await executeUpload(compressedBlob);
      }

    } catch (error) {
      console.error('Error during compression:', error);
      toast.error('Failed to compress image');
      setCompressing(false);
    }
  };

  const executeUpload = async (blobToUpload) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Pre-upload validation
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }
      
      if (!userStoragePath) {
        throw new Error('Storage path not configured');
      }
      
      // Validate file size against user limits
      const storageCheck = await storageService.canUserUploadFile(
        currentUser.uid,
        blobToUpload.size,
        currentUser?.totalStorageMB || 100
      );
      
      if (!storageCheck.canUpload) {
        throw new Error(`Upload would exceed storage limit: ${storageCheck.reason}`);
      }
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create storage path
      const fileName = `${newFileName.trim()}.${outputFormat}`;
      const fullPath = userStoragePath.endsWith('/') 
        ? `${userStoragePath}${fileName}` 
        : `${userStoragePath}/${fileName}`;
      
      // Validate the final path
      if (!fullPath.startsWith(`users/${currentUser.uid}/`)) {
        throw new Error('Invalid upload path - security violation');
      }
      
      console.log('Upload details:', {
        userId: currentUser.uid,
        fileName,
        fullPath,
        blobSize: blobToUpload.size,
        userStoragePath
      });
      
      const storageRef = ref(storage, fullPath);
      
      // Upload compressed image
      await uploadBytes(storageRef, blobToUpload, {
        contentType: `image/${outputFormat}`,
        customMetadata: {
          originalName: selectedFile.name,
          originalSize: selectedFile.size.toString(),
          compressedSize: blobToUpload.size.toString(),
          compressionRatio: compressionStats?.compressionRatio || '0',
          quality: imageQuality.toString(),
          maxWidth: imageMaxWidth.toString(),
          maxHeight: imageMaxHeight.toString(),
          uploadedBy: currentUser.uid,
          uploadedAt: new Date().toISOString()
        }
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('Upload completed successfully:', {
        fileName,
        fullPath,
        downloadURL,
        size: blobToUpload.size
      });
      
      // Verify the upload was successful by checking if file exists
      try {
        const metadata = await getMetadata(storageRef);
        console.log('Upload verification successful:', {
          fileName,
          size: metadata.size,
          contentType: metadata.contentType,
          downloadURL
        });
      } catch (verifyError) {
        console.error('Upload verification failed:', verifyError);
        throw new Error('Upload completed but verification failed');
      }
      
      toast.success('Image uploaded and optimized successfully!');
      
      // Reset form
      resetForm();

      // Refresh storage usage in background
      checkStorageUsage();

      // Callback for parent component
      if (onUploadSuccess) {
        onUploadSuccess({
          fileName: `${newFileName.trim()}.${outputFormat}`,
          fullPath: fullPath,
          downloadURL: downloadURL,
          size: blobToUpload.size,
          originalSize: selectedFile.size,
          compressionRatio: compressionStats?.compressionRatio || '0',
          metadata: {
            uploadedBy: currentUser.uid,
            uploadedAt: new Date().toISOString(),
            originalName: selectedFile.name
          }
        });
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Enhanced error handling with specific guidance
      const errorInfo = firebaseErrorHandler.handleStorageError(error);
      
      if (onUploadError) {
        onUploadError({
          ...error,
          userMessage: errorInfo.userMessage,
          technical: errorInfo.technical,
          action: errorInfo.action
        });
      } else {
        toast.error(errorInfo.userMessage);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setFinalCompressedBlob(null);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setNewFileName('');
    setOriginalFileSize(null);
    setCompressedFileSize(null);
    setCompressionStats(null);
    setPreviewUrl(null);
    setConfirmUploadModal(false);
    setFinalCompressedBlob(null);
    
    const fileInput = document.getElementById('image-upload-input');
    if (fileInput) fileInput.value = '';
  };

  const handleCancelUpload = () => {
    setConfirmUploadModal(false);
    setFinalCompressedBlob(null);
  };
  
  const handleConfirmUpload = async () => {
    if (finalCompressedBlob) {
      setConfirmUploadModal(false);
      await executeUpload(finalCompressedBlob);
    }
  };

  const isProcessing = compressing || uploading;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Selection */}
      <div className="card">
        <div className="card-content space-y-6">
          {/* File Input */}
          <div>
            <label htmlFor="image-upload-input" className="block text-base font-medium text-foreground mb-4">
              Select Image File
            </label>
            <label 
                htmlFor="image-upload-input" 
                className="relative block border-2 border-border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50"
              >
              {/* This is the hidden file input */}
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="sr-only"
                disabled={isProcessing}
              />
              
              {/* This is the custom UI that acts as the upload button */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedFile ? `File Selected: ${selectedFile.name}` : `No file selected`}
                </p>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      {uploading ? 'Uploading...' : compressing ? 'Processing...' : 'Loading...'}
                    </div>
                    {uploading && uploadProgress > 0 && (
                      <div className="mt-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {uploadProgress}% uploaded
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              Supported formats: JPEG, PNG, GIF, BMP, TIFF. Max size: {formatBytes(maxFileSize)}
            </p>
          </div>

          {/* Preview and Stats */}
          {selectedFile && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div>
                  <h4 className="text-base font-medium text-foreground mb-3">Preview</h4>
                  <div className="border border-border rounded-lg p-4 bg-muted/30">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-contain rounded-md"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Compression Stats */}
                <div>
                  <h4 className="text-base font-medium text-foreground mb-3">
                    Compression Preview
                    {compressing && <LoadingSpinner size="sm" className="inline-block ml-2" />}
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <FileImage className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Original</span>
                      </div>
                      <div className="space-y-1 text-sm text-blue-700">
                        <div>Size: {formatBytes(originalFileSize || 0)}</div>
                        <div>Format: {selectedFile?.type}</div>
                      </div>
                    </div>

                    {compressionStats && (
                      <div className={`p-4 border rounded-lg ${
                        compressionStats.isLarger 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center space-x-3 mb-3">
                          {compressionStats.isLarger ? (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                          <span className={`text-sm font-medium ${
                            compressionStats.isLarger ? 'text-red-800' : 'text-green-800'
                          }`}>
                            Optimized
                          </span>
                        </div>
                        <div className={`space-y-1 text-sm ${
                          compressionStats.isLarger ? 'text-red-700' : 'text-green-700'
                        }`}>
                          <div>Size: {formatBytes(compressionStats.compressedSize)}</div>
                          <div>Format: {outputFormat.toUpperCase()}</div>
                          <div className="font-medium">
                            {compressionStats.isLarger ? 'Increased' : 'Saved'}: {Math.abs(parseFloat(compressionStats.compressionRatio))}% 
                            ({compressionStats.isLarger ? '+' : ''}{formatBytes(Math.abs(compressionStats.sizeDifference))})
                          </div>
                        </div>
                        {compressionStats.isLarger && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                            ⚠ The optimized file is larger than the original. Try adjusting the quality percentage, as compression may be malfunctioning.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          )}

          {/* Filename Input */}
          {selectedFile && (
              <InputField
                label="New Filename (without extension)"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter filename"
                disabled={isProcessing}
                className="max-w-md"
              />
          )}
        </div>
      </div>

      {/* Optimization Settings */}
      <div className="card">
        <div className="card-content space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InputField
              label="Quality (%)"
              type="number"
              min="1"
              max="100"
              value={imageQuality}
              onChange={(e) => setImageQuality(parseInt(e.target.value) || 80)}
              disabled={isProcessing}
            />
            
            <InputField
              label="Max Width (px)"
              type="number"
              min="100"
              max="4000"
              value={imageMaxWidth}
              onChange={(e) => setImageMaxWidth(parseInt(e.target.value) || 1920)}
              disabled={isProcessing}
            />
            
            <InputField
              label="Max Height (px)"
              type="number"
              min="100"
              max="4000"
              value={imageMaxHeight}
              onChange={(e) => setImageMaxHeight(parseInt(e.target.value) || 1080)}
              disabled={isProcessing}
            />
            
            <div>
              <label className="block text-base font-medium text-foreground mb-4">
                Output Format
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                disabled={isProcessing}
                className="input-field"
              >
                <option value="webp">WebP (Recommended)</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </div>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 border-t border-border">
              <button
                onClick={handleInitiateUpload}
                disabled={isProcessing || !newFileName.trim()}
                className="btn-primary w-full sm:w-auto"
              >
                {isProcessing ? (
                  'Uploading...'
                ) : (
                  'Upload Optimized Image'
                )}
              </button>
              
              <button
                onClick={resetForm}
                disabled={isProcessing}
                className="btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Larger Files */}
      <Modal
        isOpen={confirmUploadModal}
        onClose={handleCancelUpload}
        title="Confirm Upload"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-8 w-8 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Optimized File is Larger
              </h3>
              <p className="text-base text-muted-foreground mb-4">
                The optimized image is larger than the original file. This can happen with certain images and settings.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-amber-800">Original Size:</span>
                <div className="text-amber-700">{formatBytes(originalFileSize || 0)}</div>
              </div>
              <div>
                <span className="font-medium text-amber-800">Optimized Size:</span>
                <div className="text-amber-700">{formatBytes(compressedFileSize || 0)}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-amber-800">Size Increase:</span>
                <div className="text-amber-700">
                  +{formatBytes(Math.abs((compressedFileSize || 0) - (originalFileSize || 0)))} 
                  ({Math.abs(parseFloat(compressionStats?.compressionRatio || 0))}% larger)
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>Suggestions:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Try reducing the quality setting</li>
              <li>• Use a different output format (WebP usually works best)</li>
              <li>• Reduce the maximum dimensions</li>
              <li>• Or proceed with the original optimization if the quality improvement is worth it</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button
              onClick={handleCancelUpload}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel & Adjust Settings
            </button>
            <button
              onClick={handleConfirmUpload}
              className="btn-primary w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Proceed with Upload
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
