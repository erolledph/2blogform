import React, { useState, useEffect } from 'react';
import { ref, listAll, getMetadata, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { storageService } from '@/services/storageService';
import DataTable from '@/components/shared/DataTable';
import LoadingButton from '@/components/shared/LoadingButton';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import Modal from '@/components/shared/Modal';
import ImageUploader from '@/components/shared/ImageUploader';
import InputField from '@/components/shared/InputField';
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
  }, [currentPath, userBasePath]);

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

    if (!/^[a-zA-Z0-9_-]+$/.test(newFolderName)) {
      toast.error('Folder name can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    const originalItems = [...items];
    const folderPath = `${currentPath}/${newFolderName.trim()}`;
    
    // Optimistic UI update - add folder immediately
    const newFolder = {
      id: folderPath,
      name: newFolderName.trim(),
      fullPath: folderPath,
      type: 'folder',
      size: 0,
      timeCreated: null
    };
    const updatedItems = [...items, newFolder].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    setItems(updatedItems);
    try {
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
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(error.message || 'Failed to create folder');
      setItems(originalItems); // Rollback on error
    } finally {
      // No need to set loading false since we're not using page-level loading
    }
  };

  const renameItem = async () => {
    if (!newItemName.trim() || !renameModal.item) {
      toast.error('New name is required');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(newItemName)) {
      toast.error('Name can only contain letters, numbers, underscores, hyphens, and dots');
      return;
    }

    const originalItems = [...items];
    const item = renameModal.item;
    
    // Optimistic UI update
    const updatedItems = items.map(currentItem => 
      currentItem.id === item.id 
        ? { ...currentItem, name: newItemName.trim() }
        : currentItem
    );
    setItems(updatedItems);
    try {
      const token = await getAuthToken();

      if (item.type === 'file') {
        await storageService.renameFile(item.fullPath, newItemName.trim(), token);
      } else {
        // For folders, use the renameFolder function
        await storageService.renameFolder(item.fullPath, newItemName.trim(), token);
      }
      
      toast.success('Item renamed successfully');
      setRenameModal({ isOpen: false, item: null });
      setNewItemName('');
    } catch (error) {
      console.error('Error renaming item:', error);
      toast.error(error.message || 'Failed to rename item');
      setItems(originalItems); // Rollback on error
    } finally {
      // No need to set loading false since we're not using page-level loading
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

    const originalItems = [...items];
    const item = moveModal.item;
    
    // Optimistic UI update - remove item from current view
    const updatedItems = items.filter(currentItem => currentItem.id !== item.id);
    setItems(updatedItems);
    try {
      const token = await getAuthToken();

      if (item.type === 'file') {
        const destPath = `${selectedDestination}/${item.name}`;
        await storageService.moveFile(item.fullPath, destPath, token);
      } else {
        // For folders, use the moveFolder function
        await storageService.moveFolder(item.fullPath, selectedDestination, token);
      }
      
      toast.success('Item moved successfully');
      setMoveModal({ isOpen: false, item: null });
      setSelectedDestination('');
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(error.message || 'Failed to move item');
      setItems(originalItems); // Rollback on error
    } finally {
      // No need to set loading false since we're not using page-level loading
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
    const originalItems = [...items];
    
    // Optimistic UI update - remove item immediately
    const updatedItems = items.filter(currentItem => currentItem.id !== item.id);
    setItems(updatedItems);
    try {
      if (item.type === 'folder') {
        // Use server-side folder deletion
        const token = await getAuthToken();
        await storageService.deleteFile(item.fullPath, token, true);
        toast.success('Folder deleted successfully');
      } else {
        // Use server-side file deletion
        const token = await getAuthToken();
        await storageService.deleteFile(item.fullPath, token, false);
        toast.success('File deleted successfully');
      }
      
      setDeleteModal({ isOpen: false, item: null });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(`Failed to delete ${item.type}`);
      setItems(originalItems); // Rollback on error
    }
  };

  const handlePreview = (file) => {
    setPreviewModal({ isOpen: true, file });
  };

  const handleUploadSuccess = (uploadResult) => {
    // Optimistic UI update - add new file to items
    const newFile = {
      id: uploadResult.fullPath,
      name: uploadResult.fileName,
      fullPath: uploadResult.fullPath,
      type: 'file',
      size: uploadResult.size,
      contentType: 'image/' + uploadResult.fileName.split('.').pop(),
      timeCreated: new Date(),
      downloadURL: uploadResult.downloadURL
    };
    
    const updatedItems = [...items, newFile].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    setItems(updatedItems);
    
    setUploadModal({ isOpen: false });
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

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">File Storage</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-10 bg-muted animate-pulse rounded"></div>
            <div className="w-24 h-10 bg-muted animate-pulse rounded"></div>
            <div className="w-32 h-10 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card">
              <div className="card-content p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
                  </div>
                  <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="card">
          <div className="card-content p-0">
            <TableSkeleton rows={10} columns={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">File Storage</h1>
        </div>
        <div className="flex items-center space-x-4">
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

      {/* Breadcrumb Navigation */}

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
                <p className="text-sm text-green-600">of {currentUser?.totalStorageMB || 100} MB limit</p>
              </div>
              <HardDrive className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card border-purple-200 bg-purple-50">
          <div className="card-content p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Storage Usage</p>
                <p className="text-2xl font-bold text-purple-900">
                  {((storageStats.totalSize / 1024 / 1024) / (currentUser?.totalStorageMB || 100) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-purple-600">used</p>
              </div>
              <FileImage className="h-8 w-8 text-purple-600" />
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
              {currentPath && currentPath !== userBasePath ? 'Folder is empty' : 'No files in your storage'}
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              {currentPath && currentPath !== userBasePath
                ? 'This folder contains no files or subfolders.'
                : 'Upload some images through the content creation process or use the upload button to add files to your personal storage.'
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
          currentPath={currentPath === userBasePath ? null : currentPath}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          maxFileSize={10 * 1024 * 1024} // 10MB
          initialQuality={80}
          initialMaxWidth={1920}
          initialMaxHeight={1080}
        />
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
            autoFocus
          />
          <p className="text-sm text-muted-foreground">
            Folder names can only contain letters, numbers, underscores, and hyphens.
          </p>
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
              disabled={!newFolderName.trim()}
              className="btn-primary"
            >
              Create Folder
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
            disabled={loading}
            autoFocus
          />
          <p className="text-sm text-muted-foreground">
            Names can only contain letters, numbers, underscores, hyphens, and dots.
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => {
                setRenameModal({ isOpen: false, item: null });
                setNewItemName('');
              }}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={renameItem}
              disabled={loading || !newItemName.trim() || newItemName === renameModal.item?.name}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {renameModal.item?.type === 'folder' ? 'Moving folder...' : 'Renaming...'}
                </>
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
              disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={moveItem}
              disabled={loading || !selectedDestination}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {moveModal.item?.type === 'folder' ? 'Moving folder...' : 'Moving file...'}
                </>
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
              disabled={!newFolderName.trim()}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Folder
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
