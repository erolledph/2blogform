import React, { useState, useEffect } from 'react';
import { ref, listAll, getMetadata, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { storageService } from '@/services/storageService';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton, StatCardSkeleton, FileStorageSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import ImageUploader from '@/components/shared/ImageUploader';
import InputField from '@/components/shared/InputField';
import { firebaseErrorHandler } from '@/utils/firebaseErrorHandler';
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
  Plus,
  Edit,
  FolderOpen
} from 'lucide-react';
import { formatBytes } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function FileStoragePage() {
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [userBasePath, setUserBasePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, file: null });
  const [uploadModal, setUploadModal] = useState({ isOpen: false });
  const [storageStats, setStorageStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [createFolderModal, setCreateFolderModal] = useState({ isOpen: false });
  const [renameModal, setRenameModal] = useState({ isOpen: false, item: null });
  const [moveModal, setMoveModal] = useState({ isOpen: false, item: null });
  const [createFolderInMoveModal, setCreateFolderInMoveModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [availableFolders, setAvailableFolders] = useState([]);
  const [operationLoading, setOperationLoading] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const { currentUser, getAuthToken } = useAuth();
  
  // Initialize user-specific base path
  useEffect(() => {
    if (currentUser?.uid) {
      const basePath = `users/${currentUser.uid}/public_images`;
      setUserBasePath(basePath);
      setCurrentPath(basePath);
      setPathHistory([basePath]);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (currentPath && userBasePath) {
      fetchItems();
    }
  }, [currentPath, userBasePath, currentUser?.uid]);

  const fetchItems = async () => {
    if (!currentPath) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const storageRef = ref(storage, currentPath);
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
      
      // Calculate total storage stats for this user only
      if (currentPath === userBasePath && currentUser?.uid) {
        try {
          const totalUsageBytes = await storageService.getUserTotalStorageUsage(currentUser.uid);
          const allUserFiles = await getAllUserFilesRecursive(ref(storage, userBasePath));
          setStorageStats({
            totalFiles: allUserFiles.length,
            totalSize: totalUsageBytes
          });
        } catch (error) {
          console.error('Error calculating user storage stats:', error);
          // Fallback to current level calculation
          setStorageStats({
            totalFiles: fileItems.length,
            totalSize: fileItems.reduce((sum, file) => sum + file.size, 0)
          });
        }
      } else {
        // For subdirectories, just show current level stats
        setStorageStats({
          totalFiles: fileItems.length,
          totalSize: fileItems.reduce((sum, file) => sum + file.size, 0)
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

  // Helper function to get all user files recursively (for stats only)
  const getAllUserFilesRecursive = async (storageRef) => {
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
          const subfolderFiles = await getAllUserFilesRecursive(prefixRef);
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

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    // Enhanced validation for folder names
    const trimmedName = newFolderName.trim();
    
    if (trimmedName.length === 0) {
      toast.error('Folder name cannot be empty');
      return;
    }
    
    if (trimmedName.length > 50) {
      toast.error('Folder name must be less than 50 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
      toast.error('Folder name can only contain letters, numbers, underscores, and hyphens');
      return;
    }
    
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      toast.error('Folder name cannot contain slashes');
      return;
    }
    
    if (trimmedName.startsWith('.') || trimmedName.endsWith('.')) {
      toast.error('Folder name cannot start or end with a period');
      return;
    }

    try {
      setOperationLoading(true);
      const folderPath = `${currentPath}/${trimmedName}`;
      
      const token = await getAuthToken();
      await storageService.createFolder(folderPath, token);
      
      toast.success('Folder created successfully');
      
      // Close the appropriate modal based on context
      if (createFolderInMoveModal) {
        setCreateFolderInMoveModal(false);
        // Refresh available folders for the move modal
        await fetchAvailableFolders();
      } else {
        setCreateFolderModal({ isOpen: false });
      }
      
      setNewFolderName('');
      await fetchItems(); // Refresh the items list
    } catch (error) {
      console.error('Error creating folder:', error);
      
      // Use enhanced error handling
      const errorInfo = firebaseErrorHandler.handleStorageError(error);
      toast.error(errorInfo.userMessage || 'Failed to create folder');
    } finally {
      setOperationLoading(false);
    }
  };

  const renameItem = async () => {
    if (!newItemName.trim() || !renameModal.item) {
      toast.error('New name is required');
      return;
    }

    // Enhanced validation for item names
    const trimmedName = newItemName.trim();
    
    if (trimmedName.length === 0) {
      toast.error('Name cannot be empty');
      return;
    }
    
    if (trimmedName.length > 100) {
      toast.error('Name must be less than 100 characters');
      return;
    }
    
    if (renameModal.item.type === 'folder') {
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
        toast.error('Folder name can only contain letters, numbers, underscores, and hyphens');
        return;
      }
    } else {
      if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedName)) {
        toast.error('File name can only contain letters, numbers, underscores, hyphens, and dots');
        return;
      }
    }
    
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      toast.error('Name cannot contain slashes');
      return;
    }
    
    if (trimmedName.startsWith('.') && renameModal.item.type === 'folder') {
      toast.error('Folder name cannot start with a period');
      return;
    }

    try {
      setOperationLoading(true);
      const item = renameModal.item;
      
      const token = await getAuthToken();

      if (item.type === 'file') {
        await storageService.renameFile(item.fullPath, trimmedName, token);
      } else {
        await storageService.renameFolder(item.fullPath, trimmedName, token);
      }
      
      toast.success('Item renamed successfully');
      
      setRenameModal({ isOpen: false, item: null });
      setNewItemName('');
      await fetchItems(); // Refresh the items list
    } catch (error) {
      console.error('Error renaming item:', error);
      
      // Use enhanced error handling
      const errorInfo = firebaseErrorHandler.handleStorageError(error);
      toast.error(errorInfo.userMessage || 'Failed to rename item');
    } finally {
      setOperationLoading(false);
    }
  };

  const fetchAvailableFolders = async () => {
    try {
      const folders = [];
      
      // Add user's public images root folder
      folders.push({ path: userBasePath, name: 'My Public Images' });
      
      // Recursively get all folders
      const getAllFolders = async (path, prefix = '') => {
        try {
          const storageRef = ref(storage, path);
          const result = await listAll(storageRef);
          
          for (const prefixRef of result.prefixes) {
            // Create relative path from user base path
            const relativePath = prefixRef.fullPath.replace(userBasePath + '/', '');
            const folderName = relativePath || prefixRef.name;
            folders.push({ 
              path: prefixRef.fullPath, 
              name: folderName 
            });
            
            // Recursively get subfolders (limit depth to prevent infinite loops)
            if (prefix.split('/').length < 3) {
              await getAllFolders(prefixRef.fullPath, folderName);
            }
          }
        } catch (error) {
          console.warn(`Error listing folders in ${path}:`, error);
        }
      };
      
      await getAllFolders(userBasePath);
      setAvailableFolders(folders);
    } catch (error) {
      console.error('Error fetching available folders:', error);
      setAvailableFolders([{ path: userBasePath, name: 'My Public Images' }]);
    }
  };

  const moveItem = async () => {
    if (!selectedDestination || !moveModal.item) {
      toast.error('Please select a destination folder');
      return;
    }

    try {
      setOperationLoading(true);
      const item = moveModal.item;
      
      const token = await getAuthToken();

      if (item.type === 'file') {
        const destPath = `${selectedDestination}/${item.name}`;
        await storageService.moveFile(item.fullPath, destPath, token);
      } else {
        await storageService.moveFolder(item.fullPath, selectedDestination, token);
      }
      
      toast.success('Item moved successfully');
      
      setMoveModal({ isOpen: false, item: null });
      setSelectedDestination('');
      await fetchItems(); // Refresh the items list
    } catch (error) {
      console.error('Error moving item:', error);
      
      // Use enhanced error handling
      const errorInfo = firebaseErrorHandler.handleStorageError(error);
      toast.error(errorInfo.userMessage || 'Failed to move item');
    } finally {
      setOperationLoading(false);
    }
  };
  const navigateToFolder = (folderPath) => {
    // Ensure we stay within user's storage space
    if (!folderPath.startsWith(userBasePath)) {
      console.warn('Attempted to navigate outside user storage space');
      return;
    }
    setPathHistory(prev => [...prev, currentPath]);
    setCurrentPath(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop(); // Remove current path
      const previousPath = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentPath(previousPath);
    }
  };

  const navigateToUserRoot = () => {
    setPathHistory([userBasePath]);
    setCurrentPath(userBasePath);
  };

  const navigateToPath = (targetPath) => {
    // Ensure we stay within user's storage space
    if (!targetPath.startsWith(userBasePath) && targetPath !== userBasePath) {
      console.warn('Attempted to navigate outside user storage space');
      return;
    }
    
    // Find the index of the target path in history or create new history
    const pathIndex = pathHistory.indexOf(targetPath);
    if (pathIndex !== -1) {
      setPathHistory(pathHistory.slice(0, pathIndex + 1));
      setCurrentPath(targetPath);
    } else {
      setPathHistory([userBasePath, targetPath]);
      setCurrentPath(targetPath);
    }
  };

  const handleDelete = async (item) => {
    try {
      setDeletingItemId(item.id);
      const token = await getAuthToken();
      await storageService.deleteFile(item.fullPath, token, item.type === 'folder');
      
      toast.success(`${item.type === 'folder' ? 'Folder' : 'File'} deleted successfully`);
      
      setDeleteModal({ isOpen: false, item: null });
      await fetchItems(); // Refresh the items list
    } catch (error) {
      console.error('Error deleting item:', error);
      
      // Use enhanced error handling
      const errorInfo = firebaseErrorHandler.handleStorageError(error);
      toast.error(errorInfo.userMessage || 'Failed to delete item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handlePreview = (file) => {
    setPreviewModal({ isOpen: true, file });
  };

  const handleUploadSuccess = (uploadResult) => {
    // Refresh items to get the latest state
    fetchItems();
    
    setUploadModal({ isOpen: false });
    toast.success(`Image uploaded successfully: ${uploadResult.fileName}`);
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
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
    if (!currentPath || !userBasePath) return [{ name: 'My Storage', path: userBasePath || '' }];
    
    if (currentPath === userBasePath) {
      return [{ name: 'My Storage', path: userBasePath }];
    }
    
    // Get the relative path from user base path
    const relativePath = currentPath.replace(userBasePath + '/', '');
    const parts = relativePath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'My Storage', path: userBasePath }];
    
    let currentBreadcrumbPath = userBasePath;
    parts.forEach(part => {
      currentBreadcrumbPath = `${currentBreadcrumbPath}/${part}`;
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
                disabled={loading}
                title="Open folder"
              >
                <Folder className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setRenameModal({ isOpen: true, item: row });
                  setNewItemName(row.name);
                }}
                className="text-purple-600 p-2 rounded hover:bg-purple-50"
                disabled={loading}
                title="Rename folder"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setMoveModal({ isOpen: true, item: row });
                  fetchAvailableFolders();
                }}
                className="text-orange-600 p-2 rounded hover:bg-orange-50"
                disabled={loading}
                title="Move folder"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, item: row })}
                className="text-destructive p-2 rounded hover:bg-destructive/10"
                disabled={loading}
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
              <button
                onClick={() => {
                  setRenameModal({ isOpen: true, item: row });
                  setNewItemName(row.name);
                }}
                className="text-purple-600 p-2 rounded hover:bg-purple-50"
                disabled={loading}
                title="Rename"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setMoveModal({ isOpen: true, item: row });
                  fetchAvailableFolders();
                }}
                className="text-orange-600 p-2 rounded hover:bg-orange-50"
                disabled={loading}
                title="Move"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
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


  return (
    <>
      <div className="space-y-12">
      {/* Header and Action Buttons - Always visible */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">File Storage</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {currentPath && currentPath !== userBasePath && (
            <LoadingButton
              onClick={navigateBack}
              variant="secondary"
              icon={ArrowLeft}
            >
              Back
            </LoadingButton>
          )}
          <LoadingButton
            onClick={() => setCreateFolderModal({ isOpen: true })}
            variant="secondary"
            icon={Plus}
          >
            New Folder
          </LoadingButton>
          <LoadingButton
            onClick={() => setUploadModal({ isOpen: true })}
            variant="primary"
            icon={Upload}
          >
            Upload Image
          </LoadingButton>
          <LoadingButton
            onClick={fetchItems}
            loading={loading}
            loadingText="Refreshing..."
            variant="secondary"
            icon={RefreshCw}
          >
            Refresh
          </LoadingButton>
        </div>
      </div>

      {/* Breadcrumb Navigation - Always visible */}
      <nav className="flex items-center space-x-3 text-sm text-muted-foreground mb-8 p-4 bg-muted/20 rounded-lg">
        <button
          onClick={navigateToUserRoot}
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
        </button>
        
        {getBreadcrumbs().slice(1).map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => navigateToPath(crumb.path)}
              className="hover:text-foreground transition-colors"
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </nav>


      {/* Storage Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="card border-blue-200 bg-blue-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-3">Total Files</p>
                  <p className="text-3xl font-bold text-blue-900 leading-none">{storageStats.totalFiles}</p>
                </div>
                <Folder className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card border-green-200 bg-green-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-3">Total Size</p>
                  <p className="text-3xl font-bold text-green-900 leading-none">{formatBytes(storageStats.totalSize)}</p>
                  <p className="text-sm text-green-600">of {currentUser?.totalStorageMB || 100} MB limit</p>
                </div>
                <HardDrive className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card border-purple-200 bg-purple-50">
            <div className="card-content p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-3">Storage Usage</p>
                  <p className="text-3xl font-bold text-purple-900 leading-none">
                    {((storageStats.totalSize / 1024 / 1024) / (currentUser?.totalStorageMB || 100) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-purple-600">used</p>
                </div>
                <FileImage className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* File Storage Content */}
      {loading ? (
        <FileStorageSkeleton />
      ) : error ? (
        <div className="card border-red-200 bg-red-50">
          <div className="card-content p-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-red-500" />
            <h3 className="text-xl font-bold text-red-800 mb-4">Error Loading Storage Items</h3>
            <p className="text-lg text-red-700 mb-6">{error}</p>
            <div className="space-y-6">
              <button onClick={fetchItems} className="btn-secondary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
              <div className="text-sm text-red-600">
                <p>If this error persists, try:</p>
                <ul className="list-disc list-inside mt-3 space-y-2">
                  <li>Refreshing the page</li>
                  <li>Checking your internet connection</li>
                  <li>Logging out and back in</li>
                  <li>Contacting support if the issue continues</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-20">
              <Folder className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                {currentPath && currentPath !== userBasePath ? 'Folder is empty' : 'No files in your storage'}
              </h3>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                {currentPath && currentPath !== userBasePath
                  ? 'This folder contains no files or subfolders.'
                  : 'Upload some images through the content creation process or use the upload button to add files to your personal storage.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-content p-0">
              <DataTable
                data={items}
                columns={columns}
                searchable={true}
                sortable={true}
                pagination={true}
                pageSize={20}
              />
            </div>
          </div>
        )
      }
      </div>

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
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => setDeleteModal({ isOpen: false, item: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.item)}
              disabled={deletingItemId === deleteModal.item?.id}
              className="btn-danger"
            >
              {deletingItemId === deleteModal.item?.id ? (
                'Deleting...'
              ) : (
                'Delete'
              )}
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
        <div className="space-y-6">
          
          <ImageUploader
            currentPath={currentPath === userBasePath ? null : currentPath}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            maxFileSize={10 * 1024 * 1024} // 10MB
            initialQuality={80}
            initialMaxWidth={1920}
            initialMaxHeight={1080}
          />
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={createFolderModal.isOpen}
        onClose={() => {
          setCreateFolderModal({ isOpen: false });
          setNewFolderName('');
        }}
        title="Create New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <InputField
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            maxLength={50}
            autoFocus
          />
          <div className="space-y-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Folder names can only contain letters, numbers, underscores, and hyphens.
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum 50 characters. Cannot contain slashes or start/end with periods.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => {
                setCreateFolderModal({ isOpen: false });
                setNewFolderName('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={createFolder}
              disabled={operationLoading || !newFolderName.trim()}
              className="btn-primary"
            >
              {operationLoading ? (
                'Creating...'
              ) : (
                'Create Folder'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModal.isOpen}
        onClose={() => {
          setRenameModal({ isOpen: false, item: null });
          setNewItemName('');
        }}
        title={`Rename ${renameModal.item?.type === 'folder' ? 'Folder' : 'File'}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-foreground">
              Current name: <span className="font-medium">{renameModal.item?.name}</span>
            </p>
          </div>
          
          {renameModal.item?.type === 'folder' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Folder Rename Operation</p>
                  <p className="text-sm text-amber-700">
                    This will move all files and subfolders to the new location. Large folders may take some time to process.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <InputField
            label="New Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Enter new name"
            maxLength={100}
            disabled={operationLoading}
            autoFocus
          />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {renameModal.item?.type === 'folder' 
                ? 'Folder names can only contain letters, numbers, underscores, and hyphens.'
                : 'File names can only contain letters, numbers, underscores, hyphens, and dots.'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum 100 characters. Cannot contain slashes.
            </p>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => {
                setRenameModal({ isOpen: false, item: null });
                setNewItemName('');
              }}
              disabled={operationLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={renameItem}
              disabled={operationLoading || !newItemName.trim() || newItemName === renameModal.item?.name}
              className="btn-primary"
            >
              {operationLoading ? (
                renameModal.item?.type === 'folder' ? 'Moving folder...' : 'Renaming...'
              ) : (
                'Rename'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Move Modal */}
      <Modal
        isOpen={moveModal.isOpen}
        onClose={() => {
          setMoveModal({ isOpen: false, item: null });
          setSelectedDestination('');
          setCreateFolderInMoveModal(false);
        }}
        title={`Move ${moveModal.item?.type === 'folder' ? 'Folder' : 'File'}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-foreground">
              Moving: <span className="font-medium">{moveModal.item?.name}</span>
            </p>
            {moveModal.item?.fullPath && (
              <p className="text-xs text-muted-foreground mt-1">
                From: {moveModal.item.fullPath.replace(userBasePath + '/', '') || 'My Public Images'}
              </p>
            )}
          </div>
          
          {moveModal.item?.type === 'folder' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Folder Move Operation</p>
                  <p className="text-sm text-amber-700">
                    This will move all files and subfolders to the new location. Large folders may take some time to process.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Destination Folder
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              disabled={operationLoading}
              className="input-field"
            >
              <option value="">Select destination...</option>
              {availableFolders
                .filter(folder => folder.path !== moveModal.item?.fullPath && !folder.path.startsWith(moveModal.item?.fullPath + '/'))
                .map(folder => (
                  <option key={folder.path} value={folder.path}>
                    {folder.name}
                  </option>
                ))}
            </select>
            
            {/* Create New Folder Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCreateFolderInMoveModal(true)}
                className="btn-secondary btn-sm inline-flex items-center"
                disabled={operationLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Folder Here
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Can't find the right folder? Create a new one in the current location.
            </p>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => {
                setMoveModal({ isOpen: false, item: null });
                setSelectedDestination('');
                setCreateFolderInMoveModal(false);
              }}
              disabled={operationLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={moveItem}
              disabled={operationLoading || !selectedDestination}
              className="btn-primary"
            >
              {operationLoading ? (
                moveModal.item?.type === 'folder' ? 'Moving folder...' : 'Moving file...'
              ) : (
                `Move ${moveModal.item?.type === 'folder' ? 'Folder' : 'File'}`
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Folder in Move Context Modal */}
      <Modal
        isOpen={createFolderInMoveModal}
        onClose={() => {
          setCreateFolderInMoveModal(false);
          setNewFolderName('');
        }}
        title="Create New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
           <p className="text-sm text-blue-800">
              <strong>Creating folder in:</strong> {currentPath.replace(userBasePath + '/', '') || "My Public Images"}
           </p>
          </div>
          
          <InputField
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
          />
          <p className="text-sm text-muted-foreground">
            Folder names can only contain letters, numbers, underscores, and hyphens.
          </p>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              💡 After creating the folder, it will automatically appear in the destination list above.
            </p>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => {
                setCreateFolderInMoveModal(false);
                setNewFolderName('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={createFolder}
              disabled={operationLoading || !newFolderName.trim()}
              className="btn-primary"
            >
              {operationLoading ? (
                'Creating...'
              ) : (
                'Create Folder'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
