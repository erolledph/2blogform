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
        const { operation, sourcePath, destPath, newName } = data;
        
        // Validate that paths are within user's storage space
        const userBasePath = `users/${userId}/`;
        if (!sourcePath.startsWith(userBasePath)) {
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
              const placeholderPath = `${destPath}/.placeholder`;
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
        const { filePath } = data;
        
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
          const file = bucket.file(filePath);
          await file.delete();
          
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
            body: JSON.stringify({ error: `Failed to delete file: ${error.message}` })
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
    console.error('Admin storage function error:', error);
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