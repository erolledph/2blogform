const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "erolledph",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-m8wjz@erolledph.iam.gserviceaccount.com",
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || "erolledph"
  });
}

const db = admin.firestore();

// Helper function to get custom domain for this user
async function getCustomDomain(uid) {
  try {
    const docRef = db.collection('users').doc(uid).collection('appSettings').doc('public');
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      return data.customDomain || '';
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching custom domain:', error);
    return '';
  }
}

// Helper function to generate content URL
function getContentUrl(slug, customDomain, uid, blogId) {
  if (customDomain) {
    // Remove protocol if present and add https://
    const cleanDomain = customDomain.replace(/^https?:\/\//, '');
    return `https://${cleanDomain}/post/${slug}`;
  }
  // Fallback to default domain structure
  return `https://your-app-domain.com/preview/content/${uid}/${blogId}/${slug}`;
}

exports.handler = async (event, context) => {
  // Debug: Log the full event object to understand what we're receiving
  console.log('Event object:', JSON.stringify(event, null, 2));
  console.log('Event path:', event.path);
  console.log('Query parameters:', event.queryStringParameters);

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract uid and blogId from the request path using regex
    // Expected path format: /users/{uid}/blogs/{blogId}/api/content.json
    const pathMatch = event.path.match(/\/users\/([^\/]+)\/blogs\/([^\/]+)\/api\/content\.json/);
    
    let uid, blogId;
    
    if (pathMatch) {
      uid = pathMatch[1];
      blogId = pathMatch[2];
      console.log('Extracted from path - uid:', uid, 'blogId:', blogId);
    } else {
      // Fallback to query parameters if path parsing fails
      const queryParams = event.queryStringParameters || {};
      uid = queryParams.uid;
      blogId = queryParams.blogId;
      console.log('Extracted from query - uid:', uid, 'blogId:', blogId);
    }
    
    if (!uid || !blogId) {
      console.error('Missing parameters - uid:', uid, 'blogId:', blogId);
      console.error('Full event path:', event.path);
      console.error('Query parameters:', event.queryStringParameters);
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

    // Get custom domain for this user
    const customDomain = await getCustomDomain(uid);

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
        // Add content URL using custom domain or default structure
        contentUrl: getContentUrl(data.slug, customDomain, uid, blogId),
        publishDate: data.publishDate ? data.publishDate.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
      })
    };
  }
};
