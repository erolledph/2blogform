import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import { fromBlob } from 'image-resize-compress';
import InputField from './InputField';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import { Upload, Image as ImageIcon, FileImage, CheckCircle, AlertTriangle, Settings, Zap } from 'lucide-react';
import { formatBytes } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ImageUploader({ 
  onUploadSuccess, 
  onUploadError,
  currentPath = '',
  className = '',
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  initialQuality = 80,
  initialMaxWidth = 1920,
  initialMaxHeight = 1080
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

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
        
        // Run compression preview with the detected dimensions
        // Note: runCompressionPreview will be triggered by useEffect when dimensions change
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

      const compressedSize = compressedBlob.size;
      const originalSize = file.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      const sizeDifference = originalSize - compressedSize;
      
      setCompressedFileSize(compressedSize);
      setCompressionStats({
        originalSize,
        compressedSize,
        compressionRatio,
        sizeDifference,
        format: outputFormat,
        isLarger: compressedSize > originalSize
      });

    } catch (error) {
      console.error('Error in compression preview:', error);
      toast.error('Failed to preview compression');
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

      // Create storage path
      const fileName = `${newFileName.trim()}.${outputFormat}`;
      const fullPath = currentPath ? `${currentPath}/${fileName}` : `images/${fileName}`;
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
          maxHeight: imageMaxHeight.toString()
        }
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      
      toast.success('Image uploaded successfully!');
      
      // Reset form
      resetForm();

      // Callback for parent component
      if (onUploadSuccess) {
        onUploadSuccess({
          fileName,
          fullPath,
          downloadURL,
          size: blobToUpload.size,
          originalSize: selectedFile.size,
          compressionRatio: compressionStats?.compressionRatio || '0'
        });
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    setConfirmUploadModal(false);
    await executeUpload(finalCompressedBlob);
  };

  const handleCancelUpload = () => {
    setConfirmUploadModal(false);
    setFinalCompressedBlob(null);
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

  const isProcessing = compressing || uploading;

  const getUploadButtonText = () => {
    if (compressing) return 'Compressing...';
    if (uploading) return 'Uploading to Firebase...';
    return 'Upload Optimized Image';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Upload & Optimize Image</h3>
          <p className="card-description">
            Select an image and customize optimization settings
          </p>
        </div>
        <div className="card-content space-y-6">
          {/* File Input */}
          <div>
            <label className="block text-base font-medium text-foreground mb-4">
              Select Image File
            </label>
            <div className="relative">
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="input-field"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
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
                          ({compressionStats.isLarger ? '+' : ''}{formatBytes(compressionStats.sizeDifference * -1)})
                        </div>
                      </div>
                      {compressionStats.isLarger && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                          ⚠ The optimized file is larger than the original. You'll be prompted before upload.
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
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-primary" />
            <h3 className="card-title">Optimization Settings</h3>
          </div>
          <p className="card-description">
            Customize compression parameters for optimal results
          </p>
        </div>
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
            <div className="flex items-center space-x-4 pt-4 border-t border-border">
              <button
                onClick={handleInitiateUpload}
                disabled={isProcessing || !newFileName.trim()}
                className="btn-primary"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-3" />
                   Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-3" />
                   Upload Optimized Image
                  </>
                )}
              </button>
              
              <button
                onClick={resetForm}
                disabled={isProcessing}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Format Information */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-blue-600" />
            <h3 className="card-title">Format Information</h3>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">WebP (Default)</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Best compression ratio</li>
                <li>• Modern browser support</li>
                <li>• Ideal for web use</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">JPEG</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Universal compatibility</li>
                <li>• Good for photos</li>
                <li>• Lossy compression</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">PNG</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Lossless compression</li>
                <li>• Supports transparency</li>
                <li>• Larger file sizes</li>
              </ul>
            </div>
          </div>
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
                  +{formatBytes((compressedFileSize || 0) - (originalFileSize || 0))} 
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
              className="btn-secondary"
            >
              Cancel & Adjust Settings
            </button>
            <button
              onClick={handleConfirmUpload}
              className="btn-primary"
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