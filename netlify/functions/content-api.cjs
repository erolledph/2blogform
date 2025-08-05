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

// Simple in-memory rate limiting (for basic protection)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

function checkRateLimit(clientIP) {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  // Reset if window has passed
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  clientData.count++;
  rateLimitMap.set(clientIP, clientData);
  
  return {
    allowed: clientData.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - clientData.count),
    resetTime: clientData.resetTime
  };
}

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
      // Basic rate limiting
      const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
      const rateLimitResult = checkRateLimit(clientIP);
      
      if (!rateLimitResult.allowed) {
        return {
          statusCode: 429,
          headers: {
            ...headers,
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          },
          body: JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`
          })
        };
      }

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

      // Parse query parameters for filtering, pagination, and sorting
      const queryParams = event.queryStringParameters || {};
      const {
        category,
        tag,
        status = 'published',
        limit,
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = queryParams;

      // Query Firestore for published content in the user's blog
      const contentRef = db.collection('users').doc(uid).collection('blogs').doc(blogId).collection('content');
      let query = contentRef;

      // Apply status filter (default to published for public API)
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      } else {
        query = query.where('status', '==', 'published');
      }

      // Apply category filter
      if (category) {
        query = query.where('categories', 'array-contains', category);
      }

      // Apply tag filter
      if (tag) {
        query = query.where('tags', 'array-contains', tag);
      }

      // Apply sorting (limited by Firestore capabilities)
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        query = query.orderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc');
      }

      // Apply pagination
      if (limit) {
        const limitNum = parseInt(limit);
        if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
          query = query.limit(limitNum);
        }
      }

      if (offset && offset !== '0') {
        const offsetNum = parseInt(offset);
        if (!isNaN(offsetNum) && offsetNum > 0) {
          query = query.offset(offsetNum);
        }
      }

      const snapshot = await query.get();

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

      // Client-side sorting for fields not supported by Firestore ordering
      if (sortBy === 'title') {
        content.sort((a, b) => {
          const comparison = (a.title || '').localeCompare(b.title || '');
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      } else if (sortBy !== 'createdAt' && sortBy !== 'updatedAt') {
        // Default sort by creation date if sortBy is not supported
        content.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          
          if (sortOrder === 'asc') {
            return dateA.getTime() - dateB.getTime();
          } else {
            return dateB.getTime() - dateA.getTime();
          }
        });
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        },
        body: JSON.stringify({
          data: content,
          pagination: {
            total: content.length,
            limit: limit ? parseInt(limit) : null,
            offset: parseInt(offset),
            hasMore: limit ? content.length === parseInt(limit) : false
          },
          filters: {
            category: category || null,
            tag: tag || null,
            status: status || 'published',
            sortBy,
            sortOrder
          }
        })
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