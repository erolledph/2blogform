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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

    const { httpMethod } = event;
    const userId = decodedToken.uid;
    
    if (httpMethod === 'DELETE') {
      // Delete blog and all its content
      const data = JSON.parse(event.body);
      const { blogId } = data;
      
      if (!blogId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'blogId is required' })
        };
      }

      // Validate blogId format
      if (typeof blogId !== 'string' || !blogId.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'blogId must be a non-empty string' })
        };
      }

      // Verify the blog exists and belongs to the user
      const blogRef = db.collection('users').doc(userId).collection('blogs').doc(blogId);
      const blogDoc = await blogRef.get();
      
      if (!blogDoc.exists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Blog not found' })
        };
      }

      // Check if this is the user's only blog
      const allBlogsSnapshot = await db.collection('users').doc(userId).collection('blogs').get();
      if (allBlogsSnapshot.size <= 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Cannot delete the last blog. Users must have at least one blog.',
            code: 'LAST_BLOG_DELETION_FORBIDDEN'
          })
        };
      }

      try {
        // Delete all content in the blog
        const contentRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');
        await deleteCollection(contentRef);
        
        // Delete all products in the blog
        const productsRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('products');
        await deleteCollection(productsRef);
        
        // Delete the blog document itself
        await blogRef.delete();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            message: 'Blog and all associated content deleted successfully'
          })
        };
      } catch (error) {
        console.error('Error during blog deletion:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to delete blog completely',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Admin blog function error:', error);
    
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