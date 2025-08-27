# Production Setup Guide for Admin CMS

## 🚨 Critical: Firebase Environment Variables

Your application works in development but fails in production because **Firebase environment variables are not configured in your hosting environment**.

### The Problem

In development, your app reads Firebase configuration from the `.env` file. In production, hosting providers like Bolt Hosting need these variables configured separately in their dashboard.

### The Solution

#### Step 1: Access Your Hosting Dashboard
1. Go to your Bolt Hosting dashboard
2. Navigate to your project settings
3. Look for "Environment Variables" or "Settings" section

#### Step 2: Add Firebase Environment Variables

Add each of these variables with the values from your `.env` file:

**Frontend Variables (Required for login/signup):**
```
VITE_FIREBASE_API_KEY=AIzaSyDIMj57nE8OC1u0I5fYScFoGXZqPT8F1Cw
VITE_FIREBASE_AUTH_DOMAIN=admin-cms-ph.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=admin-cms-ph
VITE_FIREBASE_STORAGE_BUCKET=admin-cms-ph.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1096240812101
VITE_FIREBASE_APP_ID=1:1096240812101:web:e7ee14d4e1ac0d85fdd32c
```

**Backend Variables (Required for admin functions):**
```
FIREBASE_PROJECT_ID=admin-cms-ph
FIREBASE_STORAGE_BUCKET=admin-cms-ph.firebasestorage.app
FIREBASE_PRIVATE_KEY_ID=a799a7045d36cc72aa38d315d2ebe7e7e695d689
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDFB8NIZxvvVGC3\nyRaNyabhXy/DJRYnsI3RvHlN9ZDcuXrlLjsR3c4I4/MoTaqtOV31sHgsmPoeR4Z5\n5R8iD0uMYJJtLpwndKXfjM9M2guP1cgf91PXhDGHtp2nkVj2x98dYLDv6MQKZ4ck\nntMMRQcKObaI/OD++2EIyAgml0gb/lv4d/i3T52XJxFOfWDCiPdjxnNMLjWsahQJ\nqQpSBSnTuBxKPQw9DhuuvlZtMKnCd7GXZlF6sGFz2eLHOQ3TvUYbKAk8/uGi+hfH\nTnL1v4e3LsPIHG8PX/vy9VgmEnheDFOYBOY/G+O/v0l/WvMlcCgWoft4lqf5H0MB\n7JGQ5hmrAgMBAAECggEAXSL/xWR0OIxu0cG9JxYZDDUGK12HHQjg6TGKN/dqXGRT\nOy3A33+1as9yPG2GTi8tgrvB+vbvWMvfvhQ4RM3tHPTzkqfzSdViqYty3LW/vGTG\npnG38Mr87NW+rZzP7IvrpIP179pcfTyWDhID2qtwmf1RE21SYEXtBw0jiTZ+8DfW\nyQjdeb9BqKnmYev/e9CzEfyl7JqgI8hsjtOyeQysNZwRXnjH22tFWk7oDS42FosY\nX0nh12U3VmVanpSs4VUzIdwVkoqQyUiIdWslo4K5xDLlc/KFDL7EqBRhRjAUp7cf\ngXnWROkOx/6UtJpBhjReHt/O/QIZNPyTIJAMmEgE0QKBgQDoGI8s4bit8lSgUrsZ\nh5prMeaN0fRWuzzAq4O1tdOJuZ1GrSepp6uNAdb80h26Lr4+ogyJa6qz4lrzXK5e\nrEXlsWi62/zT/49qxdJyY6MlB42h5aiFpOFxJH1SqAairbhE1c7jC+BMX+Rshum7\nQ8KXgZavlUjzOmadXM+Oo06lcQKBgQDZUqnrQFgeFvQKXDH9Up8xpDtVRL1tqYo8\n6vVYiZMtqHRHb2SrwnL3aS2FXETblNJrAoVKwamlKMZR0I+SiIqdSS7dR3OwzIEk\ncGFMVFikDzh4KUebXWGv0OTVKqwsW72V0SLfRKykn+Phk2zRIQf+d/chY9zYWQP8\nFaDJ4/ay2wKBgQDmk5+J4yVqChlwvUALeOA8JnL56d9oWtNcRgiveVgSt0g8csG4\nlk6j43QF72iBEvcFmlACJeiMlQ/uPeEtRNCcBMga+3oN0xJT7PvJkJr/qqVWdaYa\nP1eI48ttVmhhLVynZhIHFkFbHtj7yHxkAklL4v4kqZazrQ1MwGujNTJowQKBgFAG\nnaWQYyJpZ2ItQwc6ln6MMIEct/ia1tnJ16DLwFOu1Wq8vUB2cSlkJKwYJw8IxVc8\nbWLy34p+8lCMUWIvP4PdwBEhz5tKI0AM1fdqk92N8UhmQwUWJPO+I5XPieknuy9g\n/MtkmYJhkmOtiwOTe0McX/d+s4NDfDEmsbfGZ0DDAoGBAJ+mE9EqFdWQd3OWvT2S\nVUXGKJjc58TrBKPLlDSS6x0ecNkyKSqBGe9iYAT6DjMRdT4D928wtIqHwRGME667\nKPZ6mI6YFYn4S5W6grDaRG9wkDDYnl5H+tPggJn/JYK1Gm36G6s1T988qr1jtuee\nCKwx5dD7PPnnkgNGVHW0pqDV\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@admin-cms-ph.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=107651760943285429672
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40admin-cms-ph.iam.gserviceaccount.com
```

#### Step 3: Redeploy Your Application
After adding all environment variables, redeploy your application for the changes to take effect.

#### Step 4: Test the Configuration
1. Open your production site
2. Try to log in or create an account
3. Check the browser console for any error messages
4. If you see "Firebase configuration missing" errors, double-check your environment variables

### Common Issues and Solutions

#### Issue: "Firebase configuration missing in production"
**Solution:** Environment variables are not set in hosting dashboard. Follow steps above.

#### Issue: "auth/invalid-api-key"
**Solution:** The API key is incorrect or not set. Verify the `VITE_FIREBASE_API_KEY` value.

#### Issue: "auth/project-not-found"
**Solution:** The project ID is incorrect. Verify the `VITE_FIREBASE_PROJECT_ID` value.

#### Issue: Login works but admin functions fail
**Solution:** Backend environment variables (FIREBASE_*) are missing. Add all Firebase Admin SDK variables.

### Verification Steps

After configuration, verify everything works:

1. **Test Authentication:**
   - Try logging in with existing account
   - Try creating a new account
   - Check that user data is saved properly

2. **Test Database Operations:**
   - Create new content
   - Upload images
   - Check that data persists

3. **Test Admin Functions:**
   - Try user management (if admin)
   - Test content/product operations
   - Verify API endpoints work

### Security Notes

- Never commit your `.env` file to version control
- Keep your Firebase private key secure
- Regularly rotate your Firebase keys if compromised
- Monitor your Firebase usage and billing

### Support

If you continue having issues after following this guide:

1. Check the browser console for detailed error messages
2. Verify all environment variables are exactly as shown in `.env.example`
3. Ensure your Firebase project has the correct services enabled
4. Contact your hosting provider if environment variables aren't being applied