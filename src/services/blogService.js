import { collection, getDocs, doc, setDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

export const blogService = {
  // Fetch all blogs for a user
  async fetchUserBlogs(userId) {
    try {
      const blogsRef = collection(db, 'users', userId, 'blogs');
      const q = query(blogsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const blogs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        blogs.push({
          id: doc.id,
          name: data.name || `Blog ${doc.id.substring(0, 8)}`,
          description: data.description || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isDefault: data.isDefault || false
        });
      });
      
      return blogs;
    } catch (error) {
      console.error('Error fetching user blogs:', error);
      throw error;
    }
  },

  // Create a new blog for a user
  async createNewBlog(userId, blogName, description = '') {
    try {
      // Generate a unique blog ID (you could also let Firestore auto-generate)
      const blogId = `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const blogRef = doc(db, 'users', userId, 'blogs', blogId);
      
      const blogData = {
        name: blogName.trim(),
        description: description.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
        // Additional metadata
        contentCount: 0,
        productCount: 0,
        status: 'active'
      };
      
      await setDoc(blogRef, blogData);
      
      return {
        id: blogId,
        ...blogData
      };
    } catch (error) {
      console.error('Error creating new blog:', error);
      throw error;
    }
  },

  // Get blog details by ID
  async getBlogById(userId, blogId) {
    try {
      const blogRef = doc(db, 'users', userId, 'blogs', blogId);
      const blogSnap = await getDoc(blogRef);
      
      if (blogSnap.exists()) {
        return {
          id: blogSnap.id,
          ...blogSnap.data()
        };
      } else {
        throw new Error('Blog not found');
      }
    } catch (error) {
      console.error('Error fetching blog by ID:', error);
      throw error;
    }
  },

  // Update blog details
  async updateBlog(userId, blogId, updates) {
    try {
      const blogRef = doc(db, 'users', userId, 'blogs', blogId);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await setDoc(blogRef, updateData, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating blog:', error);
      throw error;
    }
  },

  // Ensure user has a default blog (create one if they don't have any)
  async ensureDefaultBlog(userId) {
    try {
      const blogs = await this.fetchUserBlogs(userId);
      
      if (blogs.length === 0) {
        // Create a default blog for the user
        const defaultBlog = await this.createNewBlog(userId, 'My Blog', 'My personal blog');
        
        // Mark it as default
        await this.updateBlog(userId, defaultBlog.id, { isDefault: true });
        
        return defaultBlog.id;
      }
      
      // Return the first blog (or default blog if one exists)
      const defaultBlog = blogs.find(blog => blog.isDefault) || blogs[0];
      return defaultBlog.id;
    } catch (error) {
      console.error('Error ensuring default blog:', error);
      // Re-throw error instead of using userId fallback to prevent data sync issues
      throw new Error('Failed to ensure default blog: ' + error.message);
    }
  },

  // Delete a blog and all its associated content
  async deleteBlog(userId, blogId, authToken) {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ blogId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting blog:', error);
      throw error;
    }
  },

  // Check if user can manage multiple blogs
  async canUserManageMultipleBlogs(userId) {
    try {
      const userSettingsRef = doc(db, 'users', userId, 'userSettings', 'preferences');
      const userSettingsSnap = await getDoc(userSettingsRef);
      
      if (userSettingsSnap.exists()) {
        const data = userSettingsSnap.data();
        return data.canManageMultipleBlogs || false;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking multi-blog permission:', error);
      return false;
    }
  }
};
