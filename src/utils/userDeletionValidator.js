// User deletion validation utilities
import { auth, db } from '@/firebase';

export const userDeletionValidator = {
  // Validate if user can be safely deleted
  async validateUserDeletion(userId, requestingUserId) {
    const validationResults = {
      canDelete: true,
      warnings: [],
      blockers: [],
      dataEstimate: {
        blogs: 0,
        content: 0,
        products: 0,
        storageFiles: 0,
        estimatedTime: '< 1 minute'
      }
    };

    try {
      // Check if user exists in Firebase Auth
      try {
        const userRecord = await auth.getUser(userId);
        validationResults.userExists = true;
        validationResults.userEmail = userRecord.email;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          validationResults.warnings.push('User not found in Firebase Authentication but may have orphaned data');
        } else {
          validationResults.blockers.push(`Authentication check failed: ${error.message}`);
        }
      }

      // Prevent self-deletion
      if (userId === requestingUserId) {
        validationResults.canDelete = false;
        validationResults.blockers.push('Cannot delete your own account');
        return validationResults;
      }

      // Estimate data to be deleted
      try {
        const userDocRef = db.collection('users').doc(userId);
        const userDoc = await userDocRef.get();
        
        if (userDoc.exists) {
          // Count blogs
          const blogsSnapshot = await userDocRef.collection('blogs').get();
          validationResults.dataEstimate.blogs = blogsSnapshot.size;
          
          // Count content and products across all blogs
          let totalContent = 0;
          let totalProducts = 0;
          
          for (const blogDoc of blogsSnapshot.docs) {
            const contentSnapshot = await blogDoc.ref.collection('content').get();
            const productsSnapshot = await blogDoc.ref.collection('products').get();
            totalContent += contentSnapshot.size;
            totalProducts += productsSnapshot.size;
          }
          
          validationResults.dataEstimate.content = totalContent;
          validationResults.dataEstimate.products = totalProducts;
          
          // Estimate deletion time based on data volume
          const totalItems = validationResults.dataEstimate.blogs + totalContent + totalProducts;
          if (totalItems > 100) {
            validationResults.dataEstimate.estimatedTime = '2-5 minutes';
            validationResults.warnings.push('Large amount of data detected. Deletion may take several minutes.');
          } else if (totalItems > 50) {
            validationResults.dataEstimate.estimatedTime = '1-2 minutes';
          }
        }
      } catch (error) {
        validationResults.warnings.push(`Could not estimate data size: ${error.message}`);
      }

      // Check for admin role
      try {
        const userSettingsRef = db.collection('users').doc(userId).collection('userSettings').doc('preferences');
        const userSettingsDoc = await userSettingsRef.get();
        
        if (userSettingsDoc.exists && userSettingsDoc.data().role === 'admin') {
          validationResults.warnings.push('This user has administrator privileges');
        }
      } catch (error) {
        validationResults.warnings.push('Could not check user role');
      }

    } catch (error) {
      validationResults.canDelete = false;
      validationResults.blockers.push(`Validation failed: ${error.message}`);
    }

    return validationResults;
  },

  // Pre-deletion checks
  async performPreDeletionChecks(userId) {
    const checks = {
      authUserExists: false,
      firestoreDataExists: false,
      storageDataExists: false,
      analyticsDataExists: false,
      errors: []
    };

    try {
      // Check Firebase Auth
      try {
        await auth.getUser(userId);
        checks.authUserExists = true;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          checks.errors.push(`Auth check failed: ${error.message}`);
        }
      }

      // Check Firestore data
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        checks.firestoreDataExists = userDoc.exists;
      } catch (error) {
        checks.errors.push(`Firestore check failed: ${error.message}`);
      }

      // Check for analytics data
      try {
        const pageViewsSnapshot = await db.collection('pageViews')
          .where('userId', '==', userId)
          .limit(1)
          .get();
        checks.analyticsDataExists = !pageViewsSnapshot.empty;
      } catch (error) {
        checks.errors.push(`Analytics check failed: ${error.message}`);
      }

    } catch (error) {
      checks.errors.push(`Pre-deletion checks failed: ${error.message}`);
    }

    return checks;
  }
};

export default userDeletionValidator;