const admin = require('firebase-admin');
const { validateObject, validateArray } = require('./shared/validation.cjs');

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

    const { httpMethod } = event;
    const userId = decodedToken.uid;
    
    switch (httpMethod) {
      case 'POST': {
        // Create new product
        const data = JSON.parse(event.body);
        
        // Centralized validation
        if (!data.blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }
        
        // Use centralized validation
        const validationErrors = validateObject(data, {
          name: 'productName',
          slug: 'slug',
          description: 'description',
          price: 'price',
          percentOff: 'percentOff',
          category: 'category'
        });
        
        if (Object.keys(validationErrors).length > 0) {
          const firstError = Object.values(validationErrors)[0];
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: firstError })
          };
        }
        
        // Validate arrays
        const arrayErrors = [];
        if (data.imageUrls && !Array.isArray(data.imageUrls)) arrayErrors.push('Image URLs must be an array');
        if (data.tags && !Array.isArray(data.tags)) arrayErrors.push('Tags must be an array');
        
        if (arrayErrors.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: arrayErrors[0] })
          };
        }
        
        // Validate status
        if (data.status && !['draft', 'published'].includes(data.status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Status must be either "draft" or "published"' })
          };
        }
        
        // Reference to user's blog products collection
        const productsRef = db.collection('users').doc(userId).collection('blogs').doc(data.blogId).collection('products');
        
        const now = admin.firestore.FieldValue.serverTimestamp();
        
        // Ensure price and percentOff are numbers
        const productData = {
          name: data.name.trim(),
          slug: data.slug.trim(),
          description: data.description.trim(),
          price: parseFloat(data.price),
          percentOff: parseFloat(data.percentOff) || 0,
          imageUrls: data.imageUrls || [],
          productUrl: (data.productUrl || '').trim(),
          category: (data.category || '').trim(),
          tags: data.tags || [],
          status: data.status || 'draft',
          userId,
          blogId: data.blogId,
          createdAt: now,
          updatedAt: now
        };

        const docRef = await productsRef.add(productData);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ 
            id: docRef.id,
          })
        };
      }

      case 'PUT': {
        // Update existing product
        const data = JSON.parse(event.body);
        const { id, blogId, ...updateData } = data;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Product ID is required' })
          };
        }

        if (!blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }

        // Validate required fields for updates
        if (updateData.name !== undefined && (typeof updateData.name !== 'string' || !updateData.name.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Product name must be a non-empty string' })
          };
        }

        if (updateData.slug !== undefined && (typeof updateData.slug !== 'string' || !updateData.slug.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug must be a non-empty string' })
          };
        }

        if (updateData.description !== undefined && (typeof updateData.description !== 'string' || !updateData.description.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Description must be a non-empty string' })
          };
        }

        // Validate price
        if (updateData.price !== undefined && (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Price must be a valid number >= 0' })
          };
        }

        // Validate percentOff
        if (updateData.percentOff !== undefined && (isNaN(parseFloat(updateData.percentOff)) || parseFloat(updateData.percentOff) < 0 || parseFloat(updateData.percentOff) > 100)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Percent off must be a number between 0 and 100' })
          };
        }

        // Validate status
        if (updateData.status && !['draft', 'published'].includes(updateData.status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Status must be either "draft" or "published"' })
          };
        }

        // Validate arrays
        if (updateData.imageUrls && !Array.isArray(updateData.imageUrls)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Image URLs must be an array' })
          };
        }

        if (updateData.tags && !Array.isArray(updateData.tags)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Tags must be an array' })
          };
        }

        // Reference to user's blog products collection
        const productsRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('products');
        const docRef = productsRef.doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found' })
          };
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        
        // Build update object with only the fields that are being changed
        const productData = {
          updatedAt: now
        };

        // Only include fields that are explicitly provided in the update
        if (updateData.name !== undefined) productData.name = updateData.name;
        if (updateData.slug !== undefined) productData.slug = updateData.slug;
        if (updateData.description !== undefined) productData.description = updateData.description;
        if (updateData.price !== undefined) productData.price = parseFloat(updateData.price);
        if (updateData.percentOff !== undefined) productData.percentOff = parseFloat(updateData.percentOff);
        if (updateData.imageUrls !== undefined) productData.imageUrls = updateData.imageUrls;
        if (updateData.imageUrl !== undefined) productData.imageUrl = updateData.imageUrl;
        if (updateData.productUrl !== undefined) productData.productUrl = updateData.productUrl;
        if (updateData.category !== undefined) productData.category = updateData.category;
        if (updateData.tags !== undefined) productData.tags = updateData.tags;
        if (updateData.status !== undefined) productData.status = updateData.status;

        await docRef.update(productData);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      case 'DELETE': {
        // Delete product
        const data = JSON.parse(event.body);
        const { id, blogId } = data;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Product ID is required' })
          };
        }

        if (!blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }

        // Reference to user's blog products collection
        const productsRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('products');
        const docRef = productsRef.doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found' })
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
    console.error('Admin product function error:', error);
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
