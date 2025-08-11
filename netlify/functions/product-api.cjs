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
    // Expected path format: /users/{uid}/blogs/{blogId}/api/products.json
    const pathMatch = event.path.match(/\/users\/([^\/]+)\/blogs\/([^\/]+)\/api\/products\.json/);
    
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
      sortOrder = 'desc',
      minPrice,
      maxPrice
    } = queryParams;

    // Get public app settings for this user (including currency)
    const appSettings = await getPublicAppSettings(uid);
    const currency = appSettings.currency || '$';

    // Query Firestore for published products in the user's blog
    const productsRef = db.collection('users').doc(uid).collection('blogs').doc(blogId).collection('products');
    let query = productsRef;

    // Apply status filter (default to published for public API)
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    } else {
      query = query.where('status', '==', 'published');
    }

    // Apply category filter
    if (category) {
      query = query.where('category', '==', category);
    }

    // Apply tag filter
    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }

    // Apply sorting (limited by Firestore capabilities)
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'price') {
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

    // Apply client-side filters that Firestore doesn't support
    let filteredProducts = products;

    // Price range filter
    if (minPrice || maxPrice) {
      filteredProducts = filteredProducts.filter(product => {
        const price = product.discountedPrice;
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    // Client-side sorting for fields not supported by Firestore ordering
    if (sortBy === 'name') {
      filteredProducts.sort((a, b) => {
        const comparison = (a.name || '').localeCompare(b.name || '');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    } else if (sortBy !== 'createdAt' && sortBy !== 'updatedAt' && sortBy !== 'price') {
      // Default sort by creation date if sortBy is not supported
      filteredProducts.sort((a, b) => {
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
        data: filteredProducts,
        pagination: {
          total: filteredProducts.length,
          limit: limit ? parseInt(limit) : null,
          offset: parseInt(offset),
          hasMore: limit ? filteredProducts.length === parseInt(limit) : false
        },
        filters: {
          category: category || null,
          tag: tag || null,
          status: status || 'published',
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          sortBy,
          sortOrder
        }
      })
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