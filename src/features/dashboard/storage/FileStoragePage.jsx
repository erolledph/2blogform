import React, { useState, useEffect } from 'react';
import { ref, listAll, getMetadata, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import DataTable from '@/components/shared/DataTable';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Modal from '@/components/shared/Modal';
import ImageUploader from '@/components/shared/ImageUploader';
import { 
  Folder, 
  FileImage, 
  Download, 
  Trash2, 
  ExternalLink, 
  RefreshCw,
  AlertTriangle,
  HardDrive,
  Calendar,
  Eye,
  ArrowLeft,
  Home,
  ChevronRight,
  Upload,
  Plus
} from 'lucide-react';
import { formatBytes } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function FileStoragePage() {
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null });
  const [uploadModal, setUploadModal] = useState({ isOpen: false });
  const [storageStats, setStorageStats] = useState({ totalFiles: 0, totalSize: 0 });
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchItems();
  }, [currentPath]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const storageRef = currentPath ? ref(storage, currentPath) : ref(storage);
      const result = await listAll(storageRef);
      
      const currentItems = [];
      
      // Process folders (prefixes)
      for (const prefixRef of result.prefixes) {
        currentItems.push({
          id: prefixRef.fullPath,
          name: prefixRef.name,
          fullPath: prefixRef.fullPath,
          type: 'folder',
          size: 0,
          timeCreated: null,
          ref: prefixRef
        });
      }
      
      // Process files (items)
      const filePromises = result.items.map(async (itemRef) => {
        try {
          const metadata = await getMetadata(itemRef);
          const downloadURL = await getDownloadURL(itemRef);
          
          return {
            id: itemRef.fullPath,
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            type: 'file',
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: new Date(metadata.timeCreated),
            downloadURL,
            ref: itemRef
          };
        } catch (error) {
          console.warn(`Error fetching metadata for ${itemRef.name}:`, error);
          return null;
        }
      });
      
      const files = (await Promise.all(filePromises)).filter(Boolean);
      currentItems.push(...files);
      
      // Sort: folders first, then files, both alphabetically
      currentItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      setItems(currentItems);
      
      // Update storage stats (only count files)
      const fileItems = currentItems.filter(item => item.type === 'file');
      const currentSize = fileItems.reduce((sum, file) => sum + file.size, 0);
      
      // For total stats, we need to get all files recursively (but only for stats)
      if (currentPath === '') {
        const allFiles = await getAllFilesRecursive(ref(storage));
        setStorageStats({
          totalFiles: allFiles.length,
          totalSize: allFiles.reduce((sum, file) => sum + file.size, 0)
        });
      }
      
    } catch (error) {
      console.error('Error fetching items:', error);
      setError(error.message);
      toast.error('Failed to fetch items from storage');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get all files recursively (for stats only)
  const getAllFilesRecursive = async (storageRef) => {
    const allFiles = [];
    
    try {
      const result = await listAll(storageRef);
      
      // Process files at current level
      const filePromises = result.items.map(async (itemRef) => {
        try {
          const metadata = await getMetadata(itemRef);
          return {
            size: metadata.size,
            timeCreated: new Date(metadata.timeCreated)
          };
        } catch (error) {
          return null;
        }
      });
      
      const currentLevelFiles = (await Promise.all(filePromises)).filter(Boolean);
      allFiles.push(...currentLevelFiles);
      
      // Recursively process subfolders
      const subfolderPromises = result.prefixes.map(async (prefixRef) => {
        try {
          const subfolderFiles = await getAllFilesRecursive(prefixRef);
          return subfolderFiles;
        } catch (error) {
          return [];
        }
      });
      
      const subfolderResults = await Promise.all(subfolderPromises);
      subfolderResults.forEach(subfolderFiles => {
        allFiles.push(...subfolderFiles);
      });
      
    } catch (error) {
      console.error(`Error listing files in ${storageRef.fullPath}:`, error);
    }
    
    return allFiles;
  };

  const navigateToFolder = (folderPath) => {
    setPathHistory(prev => [...prev, currentPath]);
    setCurrentPath(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      const previousPath = newHistory.pop();
      setPathHistory(newHistory);
      setCurrentPath(previousPath);
    }
  };

  const navigateToRoot = () => {
    setPathHistory(['']);
    setCurrentPath('');
  };

  const navigateToPath = (targetPath) => {
    // Find the index of the target path in history or create new history
    const pathIndex = pathHistory.indexOf(targetPath);
    if (pathIndex !== -1) {
      setPathHistory(pathHistory.slice(0, pathIndex + 1));
      setCurrentPath(targetPath);
    } else {
      setPathHistory(['', targetPath]);
      setCurrentPath(targetPath);
    }
  };

  const handleDelete = async (item) => {
    try {
      if (item.type === 'folder') {
        // For folders, we need to delete all files inside recursively
        await deleteFolder(item.ref);
        toast.success('Folder deleted successfully');
      } else {
        await deleteObject(item.ref);
        toast.success('File deleted successfully');
      }
      
      setDeleteModal({ isOpen: false, item: null });
      fetchItems(); // Refresh the current view
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(`Failed to delete ${item.type}`);
    }
  };

  const deleteFolder = async (folderRef) => {
    const result = await listAll(folderRef);
    
    // Delete all files in the folder
    const deleteFilePromises = result.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deleteFilePromises);
    
    // Recursively delete subfolders
    const deleteSubfolderPromises = result.prefixes.map(prefixRef => deleteFolder(prefixRef));
    await Promise.all(deleteSubfolderPromises);
  };

  const handlePreview = (file) => {
    setPreviewModal({ isOpen: true, file });
  };

  const handleUploadSuccess = (uploadResult) => {
    console.log('Upload successful:', uploadResult);
    setUploadModal({ isOpen: false });
    fetchItems(); // Refresh the current view
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
  };

  const getItemIcon = (item) => {
    if (item.type === 'folder') {
      return <Folder className="h-5 w-5 text-blue-600" />;
    }
    if (item.contentType?.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-green-600" />;
    }
    return <FileImage className="h-5 w-5 text-gray-600" />;
  };

  const isImage = (contentType) => {
    return contentType?.startsWith('image/');
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [{ name: 'Root', path: '' }];
    
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Root', path: '' }];
    
    let currentBreadcrumbPath = '';
    parts.forEach(part => {
      currentBreadcrumbPath = currentBreadcrumbPath ? `${currentBreadcrumbPath}/${part}` : part;
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath });
    });
    
    return breadcrumbs;
  };

  const columns = [
    {
      key: 'preview',
      title: 'Preview',
      sortable: false,
      render: (_, row) => (
        <div className="w-12 h-12 flex-shrink-0">
          {row.type === 'file' && isImage(row.contentType) ? (
            <img
              src={row.downloadURL}
              alt={row.name}
              className="w-12 h-12 object-cover rounded border border-border cursor-pointer hover:opacity-80"
              onClick={() => handlePreview(row)}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-12 h-12 bg-muted rounded border border-border flex items-center justify-center ${
              row.type === 'file' && isImage(row.contentType) ? 'hidden' : 'flex'
            }`}
          >
            {getItemIcon(row)}
          </div>
        </div>
      )
    },
    {
      key: 'name',
      title: 'Name',
      render: (value, row) => (
        <div className="flex flex-col">
          <div 
            className={`text-base font-medium truncate max-w-xs ${
              row.type === 'folder' 
                ? 'text-blue-600 cursor-pointer hover:text-blue-800' 
                : 'text-foreground'
            }`}
            onClick={() => row.type === 'folder' && navigateToFolder(row.fullPath)}
          >
            {value}
          </div>
          {row.type === 'file' && (
            <div className="text-sm text-muted-foreground">
              {row.contentType || 'Unknown type'}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      title: 'Type',
      render: (value) => (
        <span className={`badge ${value === 'folder' ? 'badge-secondary' : 'badge-default'}`}>
          {value === 'folder' ? 'Folder' : 'File'}
        </span>
      )
    },
    {
      key: 'size',
      title: 'Size',
      render: (value, row) => (
        <span className="text-base text-foreground">
          {row.type === 'folder' ? '-' : formatBytes(value)}
        </span>
      )
    },
    {
      key: 'timeCreated',
      title: 'Created',
      render: (value, row) => {
        if (row.type === 'folder' || !value) return '-';
        return (
          <div className="flex flex-col">
            <span className="text-base text-foreground">
              {value.toLocaleDateString()}
            </span>
            <span className="text-sm text-muted-foreground">
              {value.toLocaleTimeString()}
            </span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center space-x-1">
          {row.type === 'folder' ? (
            <>
              <button
                onClick={() => navigateToFolder(row.fullPath)}
                className="text-blue-600 p-2 rounded hover:bg-blue-50"
                title="Open folder"
              >
                <Folder className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, item: row })}
                className="text-destructive p-2 rounded hover:bg-destructive/10"
                title="Delete folder"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {isImage(row.contentType) && (
                <button
                  onClick={() => handlePreview(row)}
                  className="text-blue-600 p-2 rounded hover:bg-blue-50"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <a
                href={row.downloadURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 p-2 rounded hover:bg-green-50"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <a
                href={row.downloadURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 p-2 rounded hover:bg-gray-50"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => setDeleteModal({ isOpen: true, item: row })}
                className="text-destructive p-2 rounded hover:bg-destructive/10"
                title="Delete file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">File Storage</h1>
        </div>
        <div className="flex items-center space-x-4">
          {currentPath && (
            <button
              onClick={navigateBack}
              className="btn-secondary inline-flex items-center"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          )}
          <button
            onClick={() => setUploadModal({ isOpen: true })}
            className="btn-primary inline-flex items-center"
          >
            <Upload className="h-5 w-5 mr-3" />
            Upload Image
          </button>
          <button
            onClick={fetchItems}
            disabled={loading}
            className="btn-secondary inline-flex items-center"
          >
            <RefreshCw className={`h-5 w-5 mr-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="card">
        <div className="card-content p-4">
          <nav className="flex items-center space-x-2 text-sm">
            <button
              onClick={navigateToRoot}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <Home className="h-4 w-4 mr-1" />
              Storage
            </button>
            {getBreadcrumbs().slice(1).map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => navigateToPath(crumb.path)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-blue-200 bg-blue-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Total Files</p>
                <p className="text-3xl font-bold text-blue-900">{storageStats.totalFiles}</p>
              </div>
              <Folder className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card border-green-200 bg-green-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Total Size</p>
                <p className="text-3xl font-bold text-green-900">{formatBytes(storageStats.totalSize)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card border-purple-200 bg-purple-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Current Folder</p>
                <p className="text-lg font-bold text-purple-900">
                  {items.filter(item => item.type === 'file').length} files
                </p>
                <p className="text-sm text-purple-600">
                  {items.filter(item => item.type === 'folder').length} folders
                </p>
              </div>
              <FileImage className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage Warning */}
      <div className="card border-blue-200 bg-blue-50">
        <div className="card-content p-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Storage Information</h3>
              <div className="text-base text-blue-700 space-y-2">
                <p>
                  <strong>Current Usage:</strong> {formatBytes(storageStats.totalSize)} total storage used
                </p>
                <p>
                  All uploaded images and files are stored securely in the cloud with automatic backups.
                </p>
                <p>
                  Files are optimized for fast delivery and global accessibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card border-red-200 bg-red-50">
          <div className="card-content p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Items</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button onClick={fetchItems} className="btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card-content text-center py-16">
            <Folder className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              {currentPath ? 'Folder is empty' : 'No files found'}
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              {currentPath 
                ? 'This folder contains no files or subfolders.'
                : 'Upload some images through the content creation process to see them here.'
              }
            </p>
          </div>
        </div>
      ) : (
        <DataTable
          data={items}
          columns={columns}
          searchable={true}
          sortable={true}
          pagination={true}
          pageSize={20}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        title={`Delete ${deleteModal.item?.type === 'folder' ? 'Folder' : 'File'}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-base text-foreground">
            Are you sure you want to delete "{deleteModal.item?.name}"?
          </p>
          {deleteModal.item?.type === 'folder' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Warning</p>
                  <p className="text-sm text-amber-700">
                    This will delete the folder and all files inside it. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The {deleteModal.item?.type} will be permanently removed from Firebase Storage.
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The {deleteModal.item?.type} will be permanently removed from storage.
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => setDeleteModal({ isOpen: false, item: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.item)}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, file: null })}
        title={previewModal.file?.name}
        size="xl"
      >
        {previewModal.file && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={previewModal.file.downloadURL}
                alt={previewModal.file.name}
                className="max-w-full max-h-96 object-contain rounded-lg border border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-foreground">File Size:</span>
                <span className="ml-2 text-muted-foreground">{formatBytes(previewModal.file.size)}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Type:</span>
                <span className="ml-2 text-muted-foreground">{previewModal.file.contentType}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Created:</span>
                <span className="ml-2 text-muted-foreground">{previewModal.file.timeCreated.toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Path:</span>
                <span className="ml-2 text-muted-foreground font-mono text-xs">{previewModal.file.fullPath}</span>
              </div>
            </div>
            <div className="flex justify-center space-x-4 pt-4">
              <a
                href={previewModal.file.downloadURL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
              <a
                href={previewModal.file.downloadURL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false })}
        title="Upload & Compress Image"
        size="xl"
      >
        <ImageUploader
          currentPath={currentPath}
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