// User deletion validation utilities
import { db } from '@/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

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
      // Prevent self-deletion
      if (userId === requestingUserId) {
        validationResults.canDelete = false;
        validationResults.blockers.push('Cannot delete your own account');
        return validationResults;
      }

      // Validate userId format
      if (!userId || typeof userId !== 'string' || userId.length < 10) {
        validationResults.canDelete = false;
        validationResults.blockers.push('Invalid user ID format');
        return validationResults;
      }

      // Estimate data to be deleted
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          validationResults.userExists = true;
          
          // Count blogs
          const blogsRef = collection(db, 'users', userId, 'blogs');
          const blogsSnapshot = await getDocs(blogsRef);
          validationResults.dataEstimate.blogs = blogsSnapshot.size;
          
          // Count content and products across all blogs
          let totalContent = 0;
          let totalProducts = 0;
          
          for (const blogDoc of blogsSnapshot.docs) {
            try {
              const contentRef = collection(db, 'users', userId, 'blogs', blogDoc.id, 'content');
              const contentSnapshot = await getDocs(contentRef);
              totalContent += contentSnapshot.size;
              
              const productsRef = collection(db, 'users', userId, 'blogs', blogDoc.id, 'products');
              const productsSnapshot = await getDocs(productsRef);
              totalProducts += productsSnapshot.size;
            } catch (error) {
              console.warn(`Error counting data for blog ${blogDoc.id}:`, error);
              // Continue with other blogs even if one fails
            }
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
        } else {
          validationResults.warnings.push('User document not found in Firestore but may exist in Authentication');
        }
      } catch (error) {
        console.warn('Could not estimate data size:', error);
        validationResults.warnings.push(`Could not estimate data size: ${error.message}`);
      }

      // Check for admin role
      try {
        const userSettingsRef = doc(db, 'users', userId, 'userSettings', 'preferences');
        const userSettingsDoc = await getDoc(userSettingsRef);
        
        if (userSettingsDoc.exists() && userSettingsDoc.data().role === 'admin') {
          validationResults.warnings.push('This user has administrator privileges');
        }
      } catch (error) {
        console.warn('Could not check user role:', error);
        validationResults.warnings.push('Could not check user role');
      }

    } catch (error) {
      console.error('Validation error:', error);
      validationResults.canDelete = false;
      validationResults.blockers.push(`Validation failed: ${error.message}`);
    }

    return validationResults;
  },

  // Pre-deletion checks using client-side Firestore
  async performPreDeletionChecks(userId) {
    const checks = {
      authUserExists: null, // Cannot check from client side
      firestoreDataExists: false,
      storageDataExists: null, // Cannot easily check from client side
      analyticsDataExists: false,
      errors: []
    };

    try {
      // Check Firestore data
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        checks.firestoreDataExists = userDoc.exists();
      } catch (error) {
        checks.errors.push(`Firestore check failed: ${error.message}`);
      }

      // Check for analytics data (limited check)
      try {
        const pageViewsRef = collection(db, 'pageViews');
        // Note: We can't efficiently query by userId from client side due to security rules
        // This is a limitation of client-side validation
        checks.analyticsDataExists = null; // Cannot determine from client side
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
