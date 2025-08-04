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

  const { httpMethod } = event;

  // For GET requests (public content access), skip authentication
  if (httpMethod === 'GET') {
    try {
      // Extract uid and blogId from the request path using regex
      // Expected path format: /users/{uid}/blogs/{blogId}/api/content.json
      const pathMatch = event.path.match(/\/users\/([^\/]+)\/blogs\/([^\/]+)\/api\/content\.json/);
      
      let uid, blogId;
      
      if (pathMatch) {
        uid = pathMatch[1];
        blogId = pathMatch[2];
      } else {
        // Fallback to query parameters if path parsing fails
        const queryParams = event.queryStringParameters || {};
        uid = queryParams.uid;
        blogId = queryParams.blogId;
      }
      
      if (!uid || !blogId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required parameters: uid and blogId',
            debug: {
              path: event.path,
              queryParams: event.queryStringParameters,
              extractedUid: uid,
              extractedBlogId: blogId
            }
          })
        };
      }

      // Query Firestore for published content in the user's blog
      const contentRef = db.collection('users').doc(uid).collection('blogs').doc(blogId).collection('content');
      const snapshot = await contentRef
        .where('status', '==', 'published')
        .get();

      const content = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamps to ISO strings
        const processedData = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
          publishDate: data.publishDate ? data.publishDate.toDate().toISOString() : null
        };
        
        content.push(processedData);
      });

      // Sort by creation date (newest first) manually to ensure consistent ordering
      content.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        
        // Primary sort: by creation date (newest first)
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        
        // Secondary sort: by document ID for deterministic ordering when dates are equal
        return b.id.localeCompare(a.id);
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(content)
      };

    } catch (error) {
      console.error('Error fetching public content:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Internal server error',
          message: error.message,
        })
      };
    }
  }

  // For all other methods (POST, PUT, DELETE), require authentication
  try {
    // Verify authentication for administrative operations
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
    
    switch (httpMethod) {
      case 'POST': {
        // Create new content
        const data = JSON.parse(event.body);
        
        if (!data.blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }
        
        // Reference to user's blog content collection
        const contentRef = db.collection('users').doc(userId).collection('blogs').doc(data.blogId).collection('content');
        
        const now = admin.firestore.FieldValue.serverTimestamp();
        
        const contentData = {
          ...data,
          userId,
          blogId: data.blogId,
          createdAt: now,
          updatedAt: now,
          publishDate: data.status === 'published' ? now : null
        };

        const docRef = await contentRef.add(contentData);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ 
            id: docRef.id,
          })
        };
      }

      case 'PUT': {
        // Update existing content
        const data = JSON.parse(event.body);
        const { id, blogId, ...updateData } = data;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Content ID is required' })
          };
        }

        if (!blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }

        // Reference to user's blog content collection
        const contentRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');
        const docRef = contentRef.doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Content not found' })
          };
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        const existingData = doc.data();
        
        const contentData = {
          ...updateData,
          userId,
          blogId: blogId,
          updatedAt: now,
          // Update publishDate if status changed to published
          publishDate: updateData.status === 'published' && existingData.status !== 'published' 
            ? now 
            : existingData.publishDate
        };

        await docRef.update(contentData);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      case 'DELETE': {
        // Delete content
        const data = JSON.parse(event.body);
        const { id, blogId } = data;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Content ID is required' })
          };
        }

        if (!blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }

        // Reference to user's blog content collection
        const contentRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');
        const docRef = contentRef.doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Content not found' })
          };
        }

        await docRef.delete();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Admin content function error:', error);
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