# Admin CMS

This project was created and pushed to GitHub using [Bolt to GitHub](https://github.com/mamertofabian/bolt-to-github) Chrome Extension.

## 🚨 Important Setup Instructions

### Firebase Configuration Required

This application requires Firebase configuration to function properly. You need to:

1. **Create a Firebase Project** (if you haven't already):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Enable Authentication, Firestore, and Storage

2. **Get Your Firebase Configuration**:
   - In Firebase Console, go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click on the web app icon `</>`
   - Copy the configuration values

3. **Set Up Environment Variables**:

   **For Local Development:**
   - Copy `.env.example` to `.env`
   - Replace the placeholder values with your actual Firebase configuration

   **For Production (Bolt Hosting):**
   - Go to your Bolt Hosting dashboard
   - Navigate to Environment Variables or Settings
   - Add each environment variable individually:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for Netlify Functions)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your_project_id.iam.gserviceaccount.com
```

   **⚠️ CRITICAL FOR PRODUCTION:**
   - All `VITE_` prefixed variables are required for the frontend to work
   - All `FIREBASE_` prefixed variables are required for admin functions to work
   - Missing any of these will cause login/signup failures in production

4. **Set Up Firebase Security Rules**:
   - Deploy the Firestore rules from `firestore.rules`
   - Deploy the Storage rules from `storage.rules`

5. **Deploy and Test**:
   - After setting environment variables, redeploy your application
   - Test login/signup functionality in production
   - Check browser console for any configuration errors

6. **Clear Browser Cache** (if needed):
   - After updating configuration, clear your browser cache completely
   - Or open the site in an incognito/private window

### 🔧 Troubleshooting Production Issues

If your database isn't working in production but works in development:

1. **Check Environment Variables**: The most common issue is missing Firebase environment variables in production
2. **Verify Firebase Project**: Ensure your Firebase project is active and has billing enabled
3. **Check Security Rules**: Verify Firestore and Storage rules are deployed correctly
4. **Test Configuration**: Open browser console in production to see detailed error messages
5. **Verify Domain**: Ensure your production domain is added to Firebase Auth authorized domains

### Service Worker Cache Issues

If you're experiencing cache-related issues (like loading old domain assets), follow these steps:

1. **Clear All Browser Data**:
   - Open Developer Tools (F12)
   - Go to Application tab
   - Click "Clear storage" and select all options
   - Click "Clear site data"

2. **Disable Service Worker Temporarily**:
   - In Developer Tools > Application > Service Workers
   - Click "Unregister" next to the service worker
   - Refresh the page

3. **Force Refresh**:
   - Use Ctrl+Shift+R (or Cmd+Shift+R on Mac) for hard refresh
   - This bypasses cache and loads fresh content

## Description

A comprehensive, multi-tenant Content Management System built with React, Firebase, and Netlify Functions. This system provides user-isolated blog management with advanced features for content creation, product catalogs, analytics, and file storage.

## Features

- **Multi-tenant Architecture**: Complete user data isolation
- **Content Management**: Rich Markdown editor with SEO optimization
- **Product Catalog**: E-commerce product management with multiple images
- **File Storage**: User-specific storage with compression and optimization
- **Analytics**: Content performance tracking and user analytics
- **Public APIs**: RESTful endpoints for headless CMS usage
- **Admin Controls**: User management and resource allocation
- **Real-time Features**: Live updates and collaborative editing

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Firebase configuration (see above)
4. Deploy Firestore and Storage rules
5. Start development server: `npm run dev`

## Usage

1. Register a new account or login with existing credentials
2. Create your first blog and start adding content
3. Use the public API endpoints to integrate with external applications
4. Manage users and resources through the admin interface (admin role required)

## Deployment

This project is configured for Netlify deployment with:
- Automatic builds from Git
- Netlify Functions for serverless backend
- Environment variable configuration
- Custom domain support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
