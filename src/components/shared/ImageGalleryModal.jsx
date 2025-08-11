import React, { useState, useEffect } from 'react';
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import Modal from './Modal';
import SkeletonLoader from './SkeletonLoader';
import { GalleryImage } from './ProgressiveImage';
import { 
  Search, 
  Grid, 
  List, 
  Check, 
  Upload, 
  Folder, 
  ImageIcon, 
  ArrowLeft, 
  Home, 
  ChevronRight 
} from 'lucide-react';
import { formatBytes } from '@/utils/helpers';

export default function ImageGalleryModal({ 
  isOpen, 
  onClose, 
  onSelectImage, 
  onSelectMultiple,
  multiSelect = false,
  maxSelections = 5,
  title = "Select Image"
}) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]); // Combined folders and images
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [userBasePath, setUserBasePath] = useState('');

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
    if (isOpen && currentPath && userBasePath) {
      fetchItems();
    }
  }, [isOpen, currentPath, userBasePath]);

  const fetchItems = async () => {
    if (!currentPath) return;
    
    try {
      setLoading(true);
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
          ref: prefixRef
        });
      }
      
      // Process image files (items)
      const imagePromises = result.items
        .filter(itemRef => {
          // Only include image files
          const name = itemRef.name.toLowerCase();
          return name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/);
        })
        .map(async (itemRef) => {
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
      
      const imageFiles = (await Promise.all(imagePromises)).filter(Boolean);
      currentItems.push(...imageFiles);
      
      // Sort: folders first, then files, both alphabetically
      currentItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      setItems(currentItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
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
    setSearchTerm(''); // Clear search when navigating
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
    setSearchTerm('');
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
    setSearchTerm('');
  };

  const getBreadcrumbs = () => {
    if (!currentPath || !userBasePath) return [{ name: 'My Images', path: userBasePath }];
    
    if (currentPath === userBasePath) {
      return [{ name: 'My Images', path: userBasePath }];
    }
    
    // Get the relative path from user base path
    const relativePath = currentPath.replace(userBasePath + '/', '');
    const parts = relativePath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'My Images', path: userBasePath }];
    
    let currentBreadcrumbPath = userBasePath;
    parts.forEach(part => {
      currentBreadcrumbPath = `${currentBreadcrumbPath}/${part}`;
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath });
    });
    
    return breadcrumbs;
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate folders and images for display
  const folders = filteredItems.filter(item => item.type === 'folder');
  const images = filteredItems.filter(item => item.type === 'file');

  const handleImageSelect = (image) => {
    if (multiSelect) {
      setSelectedImages(prev => {
        const isSelected = prev.find(img => img.id === image.id);
        if (isSelected) {
          return prev.filter(img => img.id !== image.id);
        } else if (prev.length < maxSelections) {
          return [...prev, image];
        } else {
          return prev;
        }
      });
    } else {
      onSelectImage(image);
      onClose();
    }
  };

  const handleConfirmSelection = () => {
    if (multiSelect && onSelectMultiple) {
      onSelectMultiple(selectedImages);
    }
    onClose();
  };

  const isImageSelected = (image) => {
    return selectedImages.find(img => img.id === image.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex flex-col space-y-4">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm bg-muted/30 rounded-lg p-3">
            <button
              onClick={navigateToUserRoot}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Home className="h-4 w-4 mr-1" />
              My Images
            </button>
            {getBreadcrumbs().slice(1).map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => navigateToPath(crumb.path)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              {currentPath && currentPath !== userBasePath && (
                <button
                  onClick={navigateBack}
                  className="btn-secondary btn-sm inline-flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              )}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search folders and images..."
                    className="input-field pl-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Multi-select info */}
        {multiSelect && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Select up to {maxSelections} images. Currently selected: {selectedImages.length}
            </p>
          </div>
        )}

        {/* Content Area */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="space-y-6">
              <div>
                <div className="w-32 h-4 bg-muted animate-pulse rounded mb-3"></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonLoader key={index} type="image" className="aspect-square" />
                  ))}
                </div>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No folders or images found matching your search' : 'No folders or images in your storage'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload images through the content creation process or file storage page to see them here.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-6">
              {/* Folders Section */}
              {folders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Folders ({folders.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group cursor-pointer rounded-lg overflow-hidden border-2 border-border hover:border-blue-500 transition-all duration-200 bg-blue-50"
                        onClick={() => navigateToFolder(folder.fullPath)}
                      >
                        <div className="aspect-square flex items-center justify-center bg-blue-100">
                          <Folder className="h-12 w-12 text-blue-600" />
                        </div>
                        
                        {/* Folder name overlay */}
                        <div className="p-3 bg-white border-t border-blue-200">
                          <p className="text-sm font-medium text-blue-800 truncate">{folder.name}</p>
                          <p className="text-xs text-blue-600">Folder</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images Section */}
              {images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Images ({images.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((image) => {
                      const isSelected = isImageSelected(image);
                      return (
                        <div
                          key={image.id}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            isSelected 
                              ? 'border-primary shadow-lg' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleImageSelect(image)}
                        >
                          <GalleryImage
                            src={image.downloadURL}
                            alt={image.name}
                            className="aspect-square"
                            onLoad={() => console.log('Gallery image loaded:', image.name)}
                            onError={() => console.error('Gallery image failed:', image.name, image.downloadURL)}
                          />
                          
                          {/* Selection indicator */}
                          {multiSelect && (
                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected 
                                ? 'bg-primary border-primary' 
                                : 'bg-white border-gray-300 group-hover:border-primary'
                            }`}>
                              {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                            </div>
                          )}
                          
                          {/* Image info overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <p className="text-xs truncate">{image.name}</p>
                            <p className="text-xs text-gray-300">{formatBytes(image.size)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folders Section */}
              {folders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Folders ({folders.length})
                  </h4>
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center space-x-4 p-3 rounded-lg cursor-pointer transition-all duration-200 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                        onClick={() => navigateToFolder(folder.fullPath)}
                      >
                        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-100 rounded border border-blue-200">
                          <Folder className="h-6 w-6 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-800 truncate">{folder.name}</p>
                          <p className="text-xs text-blue-600">Folder</p>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-blue-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images Section */}
              {images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Images ({images.length})
                  </h4>
                  <div className="space-y-2">
                    {images.map((image) => {
                      const isSelected = isImageSelected(image);
                      return (
                        <div
                          key={image.id}
                          className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'bg-primary/10 border border-primary' 
                              : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                          }`}
                          onClick={() => handleImageSelect(image)}
                        >
                          <GalleryImage
                            src={image.downloadURL}
                            alt={image.name}
                            className="w-12 h-12 flex-shrink-0 rounded border border-border"
                            onLoad={() => console.log('List view image loaded:', image.name)}
                            onError={() => console.error('List view image failed:', image.name, image.downloadURL)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{image.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(image.size)} • {image.timeCreated.toLocaleDateString()}
                            </p>
                          </div>
                          
                          {multiSelect && (
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected 
                                ? 'bg-primary border-primary' 
                                : 'bg-white border-gray-300'
                            }`}>
                              {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {folders.length > 0 && `${folders.length} folder${folders.length !== 1 ? 's' : ''}`}
            {folders.length > 0 && images.length > 0 && ' • '}
            {images.length > 0 && `${images.length} image${images.length !== 1 ? 's' : ''}`}
            {folders.length === 0 && images.length === 0 && 'No items'}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            
            {multiSelect && selectedImages.length > 0 && (
              <button
                onClick={handleConfirmSelection}
                className="btn-primary"
              >
                Select {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
