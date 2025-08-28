const admin = require('firebase-admin');

console.log('Admin Users Function: Starting initialization...');
console.log('Environment check:', {
  hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
  hasPrivateKeyId: !!process.env.FIREBASE_PRIVATE_KEY_ID,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasClientId: !!process.env.FIREBASE_CLIENT_ID,
  hasClientX509CertUrl: !!process.env.FIREBASE_CLIENT_X509_CERT_URL,
  nodeEnv: process.env.NODE_ENV
});

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  console.log('Admin Users Function: No existing Firebase apps, initializing...');
  
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

  console.log('Admin Users Function: Service account config (excluding private_key):', {
    type: serviceAccount.type,
    project_id: serviceAccount.project_id,
    private_key_id: serviceAccount.private_key_id,
    private_key_length: serviceAccount.private_key ? serviceAccount.private_key.length : 0,
    private_key_starts_with: serviceAccount.private_key ? serviceAccount.private_key.substring(0, 30) + '...' : 'undefined',
    client_email: serviceAccount.client_email,
    client_id: serviceAccount.client_id,
    client_x509_cert_url: serviceAccount.client_x509_cert_url
  });

  try {
    console.log('Admin Users Function: Attempting to initialize Firebase Admin SDK...');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || "admin-cms-ph"
    });
    
    console.log('Admin Users Function: Firebase Admin SDK initialized successfully');
  } catch (initError) {
    console.error('Admin Users Function: Failed to initialize Firebase Admin SDK:', initError);
    console.error('Admin Users Function: Init error details:', {
      code: initError.code,
      message: initError.message,
      stack: initError.stack
    });
    throw initError;
  }
} else {
  console.log('Admin Users Function: Firebase Admin SDK already initialized');
}

const db = admin.firestore();
const auth = admin.auth();

