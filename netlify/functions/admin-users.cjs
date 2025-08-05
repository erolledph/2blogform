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

const db = admin.firestore();
const auth = admin.auth();

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

    const requestingUserId = decodedToken.uid;

    // Verify the requesting user is an admin
    const adminSettingsRef = db.collection('users').doc(requestingUserId).collection('userSettings').doc('preferences');
    const adminSettingsDoc = await adminSettingsRef.get();
    
    if (!adminSettingsDoc.exists || adminSettingsDoc.data().role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden: Admin access required' })
      };
    }

    const { httpMethod } = event;
    
    switch (httpMethod) {
      case 'GET': {
        // List all users with their settings
        try {
          // Use pagination to handle large user lists
          const listUsersResult = await auth.listUsers(1000); // Max 1000 users per request
          const users = [];

          for (const userRecord of listUsersResult.users) {
            try {
              // Get user settings from Firestore
              const userSettingsRef = db.collection('users').doc(userRecord.uid).collection('userSettings').doc('preferences');
              const userSettingsDoc = await userSettingsRef.get();
              
              const settings = userSettingsDoc.exists ? userSettingsDoc.data() : {};
              
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
              console.warn(`Error fetching settings for user ${userRecord.uid}:`, error);
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

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ users })
          };
        } catch (error) {
          console.error('Error listing users:', error);
          
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
        // Update user settings
        const data = JSON.parse(event.body);
        const { userId, role, canManageMultipleBlogs, maxBlogs, totalStorageMB } = data;
        
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID is required' })
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
        if (maxBlogs !== undefined && (!Number.isInteger(maxBlogs) || maxBlogs < 1)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'maxBlogs must be a positive integer (minimum 1)' })
          };
        }

        // Validate totalStorageMB
        if (totalStorageMB !== undefined && (!Number.isInteger(totalStorageMB) || totalStorageMB < 100)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'totalStorageMB must be a positive integer (minimum 100)' })
          };
        }
        try {
          // Verify the target user exists
          await auth.getUser(userId);

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
          await userSettingsRef.set(updateData, { merge: true });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'User settings updated successfully'
            })
          };
        } catch (error) {
          console.error('Error updating user settings:', error);
          
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

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    case 'DELETE': {
      // Delete user account and all associated data
      const data = JSON.parse(event.body);
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
          body: JSON.stringify({ error: 'userId must be a non-empty string' })
        };
      }

      // Prevent admin from deleting themselves
      if (userId === requestingUserId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Cannot delete your own account' })
        };
      }

      try {
        // Verify the target user exists
        const targetUser = await auth.getUser(userId);

        // Delete user's Firestore data
        const userDocRef = db.collection('users').doc(userId);
        
        // Delete all subcollections (blogs, userSettings, appSettings)
        const subcollections = ['blogs', 'userSettings', 'appSettings'];
        
        for (const subcollection of subcollections) {
          const subcollectionRef = userDocRef.collection(subcollection);
          await deleteCollection(subcollectionRef);
        }
        
        // Delete the main user document
        await userDocRef.delete();
        
        // Delete user from Firebase Auth
        await auth.deleteUser(userId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            message: 'User account and all associated data deleted successfully'
          })
        };
      } catch (error) {
        console.error('Error deleting user:', error);
        
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
          body: JSON.stringify({ 
            error: 'Failed to delete user account',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          })
        };
      }
    }

    console.error('Admin users function error:', error);
    
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
