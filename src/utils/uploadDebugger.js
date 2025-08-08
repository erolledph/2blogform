// Debug utility for Firebase Storage uploads
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage, auth } from '@/firebase';

export const uploadDebugger = {
  // Test upload with detailed logging
  async testUpload(file, path) {
    console.log('=== UPLOAD DEBUG TEST ===');
    console.log('File info:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    console.log('Upload path:', path);
    
    // Check auth state
    const currentUser = auth.currentUser;
    console.log('Auth state:', {
      isAuthenticated: !!currentUser,
      uid: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified
    });
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Verify path matches user ID
    const pathUserId = path.split('/')[1]; // Extract userId from users/{userId}/...
    console.log('Path validation:', {
      pathUserId,
      currentUserUid: currentUser.uid,
      pathMatches: pathUserId === currentUser.uid
    });
    
    if (pathUserId !== currentUser.uid) {
      throw new Error(`Path mismatch: path contains ${pathUserId} but user is ${currentUser.uid}`);
    }
    
    try {
      const storageRef = ref(storage, path);
      console.log('Storage ref created:', storageRef.fullPath);
      
      // Attempt upload
      console.log('Starting upload...');
      const uploadResult = await uploadBytes(storageRef, file);
      console.log('Upload result:', uploadResult);
      
      // Get download URL
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      
      // Verify file was actually uploaded by getting metadata
      console.log('Verifying upload by getting metadata...');
      const metadata = await getMetadata(storageRef);
      console.log('File metadata:', {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        fullPath: metadata.fullPath
      });
      
      console.log('=== UPLOAD TEST SUCCESSFUL ===');
      return {
        success: true,
        downloadURL,
        metadata,
        uploadResult
      };
      
    } catch (uploadError) {
      console.error('=== UPLOAD TEST FAILED ===');
      console.error('Upload error:', uploadError);
      console.error('Error details:', {
        code: uploadError.code,
        message: uploadError.message,
        serverResponse: uploadError.serverResponse
      });
      
      throw uploadError;
    }
  },
  
  // Check if user can write to a specific path
  async testWritePermission(userId, testPath) {
    console.log('=== TESTING WRITE PERMISSION ===');
    console.log('User ID:', userId);
    console.log('Test path:', testPath);
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user');
      return false;
    }
    
    if (currentUser.uid !== userId) {
      console.error('User ID mismatch:', {
        authUid: currentUser.uid,
        requestedUserId: userId
      });
      return false;
    }
    
    try {
      // Create a small test file
      const testFile = new Blob(['test'], { type: 'text/plain' });
      const testFileName = `test-${Date.now()}.txt`;
      const fullTestPath = `${testPath}/${testFileName}`;
      
      const storageRef = ref(storage, fullTestPath);
      await uploadBytes(storageRef, testFile);
      
      console.log('Write permission test: SUCCESS');
      
      // Clean up test file
      try {
        await storageRef.delete();
        console.log('Test file cleaned up');
      } catch (cleanupError) {
        console.warn('Could not clean up test file:', cleanupError);
      }
      
      return true;
    } catch (error) {
      console.error('Write permission test: FAILED');
      console.error('Permission error:', error);
      return false;
    }
  }
};

// Add to window for easy debugging in browser console
if (typeof window !== 'undefined') {
  window.uploadDebugger = uploadDebugger;
}