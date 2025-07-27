const admin = require('firebase-admin');

// Global variable to track Firebase Admin SDK initialization status
let isFirebaseAdminInitialized = false;
let initializationError = null;

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    // Validate required environment variables
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID', 
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_CLIENT_ID',
      'FIREBASE_CLIENT_X509_CERT_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    isFirebaseAdminInitialized = true;
  } else {
    isFirebaseAdminInitialized = true;
  }
} catch (error) {
  initializationError = error;
  isFirebaseAdminInitialized = false;
  console.error('Firebase Admin SDK initialization failed:', error);
}

const db = admin.firestore();
const auth = admin.auth();

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
    // Check if Firebase Admin SDK is properly initialized
    if (!isFirebaseAdminInitialized) {
      console.error('Firebase Admin SDK not initialized:', initializationError?.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? initializationError?.message : undefined
        })
      };
    }

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
          const listUsersResult = await auth.listUsers();
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
                currency: settings.currency || '$'
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
                currency: '$'
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
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to list users' })
          };
        }
      }

      case 'PUT': {
        // Update user settings
        const data = JSON.parse(event.body);
        const { userId, role, canManageMultipleBlogs } = data;
        
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
    console.error('Admin users function error:', error);
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
