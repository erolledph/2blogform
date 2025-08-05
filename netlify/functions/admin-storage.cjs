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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || "admin-cms-ph"
  });
}

const bucket = admin.storage().bucket();
const auth = admin.auth();

// Helper function to recursively delete all files and folders in a path
async function deleteFolderRecursive(folderPath) {
  try {
    const [files] = await bucket.getFiles({ prefix: folderPath });
    
    if (files.length === 0) {
      console.log(`No files found in folder: ${folderPath}`);
      return;
    }
    
    // Delete all files in batches
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const deletePromises = batch.map(file => file.delete());
      await Promise.all(deletePromises);
      console.log(`Deleted batch of ${batch.length} files from ${folderPath}`);
    }
    
    console.log(`Successfully deleted all files in folder: ${folderPath}`);
  } catch (error) {
    console.error(`Error deleting folder ${folderPath}:`, error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
}

// Helper function to recursively move all files and folders from source to destination
async function moveFolderRecursive(sourcePath, destPath) {
  try {
    const [files] = await bucket.getFiles({ prefix: sourcePath });
    
    if (files.length === 0) {
      console.log(`No files found in source folder: ${sourcePath}`);
      return;
    }
    
    // Move all files
    for (const file of files) {
      const relativePath = file.name.replace(sourcePath, '');
      const newPath = destPath + relativePath;
      
      try {
        // Copy to new location
        await file.copy(bucket.file(newPath));
        // Delete from old location
        await file.delete();
        console.log(`Moved file: ${file.name} -> ${newPath}`);
      } catch (error) {
        console.error(`Error moving file ${file.name}:`, error);
        throw new Error(`Failed to move file ${file.name}: ${error.message}`);
      }
    }
    
    console.log(`Successfully moved all files from ${sourcePath} to ${destPath}`);
  } catch (error) {
    console.error(`Error moving folder from ${sourcePath} to ${destPath}:`, error);
    throw new Error(`Failed to move folder: ${error.message}`);
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

  try {
    // Verify authentication
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    if (!decodedToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    const userId = decodedToken.uid;
    const { httpMethod } = event;
    
    switch (httpMethod) {
      case 'POST': {
        const data = JSON.parse(event.body);
        const { operation, sourcePath, destPath, newName, isFolder } = data;
        
        // Validate that paths are within user's storage space
        const userBasePath = `users/${userId}/`;
        if (sourcePath && !sourcePath.startsWith(userBasePath)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied: Invalid source path' })
          };
        }
        
        if (destPath && !destPath.startsWith(userBasePath)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied: Invalid destination path' })
          };
        }

        switch (operation) {
          case 'copyFile': {
            if (!sourcePath || !destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source and destination paths are required' })
              };
            }

            try {
              const sourceFile = bucket.file(sourcePath);
              const destFile = bucket.file(destPath);
              
              // Copy the file
              await sourceFile.copy(destFile);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              };
            } catch (error) {
              console.error('Error copying file:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to copy file: ${error.message}` })
              };
            }
          }

          case 'moveFile': {
            if (!sourcePath || !destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source and destination paths are required' })
              };
            }

            try {
              const sourceFile = bucket.file(sourcePath);
              const destFile = bucket.file(destPath);
              
              // Copy the file to new location
              await sourceFile.copy(destFile);
              
              // Delete the original file
              await sourceFile.delete();
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              };
            } catch (error) {
              console.error('Error moving file:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to move file: ${error.message}` })
              };
            }
          }

          case 'renameFile': {
            if (!sourcePath || !newName) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source path and new name are required' })
              };
            }

            try {
              const pathParts = sourcePath.split('/');
              pathParts[pathParts.length - 1] = newName;
              const newPath = pathParts.join('/');
              
              const sourceFile = bucket.file(sourcePath);
              const destFile = bucket.file(newPath);
              
              // Copy to new location with new name
              await sourceFile.copy(destFile);
              
              // Delete the original file
              await sourceFile.delete();
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              };
            } catch (error) {
              console.error('Error renaming file:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to rename file: ${error.message}` })
              };
            }
          }

          case 'moveFolder': {
            if (!sourcePath || !destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source and destination paths are required' })
              };
            }

            try {
              // Ensure source path ends with / for folder operations
              const normalizedSourcePath = sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';
              const normalizedDestPath = destPath.endsWith('/') ? destPath : destPath + '/';
              
              // Get folder name from source path
              const folderName = sourcePath.split('/').pop();
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
              await moveFolderRecursive(normalizedSourcePath, finalDestPath);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              };
            } catch (error) {
              console.error('Error moving folder:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to move folder: ${error.message}` })
              };
            }
          }

          case 'renameFolder': {
            if (!sourcePath || !newName) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Source path and new name are required' })
              };
            }

            try {
              // Validate new name
              if (!/^[a-zA-Z0-9_-]+$/.test(newName)) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ error: 'Folder name can only contain letters, numbers, underscores, and hyphens' })
                };
              }
              
              // Ensure source path ends with / for folder operations
              const normalizedSourcePath = sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';
              
              // Calculate new path
              const pathParts = normalizedSourcePath.split('/').filter(Boolean);
              pathParts[pathParts.length - 1] = newName;
              const newPath = pathParts.join('/') + '/';
              
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
              await moveFolderRecursive(normalizedSourcePath, newPath);
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              };
            } catch (error) {
              console.error('Error renaming folder:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to rename folder: ${error.message}` })
              };
            }
          }

          case 'createFolder': {
            if (!destPath) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Destination path is required' })
              };
            }

            try {
              // Create a placeholder file in the new folder
              const normalizedDestPath = destPath.endsWith('/') ? destPath : destPath + '/';
              const placeholderPath = `${normalizedDestPath}.placeholder`;
              const placeholderFile = bucket.file(placeholderPath);
              
              await placeholderFile.save('', {
                metadata: {
                  contentType: 'text/plain'
                }
              });
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
              };
            } catch (error) {
              console.error('Error creating folder:', error);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Failed to create folder: ${error.message}` })
              };
            }
          }

          default:
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Invalid operation' })
            };
        }
      }

      case 'DELETE': {
        const data = JSON.parse(event.body);
        const { filePath, isFolder } = data;
        
        if (!filePath) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'File path is required' })
          };
        }

        // Validate that path is within user's storage space
        const userBasePath = `users/${userId}/`;
        if (!filePath.startsWith(userBasePath)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied: Invalid file path' })
          };
        }

        try {
          if (isFolder) {
            // Delete folder and all its contents
            const normalizedPath = filePath.endsWith('/') ? filePath : filePath + '/';
            await deleteFolderRecursive(normalizedPath);
          } else {
            // Delete single file
            const file = bucket.file(filePath);
            await file.delete();
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
          };
        } catch (error) {
          console.error('Error deleting file:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Failed to delete ${isFolder ? 'folder' : 'file'}: ${error.message}` })
          };
        }
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
