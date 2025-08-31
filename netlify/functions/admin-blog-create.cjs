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

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || "admin-cms-ph"
    });
  } catch (initError) {
    console.error('Firebase Admin SDK initialization failed:', initError);
    throw new Error(`Firebase initialization failed: ${initError.message}`);
  }
}

const db = admin.firestore();
const auth = admin.auth();

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON format in request body',
          details: parseError.message
        })
      };
    }

    const { name, description } = requestData;

    // Enhanced input validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Blog name is required and must be a non-empty string' })
      };
    }

    if (name.trim().length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Blog name must be at least 2 characters' })
      };
    }

    if (name.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Blog name must be less than 100 characters' })
      };
    }

    if (description && (typeof description !== 'string' || description.length > 500)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Description must be a string with maximum 500 characters' })
      };
    }

    // Step 1: Get user's current blog count
    console.log(`Checking blog count for user: ${userId}`);
    const blogsRef = db.collection('users').doc(userId).collection('blogs');
    const blogsSnapshot = await blogsRef.get();
    const currentBlogCount = blogsSnapshot.size;
    
    console.log(`User ${userId} currently has ${currentBlogCount} blogs`);

    // Step 2: Get user's maxBlogs limit from userSettings
    console.log(`Fetching maxBlogs limit for user: ${userId}`);
    const userSettingsRef = db.collection('users').doc(userId).collection('userSettings').doc('preferences');
    const userSettingsDoc = await userSettingsRef.get();
    
    let maxBlogs = 1; // Default limit
    if (userSettingsDoc.exists()) {
      const userData = userSettingsDoc.data();
      maxBlogs = userData.maxBlogs || 1;
      console.log(`User ${userId} has maxBlogs limit: ${maxBlogs}`);
    } else {
      console.log(`No user settings found for ${userId}, using default maxBlogs: ${maxBlogs}`);
    }

    // Step 3: Enforce the maxBlogs limit
    if (currentBlogCount >= maxBlogs) {
      console.log(`Blog creation denied for user ${userId}: ${currentBlogCount} >= ${maxBlogs}`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: `Blog limit exceeded. You can create a maximum of ${maxBlogs} blog${maxBlogs > 1 ? 's' : ''}. Current count: ${currentBlogCount}`,
          code: 'BLOG_LIMIT_EXCEEDED',
          currentBlogCount,
          maxBlogs
        })
      };
    }

    // Step 4: Create the new blog (limit not exceeded)
    console.log(`Creating new blog for user ${userId}: "${name.trim()}"`);
    
    // Generate a unique blog ID
    const blogId = `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blogRef = blogsRef.doc(blogId);
    
    const blogData = {
      name: name.trim(),
      description: (description || '').trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isDefault: currentBlogCount === 0, // First blog is default
      contentCount: 0,
      productCount: 0,
      status: 'active',
      createdBy: userId
    };
    
    await blogRef.set(blogData);
    
    console.log(`Successfully created blog ${blogId} for user ${userId}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Blog created successfully',
        blog: {
          id: blogId,
          name: blogData.name,
          description: blogData.description,
          isDefault: blogData.isDefault,
          status: blogData.status,
          createdAt: new Date().toISOString() // Convert for JSON response
        }
      })
    };

  } catch (error) {
    console.error('Blog creation function error:', error);
    
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
