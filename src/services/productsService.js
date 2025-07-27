import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export const productsService = {
  // Get user's products collection reference
  getUserProductsRef(userId, blogId) {
    if (!blogId) {
      throw new Error('blogId is required');
    }
    const actualBlogId = blogId;
    return collection(db, 'users', userId, 'blogs', actualBlogId, 'products');
  },

  // Fetch all products for a user's blog
  async fetchAllProducts(userId, blogId) {
    try {
      const productsRef = this.getUserProductsRef(userId, blogId);
      const snapshot = await getDocs(productsRef);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date (newest first)
      productsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });
      
      return productsData;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Fetch products by status for a user's blog
  async fetchProductsByStatus(userId, status, blogId) {
    try {
      const productsRef = this.getUserProductsRef(userId, blogId);
      const q = query(productsRef, where('status', '==', status));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching products by status:', error);
      throw error;
    }
  },

  // Fetch single product by ID for a user's blog
  async fetchProductById(userId, id, blogId) {
    try {
      if (!blogId) {
        throw new Error('blogId is required');
      }
      const actualBlogId = blogId;
      const docRef = doc(db, 'users', userId, 'blogs', actualBlogId, 'products', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw error;
    }
  },

  // Get product statistics for a user's blog
  async getProductStats(userId, blogId) {
    try {
      const productsRef = this.getUserProductsRef(userId, blogId);
      
      // Get all products
      const allProducts = await getDocs(productsRef);
      const totalProducts = allProducts.size;
      
      // Get published products
      const publishedQuery = query(productsRef, where('status', '==', 'published'));
      const publishedProducts = await getDocs(publishedQuery);
      
      // Get draft products
      const draftQuery = query(productsRef, where('status', '==', 'draft'));
      const draftProducts = await getDocs(draftQuery);
      
      // Get recent products (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentQuery = query(productsRef, where('createdAt', '>=', sevenDaysAgo));
      const recentProducts = await getDocs(recentQuery);
      
      return {
        totalProducts,
        publishedProducts: publishedProducts.size,
        draftProducts: draftProducts.size,
        recentProducts: recentProducts.size
      };
    } catch (error) {
      console.error('Error fetching product stats:', error);
      throw error;
    }
  }
};