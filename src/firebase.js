import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Enhanced production debugging
console.log('=== FIREBASE CONFIGURATION DEBUG ===');
console.log('Environment mode:', import.meta.env.MODE);
console.log('Is production:', import.meta.env.PROD);
console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'Server-side');

console.log('Firebase config status:', {
  apiKey: firebaseConfig.apiKey ? `Present (${firebaseConfig.apiKey.substring(0, 10)}...)` : '❌ MISSING',
  authDomain: firebaseConfig.authDomain || '❌ MISSING',
  projectId: firebaseConfig.projectId || '❌ MISSING',
  storageBucket: firebaseConfig.storageBucket || '❌ MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId ? `Present (${firebaseConfig.messagingSenderId})` : '❌ MISSING',
  appId: firebaseConfig.appId ? `Present (${firebaseConfig.appId.substring(0, 15)}...)` : '❌ MISSING'
});

// Check for common production issues
const missingVars = [];
if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
if (!firebaseConfig.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!firebaseConfig.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
if (!firebaseConfig.storageBucket) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!firebaseConfig.messagingSenderId) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!firebaseConfig.appId) missingVars.push('VITE_FIREBASE_APP_ID');

if (missingVars.length > 0) {
  console.error('🚨 CRITICAL: Missing Firebase environment variables in production:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('');
  console.error('📋 TO FIX THIS ISSUE:');
  console.error('1. Go to your hosting provider dashboard (Bolt Hosting)');
  console.error('2. Navigate to Environment Variables or Settings');
  console.error('3. Add these missing variables with your Firebase values:');
  missingVars.forEach(varName => {
    console.error(`   ${varName}=your_firebase_${varName.toLowerCase().replace('vite_firebase_', '')}`);
  });
  console.error('4. Redeploy your application');
  console.error('');
  console.error('💡 You can find these values in your Firebase Console:');
  console.error('   https://console.firebase.google.com/ → Project Settings → General → Your apps');
}

// Validate critical config values
if (!firebaseConfig.apiKey) {
  console.error('CRITICAL: Firebase API key is missing!');
  if (import.meta.env.PROD) {
    alert('🚨 Firebase configuration missing in production! Check console for setup instructions.');
  }
}
if (!firebaseConfig.authDomain) {
  console.error('CRITICAL: Firebase auth domain is missing!');
}
if (!firebaseConfig.projectId) {
  console.error('CRITICAL: Firebase project ID is missing!');
}

// Attempt to initialize with fallback values for development
let finalConfig = firebaseConfig;

// If in production and config is missing, show helpful error
if (import.meta.env.PROD && missingVars.length > 0) {
  console.error('🚨 Cannot initialize Firebase in production without proper configuration');
  
  // Create a minimal error display
  if (typeof window !== 'undefined') {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: white; padding: 16px; z-index: 9999; text-align: center; font-family: system-ui;">
        <h3 style="margin: 0 0 8px 0;">🚨 Firebase Configuration Missing</h3>
        <p style="margin: 0; font-size: 14px;">Database connection failed. Please check environment variables in hosting settings.</p>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log('✅ Firebase services initialized:', {
  auth: !!auth,
  db: !!db,
  storage: !!storage,
  timestamp: new Date().toISOString()
});

// Test Firebase connection
if (typeof window !== 'undefined') {
  auth.onAuthStateChanged((user) => {
    console.log('🔐 Auth state changed:', {
      isAuthenticated: !!user,
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE
    });
  });
  
}

export default app;
