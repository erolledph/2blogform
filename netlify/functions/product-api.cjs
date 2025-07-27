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

// Helper function to get public app settings for this user (including currency)
async function getPublicAppSettings(uid) {
  try {
    const docRef = db.collection('users').doc(uid).collection('appSettings').doc('public');
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data();
    }
    
    // Return default settings if no public settings exist
    return {
      currency: '$', // Default currency
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error fetching public app settings:', error);
    return {
      currency: '$', // Default currency on error
      updatedAt: new Date()
    };
  }
}

// Helper function to calculate discounted price
function calculateDiscountedPrice(price, percentOff) {
  if (!price || !percentOff || percentOff <= 0) return price;
  return price - (price * (percentOff / 100));
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

  // Only allow GET requests for public API
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract uid and blogId from the request path using regex
    // Expected path format: /users/{uid}/blogs/{blogId}/api/products.json
    const pathMatch = event.path.match(/\/users\/([^\/]+)\/blogs\/([^\/]+)\/api\/products\.json/);
    
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

    // Get public app settings for this user (including currency)
    const appSettings = await getPublicAppSettings(uid);
    const currency = appSettings.currency || '$';

    // Query Firestore for published products in the user's blog
    const productsRef = db.collection('users').doc(uid).collection('blogs').doc(blogId).collection('products');
    const snapshot = await productsRef
      .where('status', '==', 'published')
      .get();

    const products = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Calculate discounted price
      const originalPrice = data.price || 0;
      const percentOff = data.percentOff || 0;
      const discountedPrice = calculateDiscountedPrice(originalPrice, percentOff);
      
      // Ensure imageUrls is always an array for consistency
      let imageUrls = data.imageUrls || [];
      
      // If imageUrls is empty but imageUrl exists, use imageUrl as the first item
      if (imageUrls.length === 0 && data.imageUrl) {
        imageUrls = [data.imageUrl];
      }
      
      // Convert Firestore timestamps to ISO strings
      const processedData = {
        id: doc.id,
        ...data,
        // Add currency from user's app settings
        currency,
        // Ensure imageUrls is always present as an array
        imageUrls,
        // Add calculated fields
        originalPrice,
        discountedPrice,
        savings: originalPrice - discountedPrice,
        // Use the actual productUrl from Firestore data
        productUrl: data.productUrl || '',
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
      };
      
      products.push(processedData);
    });

    // Sort by creation date (newest first) manually to ensure consistent ordering
    products.sort((a, b) => {
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
      body: JSON.stringify(products)
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
