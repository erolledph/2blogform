const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "admin-cms-ph",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@admin-cms-ph.iam.gserviceaccount.com",
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || "admin-cms-ph",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "admin-cms-ph.firebasestorage.app"
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (initError) {
    console.error('Failed to initialize Firebase Admin SDK:', initError);
    throw initError;
  }
}

const bucket = admin.storage().bucket();
const auth = admin.auth();

// Enhanced validation function for paths
function validateUserPath(path, userId, operation = 'access') {
  console.log(`Validating path for ${operation}:`, { path, userId });
  
  if (!path || typeof path !== 'string') {
    throw new Error('Path must be a non-empty string');
  }
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID must be a non-empty string');
  }
  
  const userBasePath = `users/${userId}/`;
  
  if (!path.startsWith(userBasePath)) {
    console.error(`Path validation failed: ${path} does not start with ${userBasePath}`);
    throw new Error(`Access denied: Path must be within user storage space (${userBasePath})`);
  }
  
  // Additional validation for suspicious patterns
  if (path.includes('..') || path.includes('//')) {
    throw new Error('Invalid path: Contains suspicious patterns');
  }
  
  console.log(`Path validation successful for ${operation}`);
  return true;
}

// Enhanced function to recursively delete all files and folders in a path
async function deleteFolderRecursive(folderPath, userId) {
  console.log(`Starting recursive deletion of folder: ${folderPath}`);
  
  try {
    // Validate path before proceeding
    validateUserPath(folderPath, userId, 'delete');
    
    const [files] = await bucket.getFiles({ prefix: folderPath });
    
    if (files.length === 0) {
      console.log(`No files found in folder: ${folderPath}`);
      return { deletedCount: 0, errors: [] };
    }
    
    console.log(`Found ${files.length} files to delete in ${folderPath}`);
    
    // Delete all files in batches with enhanced error handling
    const batchSize = 50; // Reduced batch size for better reliability
    const errors = [];
    let deletedCount = 0;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(`Processing deletion batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${batch.length} files)`);
      
      const deletePromises = batch.map(async (file) => {
        try {
          await file.delete();
          deletedCount++;
          console.log(`Successfully deleted: ${file.name}`);
          return { success: true, file: file.name };
        } catch (error) {
          console.error(`Failed to delete file ${file.name}:`, error);
          errors.push({ file: file.name, error: error.message });
          return { success: false, file: file.name, error: error.message };
        }
      });
      
      await Promise.all(deletePromises);
      
      // Add a small delay between batches to prevent overwhelming the API
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Folder deletion completed: ${deletedCount} files deleted, ${errors.length} errors`);
    
    return { deletedCount, errors };
  } catch (error) {
    console.error(`Error in deleteFolderRecursive for ${folderPath}:`, error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
}

// Enhanced function to recursively move all files and folders from source to destination
async function moveFolderRecursive(sourcePath, destPath, userId) {
  console.log(`Starting recursive move from ${sourcePath} to ${destPath}`);
  
  try {
    // Validate both paths
    validateUserPath(sourcePath, userId, 'move source');
    validateUserPath(destPath, userId, 'move destination');
    
    const [files] = await bucket.getFiles({ prefix: sourcePath });
    
    if (files.length === 0) {
      console.log(`No files found in source folder: ${sourcePath}`);
      return { movedCount: 0, errors: [] };
    }
    
    console.log(`Found ${files.length} files to move from ${sourcePath} to ${destPath}`);
    
    const errors = [];
    let movedCount = 0;
    
    // Process files in smaller batches to prevent timeouts
    const batchSize = 20; // Smaller batch size for move operations
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(`Processing move batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${batch.length} files)`);
      
      for (const file of batch) {
        try {
          const relativePath = file.name.replace(sourcePath, '');
          const newPath = destPath + relativePath;
          
          console.log(`Moving file: ${file.name} -> ${newPath}`);
          
          // Validate the new path
          validateUserPath(newPath, userId, 'move destination file');
          
          // Copy to new location
          const destFile = bucket.file(newPath);
          await file.copy(destFile);
          console.log(`Successfully copied: ${file.name} -> ${newPath}`);
          
          // Delete from old location
          await file.delete();
          console.log(`Successfully deleted original: ${file.name}`);
          
          movedCount++;
        } catch (error) {
          console.error(`Error moving file ${file.name}:`, error);
          errors.push({ file: file.name, error: error.message });
        }
      }
      
      // Add delay between batches
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Folder move completed: ${movedCount} files moved, ${errors.length} errors`);
    
    return { movedCount, errors };
  } catch (error) {
    console.error(`Error in moveFolderRecursive from ${sourcePath} to ${destPath}:`, error);
    throw new Error(`Failed to move folder: ${error.message}`);
  }
}

