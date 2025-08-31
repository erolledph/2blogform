# Admin CMS - Multi-Tenant Content Management System

A comprehensive, production-ready Content Management System built with React, Firebase, and Netlify Functions. This system provides user-isolated blog management with advanced features for content creation, product catalogs, analytics, and file storage.

## 🚀 Live Demo & Features

- **Multi-tenant Architecture**: Complete user data isolation
- **Dual Content Types**: Blog posts and product catalogs
- **Public REST APIs**: Headless CMS capabilities
- **Advanced Admin Controls**: User management and resource allocation
- **Real-time Analytics**: Performance tracking and insights
- **File Storage Management**: User-specific storage with optimization

## 🏗️ Technical Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** with custom design system
- **React Router v6** for client-side navigation
- **Firebase SDK** for authentication and data
- **SimpleMDE** for rich Markdown editing

### Backend
- **Firebase Firestore** for NoSQL database
- **Firebase Authentication** with role-based access
- **Firebase Storage** for file management
- **Netlify Functions** for serverless backend
- **RESTful APIs** with JSON responses

## 🔐 Security & Multi-Tenancy

- **Complete Data Isolation**: Each user's data is stored in user-specific Firestore subcollections
- **Role-Based Access Control**: Admin and user roles with different privilege levels
- **Storage Security**: User-specific storage paths with access controls
- **API Security**: Public read-only access to published content only

## 📊 Core Features

### Content Management
- Rich Markdown editor with live preview
- SEO optimization fields (meta description, keywords, SEO title)
- Featured image support with gallery selection
- Categories and tags for organization
- Draft/published status management
- Bulk operations (publish, unpublish, delete)
- Import/export functionality

### Product Catalog
- Product creation with multiple images (up to 5 per product)
- Pricing with discount percentage support
- User-specific currency settings
- Rich product descriptions with Markdown
- External product URL linking
- Category and tag organization

### Multi-Blog Management
- Multiple blogs per user (configurable limits)
- Blog switching interface with active blog indicator
- Blog creation, editing, and deletion
- Blog-specific content and product isolation
- API endpoints unique to each blog

### File Storage & Analytics
- User-isolated storage with configurable limits
- Advanced image compression and optimization
- Analytics tracking for content performance
- Storage usage monitoring
- Real-time analytics updates

### Admin Features
- User role management (admin/user)
- Multi-blog access control
- Storage limit management
- User settings administration
- System-wide user overview

## 🌐 Public API System

The system exposes public REST APIs for headless CMS functionality:

### Content API
```
GET /users/{uid}/blogs/{blogId}/api/content.json
```
Returns all published blog content with SEO metadata, images, categories, and tags.

### Products API
```
GET /users/{uid}/blogs/{blogId}/api/products.json
```
Returns all published products with pricing, discounts, multiple images, and user-specific currency.

### API Features
- **CORS Enabled**: Direct browser access supported
- **No Authentication Required**: Public read-only access
- **Multi-Tenant**: User and blog isolation maintained
- **JSON Format**: Consistent, well-structured responses
- **Rate Limited**: 100 requests per minute per IP
- **Filtering & Pagination**: Query parameters for advanced filtering

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore and Storage enabled
- Netlify account for function deployment

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd admin-cms
   npm install
   ```

2. **Configure Firebase:**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase configuration
   ```

3. **Deploy Firestore rules:**
   ```bash
   # Deploy firestore.rules and storage.rules to your Firebase project
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Deploy functions:**
   ```bash
   # Deploy to Netlify or run locally with:
   npm run netlify
   ```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Firebase Client Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for Netlify Functions)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, Header, Dashboard)
│   └── shared/          # Reusable UI components
├── features/
│   ├── auth/           # Authentication pages
│   └── dashboard/      # Dashboard feature modules
├── hooks/              # Custom React hooks
├── services/           # API and Firebase service layers
├── utils/              # Utility functions and helpers
├── contexts/           # React contexts for global state
└── preview/            # Public preview pages

netlify/functions/      # Serverless backend functions
├── admin-*.cjs        # Admin operations (CRUD, user management)
├── content-api.cjs    # Public content API
├── product-api.cjs    # Public products API
├── export-*.cjs       # Data export functions
└── import-*.cjs       # Data import functions
```

## 🔧 Key Configuration Files

- `firestore.rules` - Database security rules for multi-tenant isolation
- `storage.rules` - File storage security rules
- `netlify.toml` - Deployment and API routing configuration
- `tailwind.config.js` - Design system configuration
- `vite.config.js` - Build optimization and path aliases

## 🎯 Use Cases

### As a Traditional CMS
- Create and manage blog content with rich editor
- Organize content with categories and tags
- SEO optimization with meta fields
- Multi-blog management for different topics

### As a Headless CMS
- Fetch content via REST APIs for static sites
- Mobile app content integration
- Third-party website content syndication
- Custom application data source

### As an E-commerce Platform
- Product catalog management
- Pricing with discount support
- Multiple product images
- External purchase link integration

## 📈 Scalability

- **Users**: Unlimited (multi-tenant architecture)
- **Blogs per User**: Configurable (admin-controlled)
- **Storage per User**: Configurable (admin-controlled)
- **Content/Products**: Unlimited per blog
- **API Performance**: Sub-500ms response times
- **Global CDN**: Firebase Storage for image delivery

## 🔒 Security Features

- **Multi-tenant Data Isolation**: Complete separation of user data
- **Role-based Access Control**: Admin and user permissions
- **Secure File Storage**: User-specific storage paths
- **API Rate Limiting**: Protection against abuse
- **Input Validation**: Both client and server-side validation
- **CORS Configuration**: Secure cross-origin requests

## 🚀 Deployment

### Frontend (Netlify)
- Static site generation with dynamic API integration
- Global CDN distribution
- Custom domain support
- Automatic HTTPS

### Backend (Netlify Functions)
- Serverless function deployment
- Automatic scaling
- Environment variable management
- Firebase Admin SDK integration

### Database & Storage (Firebase)
- Managed Firestore database
- Global file storage with CDN
- Automatic backups
- Security rules enforcement

## 📚 Documentation

- **API Documentation**: Complete with code examples (available in dashboard)
- **User Guides**: Built-in help and troubleshooting
- **Developer Resources**: Integration examples for multiple languages
- **SEO Tips**: Best practices for content optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Available in the dashboard under Settings > Documentation
- **API Testing**: Use the provided endpoints to test integration
- **Issues**: Report bugs and feature requests via GitHub issues

---

**Status**: ✅ Production Ready - Fully functional multi-tenant CMS with public APIs