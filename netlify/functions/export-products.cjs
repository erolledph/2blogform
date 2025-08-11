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

// Convert Firestore timestamp to ISO string
function timestampToISO(timestamp) {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
}

// Process products data for JSON export
function processProductsForExport(data) {
  return data.map(item => ({
    id: item.id,
    name: item.name || '',
    slug: item.slug || '',
    description: item.description || '',
    price: item.price || 0,
    percentOff: item.percentOff || 0,
    imageUrls: item.imageUrls || [],
    imageUrl: item.imageUrl || '', // Backward compatibility
    productUrl: item.productUrl || '',
    category: item.category || '',
    tags: item.tags || [],
    status: item.status || 'draft',
    userId: item.userId,
    blogId: item.blogId,
    createdAt: timestampToISO(item.createdAt),
    updatedAt: timestampToISO(item.updatedAt)
  }));
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { blogId, filters } = JSON.parse(event.body);

    if (!blogId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'blogId is required' })
      };
    }

    // Build Firestore query
    const productsRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('products');
    let query = productsRef;

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      query = query.where('createdAt', '>=', startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      query = query.where('createdAt', '<=', endDate);
    }

    // Execute query
    const snapshot = await query.get();
    let productsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Apply client-side filters (Firestore limitations)
    if (!filters.exportAll) {
      let filteredData = [];

      // Filter by selected items
      if (filters.selectedItems && filters.selectedItems.length > 0) {
        const selectedItems = productsData.filter(item => filters.selectedItems.includes(item.id));
        filteredData = [...filteredData, ...selectedItems];
      }

      // Filter by selected categories
      if (filters.selectedCategories && filters.selectedCategories.length > 0) {
        const categoryItems = productsData.filter(item => 
          item.category && filters.selectedCategories.includes(item.category)
        );
        filteredData = [...filteredData, ...categoryItems];
      }

      // Filter by selected tags
      if (filters.selectedTags && filters.selectedTags.length > 0) {
        const tagItems = productsData.filter(item => 
          item.tags && item.tags.some(tag => filters.selectedTags.includes(tag))
        );
        filteredData = [...filteredData, ...tagItems];
      }

      // Remove duplicates and use filtered data
      if (filteredData.length > 0) {
        const uniqueIds = new Set();
        productsData = filteredData.filter(item => {
          if (uniqueIds.has(item.id)) return false;
          uniqueIds.add(item.id);
          return true;
        });
      } else if (filters.selectedItems || filters.selectedCategories || filters.selectedTags) {
        // If filters were applied but no results, return empty
        productsData = [];
      }
    }

    // Sort by creation date (newest first)
    productsData.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });

    // Process and generate JSON
    const processedData = processProductsForExport(productsData);
    const jsonContent = JSON.stringify(processedData, null, 2);
    const filename = `products-export-${new Date().toISOString().split('T')[0]}.json`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: jsonContent
    };

  } catch (error) {
    console.error('Export products function error:', error);
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
