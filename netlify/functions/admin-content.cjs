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
        // Create new content
        const data = JSON.parse(event.body);
        
        // Enhanced input validation
        if (!data.blogId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'blogId is required' })
          };
        }
        
        // Validate required fields
        if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title is required and must be a non-empty string' })
          };
        }
        
        if (!data.slug || typeof data.slug !== 'string' || !data.slug.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug is required and must be a non-empty string' })
          };
        }
        
        if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Content is required and must be a non-empty string' })
          };
        }
        
        // Validate field lengths
        if (data.title.length > 200) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title must be less than 200 characters' })
          };
        }
        
        if (data.slug.length > 100) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug must be less than 100 characters' })
          };
        }
        
        if (data.content.length > 50000) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Content must be less than 50,000 characters' })
          };
        }
        
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(data.slug)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug can only contain lowercase letters, numbers, and hyphens' })
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
        
        // Validate arrays
        if (data.keywords && !Array.isArray(data.keywords)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Keywords must be an array' })
          };
        }
        
        if (data.categories && !Array.isArray(data.categories)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Categories must be an array' })
          };
        }
        
        if (data.tags && !Array.isArray(data.tags)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Tags must be an array' })
          };
        }
        
        // Validate optional string fields
        if (data.metaDescription && (typeof data.metaDescription !== 'string' || data.metaDescription.length > 160)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Meta description must be a string with maximum 160 characters' })
          };
        }
        
        if (data.seoTitle && (typeof data.seoTitle !== 'string' || data.seoTitle.length > 60)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'SEO title must be a string with maximum 60 characters' })
          };
        }
        
        if (data.author && (typeof data.author !== 'string' || data.author.length > 100)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Author must be a string with maximum 100 characters' })
          };
        }
        
        // Validate featured image URL
        if (data.featuredImageUrl && typeof data.featuredImageUrl !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Featured image URL must be a string' })
          };
        }
        
        // Reference to user's blog content collection
        const contentRef = db.collection('users').doc(userId).collection('blogs').doc(data.blogId).collection('content');
        
        const now = admin.firestore.FieldValue.serverTimestamp();
        
        const contentData = {
          title: data.title.trim(),
          slug: data.slug.trim(),
          content: data.content.trim(),
          featuredImageUrl: data.featuredImageUrl || '',
          metaDescription: data.metaDescription || '',
          seoTitle: data.seoTitle || '',
          keywords: data.keywords || [],
          author: (data.author || '').trim(),
          categories: data.categories || [],
          tags: data.tags || [],
          status: data.status || 'draft',
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

        // Validate required fields for updates
        if (updateData.title !== undefined && (typeof updateData.title !== 'string' || !updateData.title.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title must be a non-empty string' })
          };
        }

        if (updateData.slug !== undefined && (typeof updateData.slug !== 'string' || !updateData.slug.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Slug must be a non-empty string' })
          };
        }

        if (updateData.content !== undefined && (typeof updateData.content !== 'string' || !updateData.content.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Content must be a non-empty string' })
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
        if (updateData.keywords && !Array.isArray(updateData.keywords)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Keywords must be an array' })
          };
        }

        if (updateData.categories && !Array.isArray(updateData.categories)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Categories must be an array' })
          };
        }

        if (updateData.tags && !Array.isArray(updateData.tags)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Tags must be an array' })
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
        
        // Build update object with only the fields that are being changed
        const contentData = {
          updatedAt: now
        };

        // Only include fields that are explicitly provided in the update
        if (updateData.title !== undefined) contentData.title = updateData.title;
        if (updateData.slug !== undefined) contentData.slug = updateData.slug;
        if (updateData.content !== undefined) contentData.content = updateData.content;
        if (updateData.featuredImageUrl !== undefined) contentData.featuredImageUrl = updateData.featuredImageUrl;
        if (updateData.metaDescription !== undefined) contentData.metaDescription = updateData.metaDescription;
        if (updateData.seoTitle !== undefined) contentData.seoTitle = updateData.seoTitle;
        if (updateData.keywords !== undefined) contentData.keywords = updateData.keywords;
        if (updateData.author !== undefined) contentData.author = updateData.author;
        if (updateData.categories !== undefined) contentData.categories = updateData.categories;
        if (updateData.tags !== undefined) contentData.tags = updateData.tags;
        if (updateData.status !== undefined) {
          contentData.status = updateData.status;
          // Update publishDate if status changed to published
          if (updateData.status === 'published' && existingData.status !== 'published') {
            contentData.publishDate = now;
          }
        }

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
        error: 'Internal server error'
      })
    };
  }
};
