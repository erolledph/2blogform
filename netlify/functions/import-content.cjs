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

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Validate content item
function validateContentItem(item, index) {
  const errors = [];
  
  // Validate item is an object
  if (!item || typeof item !== 'object') {
    errors.push('Item must be a valid object');
    return errors;
  }

  // Required fields
  if (!item.title || !item.title.trim()) {
    errors.push('Missing required field: title');
  } else if (typeof item.title !== 'string') {
    errors.push('Title must be a string');
  } else if (item.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  } else if (item.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!item.content || !item.content.trim()) {
    errors.push('Missing required field: content');
  } else if (typeof item.content !== 'string') {
    errors.push('Content must be a string');
  } else if (item.content.trim().length < 10) {
    errors.push('Content must be at least 10 characters');
  } else if (item.content.length > 50000) {
    errors.push('Content must be less than 50,000 characters');
  }
  
  // Generate slug if missing
  if (!item.slug || !item.slug.trim()) {
    if (item.title && item.title.trim()) {
      item.slug = generateSlug(item.title);
    } else {
      errors.push('Missing required field: slug (and cannot generate from title)');
    }
  } else if (!/^[a-z0-9-]+$/.test(item.slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
  } else if (item.slug.length > 100) {
    errors.push('Slug must be less than 100 characters');
  }
  
  // Validate status
  if (item.status && !['draft', 'published'].includes(item.status.toLowerCase())) {
    errors.push('Invalid status: must be "draft" or "published"');
  }
  
  // Set default status if missing
  if (!item.status) {
    item.status = 'draft';
  }
  
  // Validate optional fields
  if (item.metaDescription && (typeof item.metaDescription !== 'string' || item.metaDescription.length > 160)) {
    errors.push('Meta description must be a string with maximum 160 characters');
  }
  
  if (item.seoTitle && (typeof item.seoTitle !== 'string' || item.seoTitle.length > 60)) {
    errors.push('SEO title must be a string with maximum 60 characters');
  }
  
  if (item.author && (typeof item.author !== 'string' || item.author.length > 100)) {
    errors.push('Author must be a string with maximum 100 characters');
  }
  
  if (item.featuredImageUrl && typeof item.featuredImageUrl !== 'string') {
    errors.push('Featured image URL must be a string');
  }
  
  // Ensure arrays are arrays
  if (item.keywords && !Array.isArray(item.keywords)) {
    errors.push('Keywords must be an array');
  } else {
    item.keywords = item.keywords || [];
  }
  
  if (item.categories && !Array.isArray(item.categories)) {
    errors.push('Categories must be an array');
  } else {
    item.categories = item.categories || [];
  }
  
  if (item.tags && !Array.isArray(item.tags)) {
    errors.push('Tags must be an array');
  } else {
    item.tags = item.tags || [];
  }
  
  // Ensure strings are strings
  item.featuredImageUrl = item.featuredImageUrl || '';
  item.metaDescription = item.metaDescription || '';
  item.seoTitle = item.seoTitle || '';
  item.author = item.author || '';
  
  return errors;
}

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

    // Parse JSON body
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

    const { blogId, items } = requestData;

    if (!blogId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'blogId is required' })
      };
    }

    if (!items || !Array.isArray(items)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'items array is required' })
      };
    }

    if (items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'items array cannot be empty' })
      };
    }

    // Process items
    const contentRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');
    const batch = db.batch();
    const errors = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIndex = i + 1; // 1-based indexing for user-friendly error messages
      
      try {
        // Validate item
        const validationErrors = validateContentItem(item, itemIndex);
        if (validationErrors.length > 0) {
          errors.push({
            item: itemIndex,
            message: validationErrors.join(', ')
          });
          continue;
        }

        // Check for duplicate slug
        const existingQuery = await contentRef.where('slug', '==', item.slug).limit(1).get();
        if (!existingQuery.empty) {
          errors.push({
            item: itemIndex,
            message: `Duplicate slug "${item.slug}" - item already exists`
          });
          continue;
        }

        // Prepare content data
        const now = admin.firestore.FieldValue.serverTimestamp();
        const contentData = {
          title: item.title.trim(),
          slug: item.slug.trim(),
          content: item.content.trim(),
          featuredImageUrl: item.featuredImageUrl || '',
          metaDescription: item.metaDescription || '',
          seoTitle: item.seoTitle || '',
          keywords: item.keywords || [],
          author: item.author || '',
          categories: item.categories || [],
          tags: item.tags || [],
          status: (item.status || 'draft').toLowerCase(),
          userId,
          blogId,
          createdAt: now,
          updatedAt: now,
          publishDate: (item.status || 'draft').toLowerCase() === 'published' ? now : null,
          // Analytics fields
          viewCount: 0,
          clickCount: 0,
          shareCount: 0,
          likeCount: 0
        };

        // Add to batch
        const docRef = contentRef.doc();
        batch.set(docRef, contentData);
        successCount++;

      } catch (error) {
        console.error(`Error processing item ${itemIndex}:`, error);
        errors.push({
          item: itemIndex,
          message: `Processing error: ${error.message}`
        });
      }
    }

    // Commit batch if there are successful items
    if (successCount > 0) {
      await batch.commit();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalItems: items.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 50) // Limit error details to prevent large responses
      })
    };

  } catch (error) {
    console.error('Import content function error:', error);
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