// Helper function to delete all documents in a collection
async function deleteCollection(collectionRef, batchSize = 100) {
  const query = collectionRef.limit(batchSize);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();
    
    if (snapshot.size === 0) {
      resolve();
      return;
    }
    
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Recurse on the next process tick to avoid blocking
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

exports.handler = async (event, context) => {
  console.log('Admin Users Function: Handler called', {
    method: event.httpMethod,
    path: event.path,
    hasAuthHeader: !!event.headers.authorization,
    timestamp: new Date().toISOString()
  });
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Admin Users Function: Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Admin Users Function: Processing request...');
    
    // Verify authentication
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Admin Users Function: Missing or invalid authorization header');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Admin Users Function: Attempting to verify token...');
    
    const decodedToken = await auth.verifyIdToken(token);
    console.log('Admin Users Function: Token verified successfully for user:', decodedToken.uid);
    
    if (!decodedToken) {
      console.log('Admin Users Function: Token verification returned null');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    const requestingUserId = decodedToken.uid;
    console.log('Admin Users Function: Checking admin privileges for user:', requestingUserId);

    // Verify the requesting user is an admin
    const adminSettingsRef = db.collection('users').doc(requestingUserId).collection('userSettings').doc('preferences');
    const adminSettingsDoc = await adminSettingsRef.get();
    
    console.log('Admin Users Function: Admin settings doc exists:', adminSettingsDoc.exists);
    if (adminSettingsDoc.exists) {
      const adminData = adminSettingsDoc.data();
      console.log('Admin Users Function: User role:', adminData.role);
    }
    
    if (!adminSettingsDoc.exists || adminSettingsDoc.data().role !== 'admin') {
      console.log('Admin Users Function: Access denied - user is not admin');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden: Admin access required' })
      };
    }

    console.log('Admin Users Function: Admin access confirmed, processing', event.httpMethod, 'request');
    const { httpMethod } = event;
    
    switch (httpMethod) {
      case 'GET': {
        console.log('Admin Users Function: Fetching users list...');
        // List all users with their settings
        try {
          // Use pagination to handle large user lists
          console.log('Admin Users Function: Calling auth.listUsers...');
          const listUsersResult = await auth.listUsers(1000); // Max 1000 users per request
          console.log('Admin Users Function: Retrieved', listUsersResult.users.length, 'users from Firebase Auth');
          const users = [];

          for (const userRecord of listUsersResult.users) {
            try {
              console.log('Admin Users Function: Processing user:', userRecord.uid);
              // Get user settings from Firestore
              const userSettingsRef = db.collection('users').doc(userRecord.uid).collection('userSettings').doc('preferences');
              const userSettingsDoc = await userSettingsRef.get();
              
              const settings = userSettingsDoc.exists ? userSettingsDoc.data() : {};
              console.log('Admin Users Function: User settings for', userRecord.uid, ':', {
                exists: userSettingsDoc.exists,
                role: settings.role,
                maxBlogs: settings.maxBlogs,
                totalStorageMB: settings.totalStorageMB
              });
              
              users.push({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                disabled: userRecord.disabled,
                emailVerified: userRecord.emailVerified,
                creationTime: userRecord.metadata.creationTime,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                role: settings.role || 'user',
                canManageMultipleBlogs: settings.canManageMultipleBlogs || false,
                currency: settings.currency || '$',
                maxBlogs: settings.maxBlogs || 1,
                totalStorageMB: settings.totalStorageMB || 100
              });
            } catch (error) {
              console.warn('Admin Users Function: Error fetching settings for user', userRecord.uid, ':', error);
              // Include user with default settings if we can't fetch their settings
              users.push({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                disabled: userRecord.disabled,
                emailVerified: userRecord.emailVerified,
                creationTime: userRecord.metadata.creationTime,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                role: 'user',
                canManageMultipleBlogs: false,
                currency: '$',
                maxBlogs: 1,
                totalStorageMB: 100
              });
            }
          }

          console.log('Admin Users Function: Successfully processed', users.length, 'users');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ users })
          };
        } catch (error) {
          console.error('Admin Users Function: Error in GET operation:', error);
          console.error('Admin Users Function: Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          
          // Provide more specific error information
          let errorMessage = 'Failed to list users';
          if (error.code === 'auth/insufficient-permission') {
            errorMessage = 'Insufficient permissions to list users. Check Firebase Admin SDK configuration.';
          } else if (error.code === 'auth/project-not-found') {
            errorMessage = 'Firebase project not found. Check project configuration.';
          }
          
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: errorMessage,
              code: error.code,
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
          };
        }
      }

      case 'PUT': {
        console.log('Admin Users Function: Processing PUT request...');
        // Update user settings
        const data = JSON.parse(event.body);
        console.log('Admin Users Function: PUT request data:', {
          userId: data.userId,
          role: data.role,
          maxBlogs: data.maxBlogs,
          totalStorageMB: data.totalStorageMB
        });
        const { userId, role, canManageMultipleBlogs, maxBlogs, totalStorageMB } = data;
        
        // Enhanced input validation
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID is required' })
          };
        }

        // Validate userId format
        if (typeof userId !== 'string' || !userId.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID must be a non-empty string' })
          };
        }
        // Validate role
        if (role && !['admin', 'user'].includes(role)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid role. Must be "admin" or "user"' })
          };
        }

        // Validate canManageMultipleBlogs
        if (canManageMultipleBlogs !== undefined && typeof canManageMultipleBlogs !== 'boolean') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'canManageMultipleBlogs must be a boolean' })
          };
        }

        // Validate maxBlogs
        if (maxBlogs !== undefined && (!Number.isInteger(maxBlogs) || maxBlogs < 1 || maxBlogs > 50)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'maxBlogs must be a positive integer between 1 and 50' })
          };
        }

        // Validate totalStorageMB
        if (totalStorageMB !== undefined && (!Number.isInteger(totalStorageMB) || totalStorageMB < 100 || totalStorageMB > 100000)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'totalStorageMB must be a positive integer between 100 and 100,000' })
          };
        }
        try {
          console.log('Admin Users Function: Verifying target user exists:', userId);
          // Verify the target user exists
          await auth.getUser(userId);
          console.log('Admin Users Function: Target user verified');

          console.log('Admin Users Function: Updating user settings in Firestore...');
          // Update user settings in Firestore
          const userSettingsRef = db.collection('users').doc(userId).collection('userSettings').doc('preferences');
          const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: requestingUserId
          };

          if (role !== undefined) {
            updateData.role = role;
          }

          if (canManageMultipleBlogs !== undefined) {
            updateData.canManageMultipleBlogs = canManageMultipleBlogs;
          }

          if (maxBlogs !== undefined) {
            updateData.maxBlogs = maxBlogs;
          }

          if (totalStorageMB !== undefined) {
            updateData.totalStorageMB = totalStorageMB;
          }
          
          console.log('Admin Users Function: Update data:', updateData);
          await userSettingsRef.set(updateData, { merge: true });
          console.log('Admin Users Function: User settings updated successfully');

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'User settings updated successfully'
            })
          };
        } catch (error) {
          console.error('Admin Users Function: Error in PUT operation:', error);
          
          if (error.code === 'auth/user-not-found') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'User not found' })
            };
          }

          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to update user settings' })
          };
        }
      }

      case 'DELETE': {
        console.log('Admin Users Function: Processing DELETE request...');
        // Delete user account and all associated data
        const data = JSON.parse(event.body);
        console.log('Admin Users Function: DELETE request data:', { userId: data.userId });
        const { userId } = data;
        
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID is required' })
          };
        }

        // Validate userId format
        if (typeof userId !== 'string' || !userId.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID must be a non-empty string' })
          };
        }

        // Prevent self-deletion
        if (userId === requestingUserId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Cannot delete your own account',
              code: 'SELF_DELETION_FORBIDDEN'
            })
          };
        }

        try {
          console.log('Admin Users Function: Verifying target user for deletion:', userId);
          // Verify the target user exists
          const userRecord = await auth.getUser(userId);
          
          console.log(`Admin ${requestingUserId} is deleting user ${userId} (${userRecord.email})`);

          // Track deletion progress for better error reporting
          const deletionProgress = {
            userRecord: userRecord,
            blogsDeleted: false,
            userSettingsDeleted: false,
            appSettingsDeleted: false,
            analyticsDeleted: false,
            storageDeleted: false,
            authDeleted: false,
            errors: []
          };
          // Step 1: Delete all user's blogs and their content/products
          try {
            const blogsRef = db.collection('users').doc(userId).collection('blogs');
            const blogsSnapshot = await blogsRef.get();
            
            for (const blogDoc of blogsSnapshot.docs) {
              const blogId = blogDoc.id;
              console.log(`Deleting blog ${blogId} for user ${userId}`);
              
              // Delete all content in this blog
              const contentRef = blogsRef.doc(blogId).collection('content');
              await deleteCollection(contentRef);
              
              // Delete all products in this blog
              const productsRef = blogsRef.doc(blogId).collection('products');
              await deleteCollection(productsRef);
              
              // Delete the blog document itself
              await blogDoc.ref.delete();
            }
            deletionProgress.blogsDeleted = true;
            console.log(`Successfully deleted ${blogsSnapshot.size} blogs for user ${userId}`);
          } catch (error) {
            console.error(`Error deleting blogs for user ${userId}:`, error);
            deletionProgress.errors.push(`Failed to delete blogs: ${error.message}`);
          }

          // Step 2: Delete user settings
          try {
            const userSettingsRef = db.collection('users').doc(userId).collection('userSettings').doc('preferences');
            const userSettingsDoc = await userSettingsRef.get();
            if (userSettingsDoc.exists) {
              await userSettingsRef.delete();
            }
            deletionProgress.userSettingsDeleted = true;
            console.log(`Successfully deleted user settings for user ${userId}`);
          } catch (error) {
            console.error(`Error deleting user settings for user ${userId}:`, error);
            deletionProgress.errors.push(`Failed to delete user settings: ${error.message}`);
          }

          // Step 3: Delete user's app settings
          try {
            const appSettingsRef = db.collection('users').doc(userId).collection('appSettings').doc('public');
            const appSettingsDoc = await appSettingsRef.get();
            if (appSettingsDoc.exists) {
              await appSettingsRef.delete();
            }
            deletionProgress.appSettingsDeleted = true;
            console.log(`Successfully deleted app settings for user ${userId}`);
          } catch (error) {
            console.error(`Error deleting app settings for user ${userId}:`, error);
            deletionProgress.errors.push(`Failed to delete app settings: ${error.message}`);
          }

          // Step 4: Delete user's analytics data (pageViews and interactions)
          try {
            // Note: These are global collections, so we filter by userId
            const pageViewsRef = db.collection('pageViews').where('userId', '==', userId);
            const pageViewsSnapshot = await pageViewsRef.get();
            if (!pageViewsSnapshot.empty) {
              const pageViewsBatch = db.batch();
              pageViewsSnapshot.docs.forEach(doc => {
                pageViewsBatch.delete(doc.ref);
              });
              await pageViewsBatch.commit();
              console.log(`Deleted ${pageViewsSnapshot.size} page views for user ${userId}`);
            }

            const interactionsRef = db.collection('interactions').where('userId', '==', userId);
            const interactionsSnapshot = await interactionsRef.get();
            if (!interactionsSnapshot.empty) {
              const interactionsBatch = db.batch();
              interactionsSnapshot.docs.forEach(doc => {
                interactionsBatch.delete(doc.ref);
              });
              await interactionsBatch.commit();
              console.log(`Deleted ${interactionsSnapshot.size} interactions for user ${userId}`);
            }
            deletionProgress.analyticsDeleted = true;
          } catch (error) {
            console.error(`Error deleting analytics data for user ${userId}:`, error);
            deletionProgress.errors.push(`Failed to delete analytics data: ${error.message}`);
          }

          // Step 5: Delete the main user document
          try {
            await db.collection('users').doc(userId).delete();
            console.log(`Successfully deleted main user document for user ${userId}`);
          } catch (error) {
            console.error(`Error deleting main user document for user ${userId}:`, error);
            deletionProgress.errors.push(`Failed to delete main user document: ${error.message}`);
          }

          // Step 6: Delete user's Firebase Storage files
          try {
            const bucket = admin.storage().bucket();
            let storageErrors = [];
            
            // Delete public images
            try {
              const [publicFiles] = await bucket.getFiles({ prefix: `users/${userId}/public_images/` });
              if (publicFiles.length > 0) {
                await bucket.deleteFiles({
                  prefix: `users/${userId}/public_images/`,
                  force: true
                });
                console.log(`Deleted ${publicFiles.length} public images for user ${userId}`);
              }
            } catch (storageError) {
              console.error(`Error deleting public images for user ${userId}:`, storageError);
              storageErrors.push(`Public images: ${storageError.message}`);
            }

            // Delete private files
            try {
              const [privateFiles] = await bucket.getFiles({ prefix: `users/${userId}/private/` });
              if (privateFiles.length > 0) {
                await bucket.deleteFiles({
                  prefix: `users/${userId}/private/`,
                  force: true
                });
                console.log(`Deleted ${privateFiles.length} private files for user ${userId}`);
              }
            } catch (storageError) {
              console.error(`Error deleting private files for user ${userId}:`, storageError);
              storageErrors.push(`Private files: ${storageError.message}`);
            }
            
            if (storageErrors.length === 0) {
              deletionProgress.storageDeleted = true;
            } else {
              deletionProgress.errors.push(`Storage cleanup issues: ${storageErrors.join(', ')}`);
            }
          } catch (error) {
            console.error(`Critical error during storage cleanup for user ${userId}:`, error);
            deletionProgress.errors.push(`Storage cleanup failed: ${error.message}`);
          }

          // Step 7: Delete user from Firebase Authentication (do this last)
          try {
            await auth.deleteUser(userId);
            deletionProgress.authDeleted = true;
            console.log(`Successfully deleted authentication record for user ${userId}`);
          } catch (error) {
            console.error(`Error deleting authentication record for user ${userId}:`, error);
            deletionProgress.errors.push(`Failed to delete authentication record: ${error.message}`);
          }
          
          // Generate comprehensive deletion report
          const deletionSummary = {
            userId,
            userEmail: userRecord.email,
            blogsDeleted: deletionProgress.blogsDeleted,
            userSettingsDeleted: deletionProgress.userSettingsDeleted,
            appSettingsDeleted: deletionProgress.appSettingsDeleted,
            analyticsDeleted: deletionProgress.analyticsDeleted,
            storageDeleted: deletionProgress.storageDeleted,
            authDeleted: deletionProgress.authDeleted,
            errors: deletionProgress.errors,
            partialDeletion: deletionProgress.errors.length > 0,
            completedSteps: [
              deletionProgress.blogsDeleted && 'Blogs and content',
              deletionProgress.userSettingsDeleted && 'User settings',
              deletionProgress.appSettingsDeleted && 'App settings',
              deletionProgress.analyticsDeleted && 'Analytics data',
              deletionProgress.storageDeleted && 'Storage files',
              deletionProgress.authDeleted && 'Authentication record'
            ].filter(Boolean)
          };
          
          console.log(`User deletion completed for ${userId}:`, deletionSummary);
          
          if (deletionProgress.errors.length === 0) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                success: true,
                message: 'User and all associated data deleted successfully',
                ...deletionSummary
              })
            };
          } else {
            // Partial deletion occurred
            return {
              statusCode: 207, // Multi-Status - indicates partial success
              headers,
              body: JSON.stringify({ 
                success: false,
                message: `User deletion completed with ${deletionProgress.errors.length} error(s)`,
                warning: 'Some data may not have been completely removed',
                ...deletionSummary
              })
            };
          }
        } catch (error) {
          console.error('Error during user deletion:', error);
          
          // Provide more specific error information
          let errorDetails = {
            code: error.code,
            message: error.message,
            userId,
            userEmail: userRecord?.email || 'Unknown'
          };
          
          if (error.code === 'auth/user-not-found') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ 
                error: 'User not found',
                details: errorDetails
              })
            };
          }
          
          if (error.code === 'auth/insufficient-permission') {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({ 
                error: 'Insufficient permissions to delete user',
                message: 'The Firebase Admin SDK service account may lack necessary permissions',
                recommendation: 'Check Firebase IAM roles for the service account',
                details: errorDetails
              })
            };
          }

          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'User deletion failed',
              message: 'An error occurred during the deletion process',
              details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
              recommendation: 'Check server logs for detailed error information'
            })
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
    console.error('Admin Users Function: Unhandled error:', error);
    console.error('Admin Users Function: Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Provide more detailed error information
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'Authentication token expired';
      statusCode = 401;
    } else if (error.code === 'auth/id-token-revoked') {
      errorMessage = 'Authentication token revoked';
      statusCode = 401;
    } else if (error.code === 'auth/invalid-id-token') {
      errorMessage = 'Invalid authentication token';
      statusCode = 401;
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};