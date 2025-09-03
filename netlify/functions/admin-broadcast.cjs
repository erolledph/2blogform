const admin = require('firebase-admin');
const { validateObject } = require('./shared/validation.cjs');

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        // Fetch all broadcast messages
        try {
          const broadcastRef = db.collection('broadcast-messages').orderBy('createdAt', 'desc');
          const snapshot = await broadcastRef.get();
          
          const messages = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              title: data.title,
              description: data.description,
              isActive: data.isActive,
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
              createdBy: data.createdBy
            });
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ messages })
          };
        } catch (error) {
          console.error('Error fetching broadcast messages:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to fetch broadcast messages',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
          };
        }
      }

      case 'POST': {
        // Create new broadcast message
        const data = JSON.parse(event.body);
        const { title, description, isActive = true } = data;
        
        // Use centralized validation
        const validationErrors = validateObject(data, {
          title: 'broadcastTitle',
          description: 'broadcastDescription'
        });
        
        if (Object.keys(validationErrors).length > 0) {
          const firstError = Object.values(validationErrors)[0];
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: firstError })
          };
        }

        // Validate isActive
        if (isActive !== undefined && typeof isActive !== 'boolean') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'isActive must be a boolean' })
          };
        }

        try {
          const broadcastRef = db.collection('broadcast-messages');
          
          const messageData = {
            title: title.trim(),
            description: description.trim(),
            isActive: isActive,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: requestingUserId
          };

          const docRef = await broadcastRef.add(messageData);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'Broadcast message created successfully',
              id: docRef.id
            })
          };
        } catch (error) {
          console.error('Error creating broadcast message:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to create broadcast message',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
          };
        }
      }

      case 'PUT': {
        // Update existing broadcast message
        const data = JSON.parse(event.body);
        const { id, title, description, isActive } = data;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Message ID is required' })
          };
        }

        // Use centralized validation for provided fields
        const validationErrors = {};
        if (title !== undefined) {
          const titleError = validateObject({ title }, { title: 'broadcastTitle' });
          Object.assign(validationErrors, titleError);
        }
        if (description !== undefined) {
          const descError = validateObject({ description }, { description: 'broadcastDescription' });
          Object.assign(validationErrors, descError);
        }
        
        if (Object.keys(validationErrors).length > 0) {
          const firstError = Object.values(validationErrors)[0];
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: firstError })
          };
        }

        // Validate isActive
        if (isActive !== undefined && typeof isActive !== 'boolean') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'isActive must be a boolean' })
          };
        }

        try {
          const messageRef = db.collection('broadcast-messages').doc(id);
          const messageDoc = await messageRef.get();
          
          if (!messageDoc.exists) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Broadcast message not found' })
            };
          }

          const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // Only include fields that are explicitly provided in the update
          if (title !== undefined) updateData.title = title.trim();
          if (description !== undefined) updateData.description = description.trim();
          if (isActive !== undefined) updateData.isActive = isActive;

          await messageRef.update(updateData);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'Broadcast message updated successfully'
            })
          };
        } catch (error) {
          console.error('Error updating broadcast message:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to update broadcast message',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
          };
        }
      }

      case 'DELETE': {
        // Delete broadcast message
        const data = JSON.parse(event.body);
        const { id } = data;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Message ID is required' })
          };
        }

        try {
          const messageRef = db.collection('broadcast-messages').doc(id);
          const messageDoc = await messageRef.get();
          
          if (!messageDoc.exists) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Broadcast message not found' })
            };
          }

          await messageRef.delete();
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'Broadcast message deleted successfully'
            })
          };
        } catch (error) {
          console.error('Error deleting broadcast message:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to delete broadcast message',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    console.error('Admin broadcast function error:', error);
    
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};