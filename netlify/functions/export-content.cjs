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

// Convert array to comma-separated string
function arrayToString(arr) {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(', ');
}

// Convert Firestore timestamp to ISO string
function timestampToISO(timestamp) {
  if (!timestamp) return '';
  return timestamp.toDate().toISOString();
}

// Generate CSV content
function generateCSV(data) {
  if (data.length === 0) {
    return 'title,slug,content,featuredImageUrl,metaDescription,seoTitle,keywords,author,categories,tags,status,createdAt,updatedAt';
  }

  const headers = [
    'title', 'slug', 'content', 'featuredImageUrl', 'metaDescription', 
    'seoTitle', 'keywords', 'author', 'categories', 'tags', 'status',
    'createdAt', 'updatedAt'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.slug || '').replace(/"/g, '""')}"`,
      `"${(item.content || '').replace(/"/g, '""')}"`,
      `"${(item.featuredImageUrl || '').replace(/"/g, '""')}"`,
      `"${(item.metaDescription || '').replace(/"/g, '""')}"`,
      `"${(item.seoTitle || '').replace(/"/g, '""')}"`,
      `"${arrayToString(item.keywords).replace(/"/g, '""')}"`,
      `"${(item.author || '').replace(/"/g, '""')}"`,
      `"${arrayToString(item.categories).replace(/"/g, '""')}"`,
      `"${arrayToString(item.tags).replace(/"/g, '""')}"`,
      `"${(item.status || 'draft').replace(/"/g, '""')}"`,
      `"${timestampToISO(item.createdAt)}"`,
      `"${timestampToISO(item.updatedAt)}"`
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
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
    const contentRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');
    let query = contentRef;

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
    let contentData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Apply client-side filters (Firestore limitations)
    if (!filters.exportAll) {
      let filteredData = [];

      // Filter by selected items
      if (filters.selectedItems && filters.selectedItems.length > 0) {
        const selectedItems = contentData.filter(item => filters.selectedItems.includes(item.id));
        filteredData = [...filteredData, ...selectedItems];
      }

      // Filter by selected categories
      if (filters.selectedCategories && filters.selectedCategories.length > 0) {
        const categoryItems = contentData.filter(item => 
          item.categories && item.categories.some(cat => filters.selectedCategories.includes(cat))
        );
        filteredData = [...filteredData, ...categoryItems];
      }

      // Filter by selected tags
      if (filters.selectedTags && filters.selectedTags.length > 0) {
        const tagItems = contentData.filter(item => 
          item.tags && item.tags.some(tag => filters.selectedTags.includes(tag))
        );
        filteredData = [...filteredData, ...tagItems];
      }

      // Remove duplicates and use filtered data
      if (filteredData.length > 0) {
        const uniqueIds = new Set();
        contentData = filteredData.filter(item => {
          if (uniqueIds.has(item.id)) return false;
          uniqueIds.add(item.id);
          return true;
        });
      } else if (filters.selectedItems || filters.selectedCategories || filters.selectedTags) {
        // If filters were applied but no results, return empty
        contentData = [];
      }
    }

    // Sort by creation date (newest first)
    contentData.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });

    // Generate CSV
    const csvContent = generateCSV(contentData);
    const filename = `content-export-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: csvContent
    };

  } catch (error) {
    console.error('Export content function error:', error);
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