// Enhanced function to create a folder with better error handling
async function createFolderSafe(folderPath, userId) {
  console.log(`Creating folder: ${folderPath}`);
  
  try {
    // Validate path
    validateUserPath(folderPath, userId, 'create folder');
    
    // Ensure path ends with /
    const normalizedPath = folderPath.endsWith('/') ? folderPath : folderPath + '/';
    
    // Check if folder already exists
    const [existingFiles] = await bucket.getFiles({ prefix: normalizedPath, maxResults: 1 });
    if (existingFiles.length > 0) {
      throw new Error('A folder with this name already exists');
    }
    
    // Create a placeholder file in the new folder
    const placeholderPath = `${normalizedPath}.placeholder`;
    const placeholderFile = bucket.file(placeholderPath);
    
    console.log(`Creating placeholder file: ${placeholderPath}`);
    
    await placeholderFile.save('', {
      metadata: {
        contentType: 'text/plain',
        customMetadata: {
          createdBy: userId,
          createdAt: new Date().toISOString(),
          purpose: 'folder-placeholder'
        }
      }
    });
    
    console.log(`Successfully created folder: ${normalizedPath}`);
    return { success: true, path: normalizedPath };
  } catch (error) {
    console.error(`Error creating folder ${folderPath}:`, error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  console.log(`Storage function called: ${event.httpMethod} ${event.path}`);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));

  try {
    // Verify authentication
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' })
      };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token || token.trim() === '') {
      console.error('Empty authentication token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Empty authentication token' })
      };
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
      console.log(`Authentication successful for user: ${decodedToken.uid}`);
    } catch (authError) {
      console.error('Token verification failed:', authError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid authentication token',
          details: authError.message 
        })
      };
    }

    if (!decodedToken || !decodedToken.uid) {
      console.error('Invalid decoded token structure');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token: Missing user ID' })
      };
    }

    const userId = decodedToken.uid;
    const { httpMethod } = event;
    
    console.log(`Processing ${httpMethod} request for user: ${userId}`);

    switch (httpMethod) {
      case 'POST': {
        let data;
        try {
          data = JSON.parse(event.body || '{}');
          console.log('Parsed request data:', JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.error('Failed to parse request body:', parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Invalid JSON in request body',
              details: parseError.message 
            })
          };
        }

        const { operation, sourcePath, destPath, newName, isFolder } = data;
        
        // Validate operation
        if (!operation || typeof operation !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Operation is required and must be a string' })
          };
        }

        console.log(`Processing operation: ${operation}`);

        switch (operation) {
          case 'copyFile': {
            if (!sourcePath || !destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source and destination paths are required for copyFile operation' })
              };
            }

            try {
              validateUserPath(sourcePath, userId, 'copy source');
              validateUserPath(destPath, userId, 'copy destination');
              
              console.log(`Copying file from ${sourcePath} to ${destPath}`);
              
              const sourceFile = bucket.file(sourcePath);
              const destFile = bucket.file(destPath);
              
              // Check if source file exists
              const [sourceExists] = await sourceFile.exists();
              if (!sourceExists) {
                throw new Error('Source file does not exist');
              }
              
              // Copy the file
              await sourceFile.copy(destFile);
              console.log(`Successfully copied file from ${sourcePath} to ${destPath}`);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  success: true,
                  message: 'File copied successfully',
                  sourcePath,
                  destPath
                })
              };
            } catch (error) {
              console.error('Error copying file:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  error: `Failed to copy file: ${error.message}`,
                  details: error.stack,
                  operation: 'copyFile',
                  sourcePath,
                  destPath
                })
              };
            }
          }

          case 'moveFile': {
            if (!sourcePath || !destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source and destination paths are required for moveFile operation' })
              };
            }

            try {
              validateUserPath(sourcePath, userId, 'move source');
              validateUserPath(destPath, userId, 'move destination');
              
              console.log(`Moving file from ${sourcePath} to ${destPath}`);
              
              const sourceFile = bucket.file(sourcePath);
              const destFile = bucket.file(destPath);
              
              // Check if source file exists
              const [sourceExists] = await sourceFile.exists();
              if (!sourceExists) {
                throw new Error('Source file does not exist');
              }
              
              // Check if destination already exists
              const [destExists] = await destFile.exists();
              if (destExists) {
                throw new Error('Destination file already exists');
              }
              
              // Copy the file to new location
              await sourceFile.copy(destFile);
              console.log(`Successfully copied file to destination: ${destPath}`);
              
              // Delete the original file
              await sourceFile.delete();
              console.log(`Successfully deleted original file: ${sourcePath}`);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  success: true,
                  message: 'File moved successfully',
                  sourcePath,
                  destPath
                })
              };
            } catch (error) {
              console.error('Error moving file:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  error: `Failed to move file: ${error.message}`,
                  details: error.stack,
                  operation: 'moveFile',
                  sourcePath,
                  destPath
                })
              };
            }
          }

          case 'renameFile': {
            if (!sourcePath || !newName) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source path and new name are required for renameFile operation' })
              };
            }

            try {
              validateUserPath(sourcePath, userId, 'rename source');
              
              // Validate new name
              if (typeof newName !== 'string' || !newName.trim()) {
                throw new Error('New name must be a non-empty string');
              }
              
              if (!/^[a-zA-Z0-9_.-]+$/.test(newName)) {
                throw new Error('File name can only contain letters, numbers, underscores, hyphens, and dots');
              }
              
              console.log(`Renaming file ${sourcePath} to ${newName}`);
              
              const pathParts = sourcePath.split('/');
              pathParts[pathParts.length - 1] = newName.trim();
              const newPath = pathParts.join('/');
              
              validateUserPath(newPath, userId, 'rename destination');
              
              const sourceFile = bucket.file(sourcePath);
              const destFile = bucket.file(newPath);
              
              // Check if source file exists
              const [sourceExists] = await sourceFile.exists();
              if (!sourceExists) {
                throw new Error('Source file does not exist');
              }
              
              // Check if destination already exists
              const [destExists] = await destFile.exists();
              if (destExists) {
                throw new Error('A file with this name already exists');
              }
              
              // Copy to new location with new name
              await sourceFile.copy(destFile);
              console.log(`Successfully copied file to new name: ${newPath}`);
              
              // Delete the original file
              await sourceFile.delete();
              console.log(`Successfully deleted original file: ${sourcePath}`);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  success: true,
                  message: 'File renamed successfully',
                  sourcePath,
                  newPath,
                  newName
                })
              };
            } catch (error) {
              console.error('Error renaming file:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  error: `Failed to rename file: ${error.message}`,
                  details: error.stack,
                  operation: 'renameFile',
                  sourcePath,
                  newName
                })
              };
            }
          }

          case 'moveFolder': {
            if (!sourcePath || !destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source and destination paths are required for moveFolder operation' })
              };
            }

            try {
              validateUserPath(sourcePath, userId, 'move folder source');
              validateUserPath(destPath, userId, 'move folder destination');
              
              // Ensure source path ends with / for folder operations
              const normalizedSourcePath = sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';
              const normalizedDestPath = destPath.endsWith('/') ? destPath : destPath + '/';
              
              console.log(`Moving folder from ${normalizedSourcePath} to ${normalizedDestPath}`);
              
              // Get folder name from source path
              const folderName = sourcePath.split('/').filter(Boolean).pop();
              if (!folderName) {
                throw new Error('Invalid source path: Cannot determine folder name');
              }
              
              const finalDestPath = `${normalizedDestPath}${folderName}/`;
              
              // Prevent moving to itself or a subdirectory
              if (finalDestPath === normalizedSourcePath) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ error: 'Cannot move folder to the same location' })
                };
              }
              
              if (finalDestPath.startsWith(normalizedSourcePath)) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ error: 'Cannot move folder into its own subdirectory' })
                };
              }
              
              // Check if destination already exists
              const [existingFiles] = await bucket.getFiles({ prefix: finalDestPath, maxResults: 1 });
              if (existingFiles.length > 0) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ error: 'A folder with this name already exists in the destination' })
                };
              }
              
              // Move the folder
              const result = await moveFolderRecursive(normalizedSourcePath, finalDestPath, userId);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  success: true,
                  message: 'Folder moved successfully',
                  sourcePath: normalizedSourcePath,
                  destPath: finalDestPath,
                  movedCount: result.movedCount,
                  errors: result.errors
                })
              };
            } catch (error) {
              console.error('Error moving folder:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  error: `Failed to move folder: ${error.message}`,
                  details: error.stack,
                  operation: 'moveFolder',
                  sourcePath,
                  destPath
                })
              };
            }
          }

          case 'renameFolder': {
            if (!sourcePath || !newName) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source path and new name are required for renameFolder operation' })
              };
            }

            try {
              validateUserPath(sourcePath, userId, 'rename folder source');
              
              // Validate new name
              if (typeof newName !== 'string' || !newName.trim()) {
                throw new Error('New name must be a non-empty string');
              }
              
              if (!/^[a-zA-Z0-9_-]+$/.test(newName)) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ error: 'Folder name can only contain letters, numbers, underscores, and hyphens' })
                };
              }
              
              console.log(`Renaming folder ${sourcePath} to ${newName}`);
              
              // Ensure source path ends with / for folder operations
              const normalizedSourcePath = sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';
              
              // Calculate new path
              const pathParts = normalizedSourcePath.split('/').filter(Boolean);
              pathParts[pathParts.length - 1] = newName.trim();
              const newPath = pathParts.join('/') + '/';
              
              validateUserPath(newPath, userId, 'rename folder destination');
              
              // Check if destination already exists
              const [existingFiles] = await bucket.getFiles({ prefix: newPath, maxResults: 1 });
              if (existingFiles.length > 0) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ error: 'A folder with this name already exists' })
                };
              }
              
              // Move the folder to new name
              const result = await moveFolderRecursive(normalizedSourcePath, newPath, userId);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  success: true,
                  message: 'Folder renamed successfully',
                  sourcePath: normalizedSourcePath,
                  newPath,
                  newName,
                  movedCount: result.movedCount,
                  errors: result.errors
                })
              };
            } catch (error) {
              console.error('Error renaming folder:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  error: `Failed to rename folder: ${error.message}`,
                  details: error.stack,
                  operation: 'renameFolder',
                  sourcePath,
                  newName
                })
              };
            }
          }

          case 'createFolder': {
            if (!destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Destination path is required for createFolder operation' })
              };
            }

            try {
              const result = await createFolderSafe(destPath, userId);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  success: true,
                  message: 'Folder created successfully',
                  path: result.path
                })
              };
            } catch (error) {
              console.error('Error creating folder:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  error: `Failed to create folder: ${error.message}`,
                  details: error.stack,
                  operation: 'createFolder',
                  destPath
                })
              };
            }
          }

          default:
            console.error(`Invalid operation: ${operation}`);
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Invalid operation',
                validOperations: ['copyFile', 'moveFile', 'renameFile', 'moveFolder', 'renameFolder', 'createFolder']
              })
            };
        }
      }

      case 'DELETE': {
        let data;
        try {
          data = JSON.parse(event.body || '{}');
          console.log('Parsed delete request data:', JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.error('Failed to parse request body:', parseError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Invalid JSON in request body',
              details: parseError.message 
            })
          };
        }

        const { filePath, isFolder } = data;
        
        if (!filePath) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'File path is required for delete operation' })
          };
        }

        try {
          validateUserPath(filePath, userId, 'delete');
          
          console.log(`Deleting ${isFolder ? 'folder' : 'file'}: ${filePath}`);

          if (isFolder) {
            // Delete folder and all its contents
            const normalizedPath = filePath.endsWith('/') ? filePath : filePath + '/';
            const result = await deleteFolderRecursive(normalizedPath, userId);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                success: true,
                message: 'Folder deleted successfully',
                path: normalizedPath,
                deletedCount: result.deletedCount,
                errors: result.errors
              })
            };
          } else {
            // Delete single file
            const file = bucket.file(filePath);
            
            // Check if file exists
            const [fileExists] = await file.exists();
            if (!fileExists) {
              return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'File does not exist' })
              };
            }
            
            await file.delete();
            console.log(`Successfully deleted file: ${filePath}`);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                success: true,
                message: 'File deleted successfully',
                path: filePath
              })
            };
          }
        } catch (error) {
          console.error('Error deleting file/folder:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: `Failed to delete ${isFolder ? 'folder' : 'file'}: ${error.message}`,
              details: error.stack,
              operation: 'delete',
              filePath,
              isFolder
            })
          };
        }
      }

      default:
        console.error(`Method not allowed: ${httpMethod}`);
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ 
            error: 'Method not allowed',
            allowedMethods: ['POST', 'DELETE', 'OPTIONS']
          })
        };
    }
  } catch (error) {
    console.error('Unhandled error in storage function:', error);
    console.error('Error stack:', error.stack);
    console.error('Event details:', JSON.stringify({
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
      body: event.body ? event.body.substring(0, 500) : 'No body'
    }, null, 2));
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};
