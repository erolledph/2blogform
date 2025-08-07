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

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Validate product item
function validateProductItem(item, index) {
  const errors = [];
  
  // Validate item is an object
  if (!item || typeof item !== 'object') {
    errors.push('Item must be a valid object');
    return errors;
  }

  // Required fields
  if (!item.name || !item.name.trim()) {
    errors.push('Missing required field: name');
  } else if (typeof item.name !== 'string') {
    errors.push('Name must be a string');
  } else if (item.name.trim().length < 3) {
    errors.push('Product name must be at least 3 characters');
  } else if (item.name.length > 200) {
    errors.push('Product name must be less than 200 characters');
  }
  
  if (!item.description || !item.description.trim()) {
    errors.push('Missing required field: description');
  } else if (typeof item.description !== 'string') {
    errors.push('Description must be a string');
  } else if (item.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  } else if (item.description.length > 10000) {
    errors.push('Description must be less than 10,000 characters');
  }
  
  // Generate slug if missing
  if (!item.slug || !item.slug.trim()) {
    if (item.name && item.name.trim()) {
      item.slug = generateSlug(item.name);
    } else {
      errors.push('Missing required field: slug (and cannot generate from name)');
    }
  } else if (!/^[a-z0-9-]+$/.test(item.slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
  } else if (item.slug.length > 100) {
    errors.push('Slug must be less than 100 characters');
  }
  
  // Validate price
  if (item.price === undefined || item.price === null || isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
    errors.push('Invalid price: must be a valid number >= 0');
  } else if (parseFloat(item.price) > 999999.99) {
    errors.push('Price cannot exceed $999,999.99');
  }
  
  // Validate percentOff
  if (item.percentOff !== undefined && item.percentOff !== null && (isNaN(parseFloat(item.percentOff)) || parseFloat(item.percentOff) < 0 || parseFloat(item.percentOff) > 100)) {
    errors.push('Invalid percentOff: must be a number between 0 and 100');
  }
  
  // Validate status
  if (item.status && !['draft', 'published'].includes(item.status.toLowerCase())) {
    errors.push('Invalid status: must be "draft" or "published"');
  }
  
  // Set defaults
  if (!item.status) {
    item.status = 'draft';
  }
  if (item.percentOff === undefined || item.percentOff === null) {
    item.percentOff = 0;
  }
  
  // Validate optional fields
  if (item.productUrl && (typeof item.productUrl !== 'string' || item.productUrl.length > 500)) {
    errors.push('Product URL must be a string with maximum 500 characters');
  }
  
  if (item.category && (typeof item.category !== 'string' || item.category.length > 100)) {
    errors.push('Category must be a string with maximum 100 characters');
  }
  
  // Ensure arrays are arrays
  if (item.imageUrls && !Array.isArray(item.imageUrls)) {
    errors.push('Image URLs must be an array');
  } else {
    item.imageUrls = item.imageUrls || [];
  }
  
  if (item.tags && !Array.isArray(item.tags)) {
    errors.push('Tags must be an array');
  } else {
    item.tags = item.tags || [];
  }
  
  // Ensure strings are strings
  item.productUrl = item.productUrl || '';
  item.category = item.category || '';
  
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
    const productsRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('products');
    const batch = db.batch();
    const errors = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIndex = i + 1; // 1-based indexing for user-friendly error messages
      
      try {
        // Validate item
        const validationErrors = validateProductItem(item, itemIndex);
        if (validationErrors.length > 0) {
          errors.push({
            item: itemIndex,
            message: validationErrors.join(', ')
          });
          continue;
        }

        // Check for duplicate slug
        const existingQuery = await productsRef.where('slug', '==', item.slug).limit(1).get();
        if (!existingQuery.empty) {
          errors.push({
            item: itemIndex,
            message: `Duplicate slug "${item.slug}" - product already exists`
          });
          continue;
        }

        // Prepare product data
        const now = admin.firestore.FieldValue.serverTimestamp();
        const productData = {
          name: item.name.trim(),
          slug: item.slug.trim(),
          description: item.description.trim(),
          price: parseFloat(item.price),
          percentOff: parseFloat(item.percentOff) || 0,
          imageUrls: item.imageUrls || [],
          productUrl: item.productUrl || '',
          category: item.category || '',
          tags: item.tags || [],
          status: (item.status || 'draft').toLowerCase(),
          userId,
          blogId,
          createdAt: now,
          updatedAt: now
        };

        // Add backward compatibility imageUrl field
        if (productData.imageUrls.length > 0) {
          productData.imageUrl = productData.imageUrls[0];
        }

        // Add to batch
        const docRef = productsRef.doc();
        batch.set(docRef, productData);
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
    console.error('Import products function error:', error);
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
