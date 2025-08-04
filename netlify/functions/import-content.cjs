const admin = require('firebase-admin');
const multiparty = require('multiparty');

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

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Regex to split by comma, but not if comma is inside double quotes
  const csvSplitRegex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(?:,|$)/g;
  
  const parseLine = (line) => {
    const values = [];
    let match;
    while ((match = csvSplitRegex.exec(line)) !== null) {
      // If the first group (quoted string) matched, use it and unescape quotes
      if (match[1] !== undefined) {
        values.push(match[1].replace(/""/g, '"'));
      } else {
        // Otherwise, use the second group (unquoted string)
        values.push(match[2]);
      }
    }
    return values;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line).map(v => v.trim());
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    row._rowNumber = index + 2; // +2 because we start from line 2 (after header)
    return row;
  });
  
  return { headers, rows };
}

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Parse array input (comma-separated string to array)
function parseArrayInput(value) {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(item => item);
}

// Validate content row
function validateContentRow(row) {
  const errors = [];
  
  // Required fields
  if (!row.title || !row.title.trim()) {
    errors.push('Missing required field: title');
  }
  
  if (!row.content || !row.content.trim()) {
    errors.push('Missing required field: content');
  }
  
  // Generate slug if missing
  if (!row.slug || !row.slug.trim()) {
    if (row.title && row.title.trim()) {
      row.slug = generateSlug(row.title);
    } else {
      errors.push('Missing required field: slug (and cannot generate from title)');
    }
  }
  
  // Validate status
  if (row.status && !['draft', 'published'].includes(row.status.toLowerCase())) {
    errors.push('Invalid status: must be "draft" or "published"');
  }
  
  // Set default status if missing
  if (!row.status) {
    row.status = 'draft';
  }
  
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

    // Parse multipart form data
    const form = new multiparty.Form();
    const { fields, files } = await new Promise((resolve, reject) => {
      // Create a mock request object for multiparty
      const req = {
        headers: event.headers,
        method: event.httpMethod,
        url: event.path,
        // Multiparty expects a stream, so we create one from the body
        pipe: (dest) => {
          const bodyBuffer = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : Buffer.from(event.body, 'utf8');
          dest.end(bodyBuffer); // End the stream with the body content
        }
      };
      
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const blogId = fields.blogId && fields.blogId[0];
    if (!blogId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'blogId is required' })
      };
    }

    const file = files.file && files.file[0];
    if (!file) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'CSV file is required' })
      };
    }

    // Read CSV file
    const fs = require('fs');
    const csvContent = fs.readFileSync(file.path, 'utf8');
    const { headers: csvHeaders, rows } = parseCSV(csvContent);

    // Validate CSV headers
    const requiredHeaders = ['title', 'content'];
    const missingHeaders = requiredHeaders.filter(header => !csvHeaders.includes(header));
    if (missingHeaders.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Missing required CSV headers: ${missingHeaders.join(', ')}` 
        })
      };
    }

    // Process rows
    const contentRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('content');
    const batch = db.batch();
    const errors = [];
    let successCount = 0;

    for (const row of rows) {
      try {
        // Validate row
        const validationErrors = validateContentRow(row);
        if (validationErrors.length > 0) {
          errors.push({
            row: row._rowNumber,
            message: validationErrors.join(', ')
          });
          continue;
        }

        // Check for duplicate slug
        const existingQuery = await contentRef.where('slug', '==', row.slug).limit(1).get();
        if (!existingQuery.empty) {
          errors.push({
            row: row._rowNumber,
            message: `Duplicate slug "${row.slug}" - item already exists`
          });
          continue;
        }

        // Prepare content data
        const now = admin.firestore.FieldValue.serverTimestamp();
        const contentData = {
          title: row.title.trim(),
          slug: row.slug.trim(),
          content: row.content.trim(),
          featuredImageUrl: row.featuredImageUrl || '',
          metaDescription: row.metaDescription || '',
          seoTitle: row.seoTitle || '',
          keywords: parseArrayInput(row.keywords),
          author: row.author || '',
          categories: parseArrayInput(row.categories),
          tags: parseArrayInput(row.tags),
          status: (row.status || 'draft').toLowerCase(),
          userId,
          blogId,
          createdAt: now,
          updatedAt: now,
          publishDate: (row.status || 'draft').toLowerCase() === 'published' ? now : null,
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
        console.error(`Error processing row ${row._rowNumber}:`, error);
        errors.push({
          row: row._rowNumber,
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
        totalRows: rows.length,
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