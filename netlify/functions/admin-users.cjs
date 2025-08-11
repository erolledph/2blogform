const admin = require('firebase-admin');

// Enhanced logging utility
function logOperation(operation, details) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${operation}:`, JSON.stringify(details, null, 2));
}

function logError(operation, error, context = {}) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR in ${operation}:`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    context
  });
}

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
      projectId: process.env.FIREBASE_PROJECT_ID || "admin-cms-ph",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "admin-cms-ph.firebasestorage.app"
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
const bucket = admin.storage().bucket();

// Helper function to delete all documents in a collection
async function deleteCollection(collectionRef, batchSize = 100) {
  logOperation('deleteCollection', { path: collectionRef.path, batchSize });
  const query = collectionRef.limit(batchSize);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();
    logOperation('deleteQueryBatch', { documentsFound: snapshot.size });
    
    if (snapshot.size === 0) {
      logOperation('deleteQueryBatch', { status: 'completed', reason: 'no_more_documents' });
      resolve();
      return;
    }
    
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    logOperation('deleteQueryBatch', { deletedDocuments: snapshot.size, status: 'batch_committed' });
    
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

        // Additional validation for userId format
        if (userId.length < 10 || userId.length > 128) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid User ID format' })
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
          logOperation('userDeletion.start', { targetUserId: userId, requestingUserId });
          
          // Verify the target user exists
          const userRecord = await auth.getUser(userId);
          logOperation('userDeletion.userVerified', { 
            targetUserId: userId, 
            email: userRecord.email,
            disabled: userRecord.disabled,
            emailVerified: userRecord.emailVerified
          });
          
          console.log(`Admin ${requestingUserId} is deleting user ${userId} (${userRecord.email})`);

          // Track deletion progress
          const deletionProgress = {
            blogs: { attempted: 0, successful: 0, failed: 0 },
            content: { attempted: 0, successful: 0, failed: 0 },
            products: { attempted: 0, successful: 0, failed: 0 },
            settings: { attempted: 0, successful: 0, failed: 0 },
            analytics: { attempted: 0, successful: 0, failed: 0 },
            storage: { attempted: 0, successful: 0, failed: 0 },
            auth: { attempted: 0, successful: 0, failed: 0 }
          };

          // Step 1: Delete all user's blogs and their content/products
          logOperation('userDeletion.step1', { step: 'deleting_blogs_and_content' });
          const blogsRef = db.collection('users').doc(userId).collection('blogs');
          const blogsSnapshot = await blogsRef.get();
          deletionProgress.blogs.attempted = blogsSnapshot.size;
          
          for (const blogDoc of blogsSnapshot.docs) {
            const blogId = blogDoc.id;
            logOperation('userDeletion.deletingBlog', { blogId, userId });
            
            try {
              // Delete all content in this blog
              const contentRef = blogsRef.doc(blogId).collection('content');
              const contentSnapshot = await contentRef.get();
              deletionProgress.content.attempted += contentSnapshot.size;
              
              await deleteCollection(contentRef);
              deletionProgress.content.successful += contentSnapshot.size;
              logOperation('userDeletion.contentDeleted', { blogId, contentCount: contentSnapshot.size });
            } catch (error) {
              deletionProgress.content.failed++;
              logError('userDeletion.contentDeletion', error, { blogId, userId });
              // Continue with deletion even if content deletion fails
            }
            
            try {
              // Delete all products in this blog
              const productsRef = blogsRef.doc(blogId).collection('products');
              const productsSnapshot = await productsRef.get();
              deletionProgress.products.attempted += productsSnapshot.size;
              
              await deleteCollection(productsRef);
              deletionProgress.products.successful += productsSnapshot.size;
              logOperation('userDeletion.productsDeleted', { blogId, productsCount: productsSnapshot.size });
            } catch (error) {
              deletionProgress.products.failed++;
              logError('userDeletion.productsDeletion', error, { blogId, userId });
              // Continue with deletion even if products deletion fails
            }
            
            try {
              // Delete the blog document itself
              await blogDoc.ref.delete();
              deletionProgress.blogs.successful++;
              logOperation('userDeletion.blogDeleted', { blogId });
            } catch (error) {
              deletionProgress.blogs.failed++;
              logError('userDeletion.blogDeletion', error, { blogId, userId });
              // Continue with deletion even if blog deletion fails
            }
          }

          // Step 2: Delete user settings
          logOperation('userDeletion.step2', { step: 'deleting_user_settings' });
          deletionProgress.settings.attempted++;
          try {
          const userSettingsRef = db.collection('users').doc(userId).collection('userSettings').doc('preferences');
          const userSettingsDoc = await userSettingsRef.get();
          if (userSettingsDoc.exists) {
            await userSettingsRef.delete();
              deletionProgress.settings.successful++;
              logOperation('userDeletion.userSettingsDeleted', { userId });
            } else {
              logOperation('userDeletion.userSettingsNotFound', { userId });
          }
          } catch (error) {
            deletionProgress.settings.failed++;
            logError('userDeletion.userSettingsDeletion', error, { userId });
            // Continue with deletion even if settings deletion fails
          }

          // Step 3: Delete user's app settings
          logOperation('userDeletion.step3', { step: 'deleting_app_settings' });
          try {
          const appSettingsRef = db.collection('users').doc(userId).collection('appSettings').doc('public');
          const appSettingsDoc = await appSettingsRef.get();
          if (appSettingsDoc.exists) {
            await appSettingsRef.delete();
              logOperation('userDeletion.appSettingsDeleted', { userId });
            } else {
              logOperation('userDeletion.appSettingsNotFound', { userId });
          }
          } catch (error) {
            logError('userDeletion.appSettingsDeletion', error, { userId });
            // Continue with deletion even if app settings deletion fails
          }

          // Step 4: Delete user's analytics data (pageViews and interactions)
          logOperation('userDeletion.step4', { step: 'deleting_analytics_data' });
          // Note: These are global collections, so we filter by userId
          try {
            const pageViewsRef = db.collection('pageViews').where('userId', '==', userId);
            const pageViewsSnapshot = await pageViewsRef.get();
            deletionProgress.analytics.attempted += pageViewsSnapshot.size;
            
            if (!pageViewsSnapshot.empty) {
              const pageViewsBatch = db.batch();
              pageViewsSnapshot.docs.forEach(doc => {
                pageViewsBatch.delete(doc.ref);
              });
              await pageViewsBatch.commit();
              deletionProgress.analytics.successful += pageViewsSnapshot.size;
              logOperation('userDeletion.pageViewsDeleted', { userId, count: pageViewsSnapshot.size });
            } else {
              logOperation('userDeletion.noPageViewsFound', { userId });
            }
          } catch (error) {
            deletionProgress.analytics.failed++;
            logError('userDeletion.pageViewsDeletion', error, { userId });
            // Continue with deletion even if pageViews deletion fails
          }

          try {
            const interactionsRef = db.collection('interactions').where('userId', '==', userId);
            const interactionsSnapshot = await interactionsRef.get();
            
            if (!interactionsSnapshot.empty) {
              const interactionsBatch = db.batch();
              interactionsSnapshot.docs.forEach(doc => {
                interactionsBatch.delete(doc.ref);
              });
              await interactionsBatch.commit();
              logOperation('userDeletion.interactionsDeleted', { userId, count: interactionsSnapshot.size });
            } else {
              logOperation('userDeletion.noInteractionsFound', { userId });
            }
          } catch (error) {
            logError('userDeletion.interactionsDeletion', error, { userId });
            // Continue with deletion even if interactions deletion fails
          }

          // Step 5: Delete the main user document
          logOperation('userDeletion.step5', { step: 'deleting_main_user_document' });
          try {
            await db.collection('users').doc(userId).delete();
            logOperation('userDeletion.userDocumentDeleted', { userId });
          } catch (error) {
            logError('userDeletion.userDocumentDeletion', error, { userId });
            // Continue with deletion even if user document deletion fails
          }

          // Step 6: Delete user's Firebase Storage files
          logOperation('userDeletion.step6', { step: 'deleting_storage_files' });
          deletionProgress.storage.attempted = 2; // public_images and private folders
          
          try {
            // Delete public images
            const publicImagesResult = await bucket.deleteFiles({
              prefix: `users/${userId}/public_images/`,
              force: true
            });
            deletionProgress.storage.successful++;
            logOperation('userDeletion.publicImagesDeleted', { 
              userId, 
              deletedFiles: publicImagesResult[0]?.length || 0 
            });
          } catch (storageError) {
            deletionProgress.storage.failed++;
            logError('userDeletion.publicImagesDeletion', storageError, { userId });
            // Continue with deletion even if storage cleanup fails
          }

          try {
            // Delete private files
            const privateFilesResult = await bucket.deleteFiles({
              prefix: `users/${userId}/private/`,
              force: true
            });
            logOperation('userDeletion.privateFilesDeleted', { 
              userId, 
              deletedFiles: privateFilesResult[0]?.length || 0 
            });
          } catch (storageError) {
            logError('userDeletion.privateFilesDeletion', storageError, { userId });
            // Continue with deletion even if storage cleanup fails
          }

          // Step 7: Delete user from Firebase Authentication (do this last)
          logOperation('userDeletion.step7', { step: 'deleting_firebase_auth_user' });
          deletionProgress.auth.attempted++;
          try {
          await auth.deleteUser(userId);
            deletionProgress.auth.successful++;
            logOperation('userDeletion.authUserDeleted', { userId });
          } catch (authError) {
            deletionProgress.auth.failed++;
            logError('userDeletion.authUserDeletion', authError, { userId });
            
            // Auth deletion failure is critical - we should report this
            if (authError.code === 'auth/user-not-found') {
              logOperation('userDeletion.authUserNotFound', { 
                userId, 
                note: 'User may have been already deleted from Auth but data remained' 
              });
            } else {
              // Re-throw auth errors as they're critical
              throw authError;
            }
          }
          
          // Log final deletion summary
          logOperation('userDeletion.completed', {
            targetUserId: userId,
            targetUserEmail: userRecord.email,
            requestingUserId,
            progress: deletionProgress,
            totalAttempted: Object.values(deletionProgress).reduce((sum, cat) => sum + cat.attempted, 0),
            totalSuccessful: Object.values(deletionProgress).reduce((sum, cat) => sum + cat.successful, 0),
            totalFailed: Object.values(deletionProgress).reduce((sum, cat) => sum + cat.failed, 0)
          });
          
          const totalFailed = Object.values(deletionProgress).reduce((sum, cat) => sum + cat.failed, 0);
          const totalAttempted = Object.values(deletionProgress).reduce((sum, cat) => sum + cat.attempted, 0);
          
          console.log(`User deletion completed: ${userId} (${userRecord.email})`);
          console.log(`Deletion summary: ${totalAttempted - totalFailed}/${totalAttempted} operations successful`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'User and all associated data deleted successfully',
              deletedUserId: userId,
              deletedUserEmail: userRecord.email,
              deletionSummary: {
                totalOperations: totalAttempted,
                successfulOperations: totalAttempted - totalFailed,
                failedOperations: totalFailed,
                details: deletionProgress
              }
            })
          };
        } catch (error) {
          logError('userDeletion.criticalError', error, { 
            targetUserId: userId, 
            requestingUserId,
            step: 'unknown'
          });
          
          // Provide more specific error messages based on error type
          let errorMessage = 'Failed to delete user completely';
          let errorCode = error.code;
          
          if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found in Firebase Authentication';
            // Check if user data exists in Firestore despite auth deletion
            try {
              const userDocRef = db.collection('users').doc(userId);
              const userDocSnapshot = await userDocRef.get();
              if (userDocSnapshot.exists) {
                logOperation('userDeletion.orphanedDataFound', { 
                  userId, 
                  note: 'User not in Auth but data exists in Firestore' 
                });
                errorMessage = 'User not found in Authentication but data exists. Manual cleanup may be required.';
              }
            } catch (checkError) {
              logError('userDeletion.orphanedDataCheck', checkError, { userId });
            }
            
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ 
                error: errorMessage,
                code: errorCode,
                userId: userId
              })
            };
          }
          
          // For permission errors
          if (error.code === 'permission-denied' || error.message.includes('permission')) {
            errorMessage = 'Insufficient permissions to delete user data. Check Firebase Admin SDK configuration.';
          }
          
          // For network/timeout errors
          if (error.code === 'unavailable' || error.message.includes('timeout') || error.message.includes('network')) {
            errorMessage = 'Network error during deletion. Some data may have been deleted. Please retry.';
          }

          // Calculate partial success for better error reporting
          const totalFailed = Object.values(deletionProgress).reduce((sum, cat) => sum + cat.failed, 0);
          const totalAttempted = Object.values(deletionProgress).reduce((sum, cat) => sum + cat.attempted, 0);
          const partialSuccess = totalAttempted > 0 && totalFailed < totalAttempted;

          return {
            statusCode: partialSuccess ? 207 : 500, // 207 Multi-Status for partial success
            headers,
            body: JSON.stringify({ 
              error: errorMessage,
              details: process.env.NODE_ENV === 'development' ? error.message : undefined,
              code: errorCode,
              userId: userId,
              timestamp: new Date().toISOString(),
              partialSuccess,
              deletionSummary: partialSuccess ? {
                totalOperations: totalAttempted,
                successfulOperations: totalAttempted - totalFailed,
                failedOperations: totalFailed,
                details: deletionProgress
              } : undefined
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
    logError('adminUsers.unhandledError', error, {
      httpMethod: event.httpMethod,
      requestingUserId: 'unknown',
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
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
    };
  }
};
