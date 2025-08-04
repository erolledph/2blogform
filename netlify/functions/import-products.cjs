const admin = require('firebase-admin');
const multiparty = require('multiparty');
const { Readable } = require('stream');

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

// Robust CSV parser that handles quoted fields and escaped quotes
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseCSVLine = (line) => {
    const result = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped double quote within a quoted field (e.g., "He said ""Hello""")
          currentField += '"';
          i++; // Skip the next quote
        } else {
          // Toggle inQuotes state (start or end of a quoted field)
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of a field
        result.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField); // Add the last field
    return result;
  };
  
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, i) => {
      // If the value was quoted, remove the quotes and then trim. Otherwise, just trim.
      let val = values[i] !== undefined ? values[i] : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1); // Remove surrounding quotes
      }
      row[header] = val.trim();
    });
    row._rowNumber = index + 2; // +2 because we start from line 2 (after header)
    return row;
  });
  
  return { headers, rows };
}

// Generate slug from name
function generateSlug(name) {
  return name
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

// Validate product row
function validateProductRow(row) {
  const errors = [];
  
  // Required fields
  if (!row.name || !row.name.trim()) {
    errors.push('Missing required field: name');
  }
  
  if (!row.description || !row.description.trim()) {
    errors.push('Missing required field: description');
  }
  
  // Generate slug if missing
  if (!row.slug || !row.slug.trim()) {
    if (row.name && row.name.trim()) {
      row.slug = generateSlug(row.name);
    } else {
      errors.push('Missing required field: slug (and cannot generate from name)');
    }
  }
  
  // Validate price
  if (!row.price || isNaN(parseFloat(row.price)) || parseFloat(row.price) < 0) {
    errors.push('Invalid price: must be a valid number >= 0');
  }
  
  // Validate percentOff
  if (row.percentOff && (isNaN(parseFloat(row.percentOff)) || parseFloat(row.percentOff) < 0 || parseFloat(row.percentOff) > 100)) {
    errors.push('Invalid percentOff: must be a number between 0 and 100');
  }
  
  // Validate status
  if (row.status && !['draft', 'published'].includes(row.status.toLowerCase())) {
    errors.push('Invalid status: must be "draft" or "published"');
  }
  
  // Set defaults
  if (!row.status) {
    row.status = 'draft';
  }
  if (!row.percentOff) {
    row.percentOff = '0';
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
      // Create a readable stream from the event body
      const reqStream = new Readable();
      reqStream.push(event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : event.body);
      reqStream.push(null); // Indicate end of stream

      // Attach headers to the stream object as multiparty expects them
      reqStream.headers = event.headers;
      
      form.parse(reqStream, (err, fields, files) => {
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
    const requiredHeaders = ['name', 'description', 'price'];
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
    const productsRef = db.collection('users').doc(userId).collection('blogs').doc(blogId).collection('products');
    const batch = db.batch();
    const errors = [];
    let successCount = 0;

    for (const row of rows) {
      try {
        // Validate row
        const validationErrors = validateProductRow(row);
        if (validationErrors.length > 0) {
          errors.push({
            row: row._rowNumber,
            message: validationErrors.join(', ')
          });
          continue;
        }

        // Check for duplicate slug
        const existingQuery = await productsRef.where('slug', '==', row.slug).limit(1).get();
        if (!existingQuery.empty) {
          errors.push({
            row: row._rowNumber,
            message: `Duplicate slug "${row.slug}" - product already exists`
          });
          continue;
        }

        // Prepare product data
        const now = admin.firestore.FieldValue.serverTimestamp();
        const productData = {
          name: row.name.trim(),
          slug: row.slug.trim(),
          description: row.description.trim(),
          price: parseFloat(row.price),
          percentOff: parseFloat(row.percentOff) || 0,
          imageUrls: parseArrayInput(row.imageUrls),
          productUrl: row.productUrl || '',
          category: row.category || '',
          tags: parseArrayInput(row.tags),
          status: (row.status || 'draft').toLowerCase(),
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
