import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Copy, ExternalLink, AlertTriangle, ImageIcon, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentationPage({ activeBlogId }) {
  const { currentUser } = useAuth();
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Use current user's UID for API endpoints, or placeholder if not available
  const uid = currentUser?.uid || '{uid}';
  const blogId = activeBlogId || '{blogId}';
  
  const apiEndpoint = `${window.location.origin}/users/${uid}/blogs/${blogId}/api/content.json`;
  const productsApiEndpoint = `${window.location.origin}/users/${uid}/blogs/${blogId}/api/products.json`;

  const codeExamples = {
    javascript: `// Fetch all published content with pagination
fetch('${apiEndpoint}?limit=10&offset=0')
  .then(response => response.json())
  .then(data => {
    console.log('Content:', data.data);
    console.log('Pagination:', data.pagination);
    console.log('Applied filters:', data.filters);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// Fetch content by category with sorting
fetch('${apiEndpoint}?category=Technology&sortBy=title&sortOrder=asc')
  .then(response => response.json())
  .then(data => {
    const specificContent = data.data.find(item => item.slug === 'your-slug-here');
    console.log('Specific content:', specificContent);
  });`,

    productsJavascript: `// Fetch products with price range and pagination
fetch('${productsApiEndpoint}?minPrice=50&maxPrice=200&limit=10')
  .then(response => response.json())
  .then(data => {
    console.log('Products:', data.data);
    console.log('Pagination:', data.pagination);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// Fetch products by category and tag
fetch('${productsApiEndpoint}?category=Electronics&tag=wireless&sortBy=price&sortOrder=asc')
  .then(response => response.json())
  .then(data => {
    const specificProduct = data.data.find(item => item.slug === 'your-product-slug');
    console.log('Specific product:', specificProduct);
  });`,
    nodejs: `const https = require('https');

// Fetch all published content
const fetchContent = () => {
  return new Promise((resolve, reject) => {
    https.get('${apiEndpoint}', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const content = JSON.parse(data);
          resolve(content);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Usage
fetchContent()
  .then(content => {
    console.log('All content:', content);
    
    // Find specific content by slug
    const specificContent = content.find(item => item.slug === 'your-slug-here');
    console.log('Specific content:', specificContent);
  })
  .catch(error => {
    console.error('Error:', error);
  });`,

    productsNodejs: `const https = require('https');

// Fetch all published products
const fetchProducts = () => {
  return new Promise((resolve, reject) => {
    https.get('${productsApiEndpoint}', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const products = JSON.parse(data);
          resolve(products);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Usage
fetchProducts()
  .then(products => {
    console.log('All products:', products);
    
    // Find specific product by slug
    const specificProduct = products.find(item => item.slug === 'your-product-slug');
    console.log('Specific product:', specificProduct);
  })
  .catch(error => {
    console.error('Error:', error);
  });`,
    curl: `# Fetch all published content
curl -X GET "${apiEndpoint}" \\
  -H "Accept: application/json"

# Pretty print JSON response
curl -X GET "${apiEndpoint}" \\
  -H "Accept: application/json" | jq '.'

# Filter specific content by slug using jq
curl -X GET "${apiEndpoint}" \\
  -H "Accept: application/json" | jq '.[] | select(.slug == "your-slug-here")'`,

    productsCurl: `# Fetch all published products
curl -X GET "${productsApiEndpoint}" \\
  -H "Accept: application/json"

# Pretty print JSON response
curl -X GET "${productsApiEndpoint}" \\
  -H "Accept: application/json" | jq '.'

# Filter specific product by slug using jq
curl -X GET "${productsApiEndpoint}" \\
  -H "Accept: application/json" | jq '.[] | select(.slug == "your-product-slug")'`,
    python: `import requests
import json

# Fetch all published content
def fetch_content():
    try:
        response = requests.get('${apiEndpoint}')
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching content: {e}")
        return None

# Usage
content = fetch_content()
if content:
    print("All content:", json.dumps(content, indent=2))
    
    # Find specific content by slug
    specific_content = next((item for item in content if item['slug'] == 'your-slug-here'), None)
    if specific_content:
        print("Specific content:", json.dumps(specific_content, indent=2))
    else:
        print("Content with specified slug not found")`,

    productsPython: `import requests
import json

# Fetch all published products
def fetch_products():
    try:
        response = requests.get('${productsApiEndpoint}')
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching products: {e}")
        return None

# Usage
products = fetch_products()
if products:
    print("All products:", json.dumps(products, indent=2))
    
    # Find specific product by slug
    specific_product = next((item for item in products if item['slug'] == 'your-product-slug'), None)
    if specific_product:
        print("Specific product:", json.dumps(specific_product, indent=2))
    else:
        print("Product with specified slug not found")`
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">API Documentation</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Learn how to integrate your CMS content and products into external applications using our public REST API
        </p>
      </div>

      {/* Introduction Section */}
      <div className="card border-green-200 bg-green-50">
        <div className="card-content p-8">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-4">Public API Overview</h3>
              <div className="text-base text-green-700 space-y-3">
                <p>
                  This CMS provides public REST API endpoints that allow you to fetch your published content and products 
                  for use in external websites, mobile apps, or any application that can make HTTP requests.
                </p>
                <p>
                  <strong>Key Features:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Read-only access to published content and products</li>
                  <li>JSON format responses for easy integration</li>
                  <li>CORS enabled for browser-based applications</li>
                  <li>No authentication required for public endpoints</li>
                  <li>Multi-tenant architecture with user and blog isolation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User-Specific API Notice */}
      <div className="card border-blue-200 bg-blue-50">
        <div className="card-content p-8">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Multi-Tenant API Structure</h3>
              <div className="text-base text-blue-700 space-y-3">
                <p>
                  This CMS uses a multi-tenant architecture where each user has their own isolated data space. 
                  API endpoints include both a User ID and Blog ID to ensure proper data isolation.
                </p>
                <p>
                  <strong>Your User ID:</strong> <code className="bg-blue-100 px-3 py-1 rounded text-sm">{uid}</code>
                </p>
                <p>
                  <strong>Current Blog ID:</strong> <code className="bg-blue-100 px-3 py-1 rounded text-sm">{blogId}</code>
                </p>
                <p>
                  <strong>How to find your IDs:</strong>
                </p>
                <p>
                  <ul className="list-disc list-inside space-y-2 ml-6">
                    <li>Your User ID is visible in the dashboard URL and account settings</li>
                    <li>Your Blog ID can be found in the "Manage Blog" page under blog information</li>
                    <li>Both IDs are included in the API endpoint URLs shown below</li>
                  </ul>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content API Endpoint */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Blog Content API</h2>
          <p className="card-description">
            Fetch all published blog posts and articles from this blog
          </p>
        </div>
        <div className="card-content">
          <div className="bg-muted rounded-lg p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <code className="text-base font-mono text-foreground break-all">{apiEndpoint}</code>
            <div className="flex space-x-4 flex-shrink-0">
              <button
                onClick={() => copyToClipboard(apiEndpoint)}
                className="btn-ghost btn-sm"
                title="Copy URL"
              >
                <Copy className="h-5 w-5" />
              </button>
              <a
                href={apiEndpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
                title="Open in new tab"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Products API Endpoint */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Products Catalog API</h2>
          <p className="card-description">
            Fetch all published products from this blog's catalog
          </p>
        </div>
        <div className="card-content">
          <div className="bg-muted rounded-lg p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <code className="text-base font-mono text-foreground break-all">{productsApiEndpoint}</code>
            <div className="flex space-x-4 flex-shrink-0">
              <button
                onClick={() => copyToClipboard(productsApiEndpoint)}
                className="btn-ghost btn-sm"
                title="Copy URL"
              >
                <Copy className="h-5 w-5" />
              </button>
              <a
                href={productsApiEndpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
                title="Open in new tab"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Response Format */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Content API Response Format</h2>
          <p className="card-description">
            Enhanced response format with pagination and filtering support
          </p>
        </div>
        <div className="card-content">
          <div className="bg-muted rounded-lg p-8 overflow-x-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap">
{`[
  "data": [
    {
      "id": "generated-id-123",
      "title": "The Clever Idea: Next.js, Firebase & Cloudflare",
      "slug": "the-clever-idea-nextjs-firebase-cloudflare",
      "content": "# The Clever Idea\\n\\nThis is the **body** of my post in Markdown...",
      "featuredImageUrl": "https://example.com/images/featured-image.jpg",
      "metaDescription": "Explore a clever architecture for your Next.js blog...",
      "seoTitle": "Clever Next.js Blog Architecture | MySite",
      "keywords": ["nextjs", "firebase", "cloudflare", "blog"],
      "author": "Your Name",
      "categories": ["Web Development", "Cloud"],
      "tags": ["nextjs", "firebase", "cloudflare", "blogging", "seo"],
      "status": "published",
      "userId": "${uid}",
      "blogId": "${blogId}",
      "publishDate": "2025-06-27T10:00:00Z",
      "createdAt": "2025-06-27T09:30:00Z",
      "updatedAt": "2025-06-27T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": null,
    "offset": 0,
    "hasMore": false
  },
  "filters": {
    "category": null,
    "tag": null,
    "status": "published",
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
]`}
            </pre>
          </div>
        </div>
      </div>

      {/* Products Response Format */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Products API Response Format</h2>
          <p className="card-description">
            Enhanced response format with pagination, filtering, and pricing calculations
          </p>
        </div>
        <div className="card-content">
          <div className="bg-muted rounded-lg p-8 overflow-x-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap">
{`[
  "data": [
    {
      "id": "generated-id-456",
      "name": "Premium Wireless Headphones",
      "slug": "premium-wireless-headphones",
      "description": "# Premium Audio Experience\\n\\nHigh-quality wireless headphones...",
      "price": 199.99,
      "percentOff": 15,
      "originalPrice": 199.99,
      "discountedPrice": 169.99,
      "savings": 30.00,
      "currency": "$",
      "imageUrl": "https://example.com/images/main-image.jpg",
      "imageUrls": [
        "https://example.com/images/main-image.jpg",
        "https://example.com/images/side-view.jpg",
        "https://example.com/images/detail-view.jpg",
        "https://example.com/images/packaging.jpg"
      ],
      "productUrl": "https://example.com/buy/premium-wireless-headphones",
      "category": "Electronics",
      "tags": ["audio", "wireless", "premium", "headphones"],
      "status": "published",
      "userId": "${uid}",
      "blogId": "${blogId}",
      "createdAt": "2025-06-27T09:30:00Z",
      "updatedAt": "2025-06-27T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": null,
    "offset": 0,
    "hasMore": false
  },
  "filters": {
    "category": null,
    "tag": null,
    "status": "published",
    "minPrice": null,
    "maxPrice": null,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
]`}
            </pre>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground mb-10">Code Examples</h2>

        {/* API Query Parameters */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">API Query Parameters</h3>
            <p className="card-description">
              Filter, sort, and paginate your API responses
            </p>
          </div>
          <div className="card-content">
            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Content API Parameters</h4>
                <div className="bg-muted rounded-lg p-6 overflow-x-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap">
{`# Filter by category
${apiEndpoint}?category=Technology

# Filter by tag
${apiEndpoint}?tag=javascript

# Pagination
${apiEndpoint}?limit=10&offset=20

# Sort by title (ascending)
${apiEndpoint}?sortBy=title&sortOrder=asc

# Combined filters
${apiEndpoint}?category=Technology&tag=javascript&limit=5&sortBy=createdAt&sortOrder=desc`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4">Products API Parameters</h4>
                <div className="bg-muted rounded-lg p-6 overflow-x-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap">
{`# Filter by category
${productsApiEndpoint}?category=Electronics

# Filter by tag
${productsApiEndpoint}?tag=wireless

# Price range filter
${productsApiEndpoint}?minPrice=50&maxPrice=200

# Sort by price (ascending)
${productsApiEndpoint}?sortBy=price&sortOrder=asc

# Combined filters
${productsApiEndpoint}?category=Electronics&minPrice=100&maxPrice=500&limit=10&sortBy=price&sortOrder=asc`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content API Examples */}
        <h3 className="text-2xl font-bold text-foreground mb-8">Content API Examples</h3>
        
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <h4 className="card-title">JavaScript (Browser)</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.javascript)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-8 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.javascript}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">Node.js</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.nodejs)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.nodejs}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">cURL</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.curl)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.curl}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">Python</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.python)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.python}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Products API Examples */}
        <h3 className="text-2xl font-bold text-foreground mb-6 mt-12">Products API Examples</h3>
        
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">JavaScript (Browser)</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.productsJavascript)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.productsJavascript}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">Node.js</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.productsNodejs)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.productsNodejs}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">cURL</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.productsCurl)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.productsCurl}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h4 className="card-title">Python</h4>
              <button
                onClick={() => copyToClipboard(codeExamples.productsPython)}
                className="btn-secondary btn-sm"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
          </div>
          <div className="card-content">
            <div className="bg-muted rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap">
                <code>{codeExamples.productsPython}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Notes */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Important Usage Guidelines</h2>
          <p className="card-description">
            Essential information for developers integrating with this API
          </p>
        </div>
        <div className="card-content">
          <div className="space-y-4 text-base text-muted-foreground">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">🔒 Security & Access</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• These are <strong>public, read-only</strong> endpoints - no authentication required</li>
                <li>• Only content and products with status "published" are returned</li>
                <li>• Draft items are never exposed through the public API</li>
                <li>• Each user's data is completely isolated from other users</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📊 Data Format & Structure</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• All responses are in JSON format</li>
                <li>• Content and products are sorted by creation date (newest first)</li>
                <li>• Dates are in ISO 8601 format (UTC timezone)</li>
                <li>• Content includes Markdown formatting that you can render in your app</li>
                <li>• All responses include userId and blogId for identification</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-green-800 mb-2">🌐 Integration Features</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• CORS enabled - can be called directly from browser applications</li>
                <li>• Rate limiting: 100 requests per minute per IP address</li>
                <li>• Images served from global CDN for optimal performance</li>
                <li>• Content includes SEO metadata (title, description, keywords)</li>
                <li>• Products include pricing with user-specific currency settings</li>
                <li>• Advanced filtering by category, tags, price range, and date</li>
                <li>• Pagination support with limit and offset parameters</li>
                <li>• Flexible sorting by multiple fields</li>
              </ul>
            </div>
            
            <h4 className="text-lg font-semibold text-foreground mb-3">Detailed Field Information</h4>
            <div className="flex items-start">
              <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <p><strong>Content API:</strong> Returns blog posts with title, content (Markdown), featured images, SEO data, categories, tags, and author information.</p>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <p><strong>Products API:</strong> Returns products with name, description, pricing (including discounts), multiple images, categories, tags, and external purchase links.</p>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <p><strong>Multi-Image Support:</strong> Products include an imageUrls array (up to 5 images) plus a legacy imageUrl field for backward compatibility.</p>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <p><strong>Pricing Information:</strong> Products include originalPrice, discountedPrice, savings, and currency fields for complete pricing display.</p>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <p><strong>SEO Ready:</strong> Content includes seoTitle, metaDescription, and keywords arrays for search engine optimization.</p>
            </div>
            <div className="flex items-start">
              <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <p><strong>External Links:</strong> Content includes contentUrl for your website, products include productUrl for purchase/affiliate links.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Examples */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Common Integration Scenarios</h2>
          <p className="card-description">
            Real-world examples of how to use this API
          </p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">🌐 Static Website Integration</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Fetch content at build time for static site generators (Next.js, Gatsby, Nuxt)</li>
                <li>• Use as a headless CMS for JAMstack applications</li>
                <li>• Integrate with Vercel, Netlify, or other static hosting platforms</li>
                <li>• Cache responses for improved performance</li>
              </ul>
            </div>
            
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">📱 Mobile App Integration</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Fetch content for React Native, Flutter, or native mobile apps</li>
                <li>• Display blog posts and product catalogs in mobile interfaces</li>
                <li>• Implement offline caching for better user experience</li>
                <li>• Use for content-driven mobile applications</li>
              </ul>
            </div>
            
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">🛒 E-commerce Integration</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Display product catalogs on external e-commerce sites</li>
                <li>• Sync product information with third-party platforms</li>
                <li>• Create affiliate marketing websites</li>
                <li>• Build custom product showcase applications</li>
              </ul>
            </div>
            
            <div className="p-6 border border-border rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">🔧 Developer Tools</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Build custom dashboards and analytics tools</li>
                <li>• Create content migration scripts</li>
                <li>• Develop third-party integrations and plugins</li>
                <li>• Automate content workflows and publishing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Best Practices for Developers</h2>
          <p className="card-description">
            Recommendations for optimal API usage
          </p>
        </div>
        <div className="card-content">
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">⚡ Performance Optimization</h3>
              <ul className="space-y-2 text-base text-blue-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Implement caching to reduce API calls and improve response times</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Use conditional requests with ETags if your application supports them</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Filter and paginate data on the client side as needed</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">🔒 Security Considerations</h3>
              <ul className="space-y-2 text-base text-green-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>These endpoints are public - never expose sensitive data through them</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Validate and sanitize any user input when filtering API responses</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Use HTTPS in production to ensure data integrity</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">📝 Content Handling</h3>
              <ul className="space-y-2 text-base text-purple-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Use a Markdown parser to render content and product descriptions</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Handle missing or null fields gracefully in your application</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                  <span>Implement proper image loading with fallbacks for broken URLs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Troubleshooting Common Issues</h2>
          <p className="card-description">
            Solutions to frequently encountered problems
          </p>
        </div>
        <div className="card-content">
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-base font-semibold text-red-800 mb-2">❌ API Returns Empty Array</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Check that you have published content/products (not just drafts)</li>
                <li>• Verify the User ID and Blog ID in your API URL are correct</li>
                <li>• Ensure you're using the correct API endpoint URL</li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-base font-semibold text-yellow-800 mb-2">⚠️ CORS Errors in Browser</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• CORS is enabled by default - this shouldn't occur</li>
                <li>• If you encounter CORS issues, try accessing the API from a server-side environment</li>
                <li>• Check browser console for specific CORS error messages</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-base font-semibold text-blue-800 mb-2">🔍 Images Not Loading</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Image URLs are served from Firebase Storage with global CDN</li>
                <li>• Check that image URLs in the API response are valid and accessible</li>
                <li>• Implement fallback images for better user experience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Need Help?</h2>
          <p className="card-description">
            Resources and support for developers
          </p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-border rounded-lg text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Test Your API</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click the API links above to test your endpoints in the browser
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Create Content</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use the dashboard to create and publish content for your API
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Manage Products</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add products to your catalog for e-commerce integrations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy Support Notice */}
      <div className="card border-amber-200 bg-amber-50">
        <div className="card-content p-6">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">API Versioning & Backward Compatibility</h3>
              <div className="text-base text-amber-700 space-y-2">
                <p>
                  This API maintains backward compatibility for existing integrations. Products support both 
                  the legacy <code>imageUrl</code> field and the new <code>imageUrls</code> array.
                </p>
                <p>
                  <strong>Recommendation:</strong> New integrations should use the <code>imageUrls</code> array 
                  for products to access all available images, while falling back to <code>imageUrl</code> if needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Code Examples */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground mb-8">Integration Code Examples</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Copy and paste these examples to quickly integrate your CMS data into any application
        </p>

        {/* Content API Examples */}
        <h3 className="text-2xl font-bold text-foreground mb-6">Blog Content API Examples</h3>
        <div className="flex items-start">
          <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
          <p>Content items include a `contentUrl` field with the full URL for your application. Products include a `productUrl` field for external purchase/affiliate links and an `imageUrls` array containing up to 5 product images.</p>
        </div>
        <div className="flex items-start">
          <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
          <p>Product images: The `imageUrls` array contains all product images (up to 5). For backward compatibility, the first image is also available in the `imageUrl` field.</p>
        </div>
        <div className="flex items-start">
          <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
          <p>Products include a `currency` field that reflects your user-specific currency setting, ensuring consistent pricing display across all your products.</p>
        </div>
        <div className="flex items-start">
          <div className="w-3 h-3 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
          <p>All images are served from secure cloud storage with global CDN distribution for optimal performance.</p>
        </div>
      </div>
    </div>
  );
}
