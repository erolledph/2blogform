import { collection, doc, addDoc, updateDoc, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export const analyticsService = {
  // Track page views for content (includes userId and blogId for filtering)
  async trackPageView(contentId, slug, userId, blogId, userAgent = '', referrer = '') {
    try {
      if (!blogId) {
        throw new Error('blogId is required');
      }
      
      const viewData = {
        contentId,
        slug,
        userId,
        blogId,
        timestamp: new Date(),
        userAgent: userAgent.substring(0, 500), // Limit length
        referrer: referrer.substring(0, 500),
        ip: 'masked', // IP is masked due to static nature
        sessionId: this.generateSessionId()
      };

      await addDoc(collection(db, 'pageViews'), viewData);

      // Update content view count in user's nested collection
      const contentRef = doc(db, 'users', userId, 'blogs', blogId, 'content', contentId);
      await updateDoc(contentRef, {
        viewCount: increment(1),
        lastViewed: new Date()
      });

    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  },

  // Track content interactions (includes userId and blogId for filtering)
  async trackInteraction(contentId, interactionType, userId, blogId, metadata = {}) {
    try {
      if (!blogId) {
        throw new Error('blogId is required');
      }
      
      const interactionData = {
        contentId,
        type: interactionType, // 'click', 'share', 'like', 'comment'
        userId,
        blogId,
        metadata,
        timestamp: new Date(),
        sessionId: this.generateSessionId()
      };

      await addDoc(collection(db, 'interactions'), interactionData);

      // Update content interaction count in user's nested collection
      const contentRef = doc(db, 'users', userId, 'blogs', blogId, 'content', contentId);
      const updateField = `${interactionType}Count`;
      await updateDoc(contentRef, {
        [updateField]: increment(1)
      });

    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  },

  // Get analytics for specific content in a user's blog
  async getContentAnalytics(userId, contentId, blogId, days = 30) {
    try {
      if (!blogId) {
        throw new Error('blogId is required');
      }
      const actualBlogId = blogId;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get page views for this user's content
      const viewsQuery = query(
        collection(db, 'pageViews'),
        where('contentId', '==', contentId),
        where('userId', '==', userId),
        where('blogId', '==', actualBlogId)
      );
      const viewsSnapshot = await getDocs(viewsQuery);
      const allViews = viewsSnapshot.docs.map(doc => doc.data());
      
      // Filter by date client-side and sort
      const views = allViews
        .filter(view => view.timestamp && view.timestamp.toDate() >= startDate)
        .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

      // Get interactions for this user's content
      const interactionsQuery = query(
        collection(db, 'interactions'),
        where('contentId', '==', contentId),
        where('userId', '==', userId),
        where('blogId', '==', actualBlogId)
      );
      const interactionsSnapshot = await getDocs(interactionsQuery);
      const allInteractions = interactionsSnapshot.docs.map(doc => doc.data());
      
      // Filter by date client-side and sort
      const interactions = allInteractions
        .filter(interaction => interaction.timestamp && interaction.timestamp.toDate() >= startDate)
        .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

      // Get content details from user's nested collection
      const contentDoc = await getDoc(doc(db, 'users', userId, 'blogs', actualBlogId, 'content', contentId));
      const contentData = contentDoc.exists() ? contentDoc.data() : {};

      return {
        contentId,
        totalViews: views.length,
        totalInteractions: interactions.length,
        viewCount: contentData.viewCount || 0,
        clickCount: contentData.clickCount || 0,
        shareCount: contentData.shareCount || 0,
        views,
        interactions,
        analytics: this.processAnalytics(views, interactions)
      };

    } catch (error) {
      console.error('Error getting content analytics:', error);
      return null;
    }
  },

  // Get overall site analytics for a user's blog
  async getSiteAnalytics(userId, blogId, days = 30) {
    try {
      if (!blogId) {
        throw new Error('blogId is required');
      }
      const actualBlogId = blogId;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all page views for this user's blog
      const viewsQuery = query(
        collection(db, 'pageViews'),
        where('userId', '==', userId),
        where('blogId', '==', actualBlogId),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );
      const viewsSnapshot = await getDocs(viewsQuery);
      const views = viewsSnapshot.docs.map(doc => doc.data());

      // Get all interactions for this user's blog
      const interactionsQuery = query(
        collection(db, 'interactions'),
        where('userId', '==', userId),
        where('blogId', '==', actualBlogId),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );
      const interactionsSnapshot = await getDocs(interactionsQuery);
      const interactions = interactionsSnapshot.docs.map(doc => doc.data());

      // Get top content from user's nested collection
      const contentQuery = query(
        collection(db, 'users', userId, 'blogs', actualBlogId, 'content'),
        where('status', '==', 'published')
      );
      const contentSnapshot = await getDocs(contentQuery);
      const allContent = contentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by viewCount client-side and take top 10
      const topContent = allContent
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 10);

      return {
        totalViews: views.length,
        totalInteractions: interactions.length,
        uniqueSessions: new Set(views.map(v => v.sessionId)).size,
        topContent,
        dailyStats: this.processDailyStats(views, interactions, days),
        referrerStats: this.processReferrerStats(views),
        interactionStats: this.processInteractionStats(interactions)
      };

    } catch (error) {
      console.error('Error getting site analytics:', error);
      return null;
    }
  },

  // Get Firebase usage statistics for a user
  async getBackendUsage(userId, blogId) {
    try {
      if (!blogId) {
        throw new Error('blogId is required');
      }
      const actualBlogId = blogId;
      
      // Get document counts with error handling
      let contentCount = 0;
      let viewsCount = 0;
      let interactionsCount = 0;
      let errors = [];

      try {
        const contentSnapshot = await getDocs(collection(db, 'users', userId, 'blogs', actualBlogId, 'content'));
        contentCount = contentSnapshot.size;
      } catch (error) {
        errors.push('content');
        console.warn('Cannot access content collection:', error.message);
      }

      try {
        const viewsSnapshot = await getDocs(query(
          collection(db, 'pageViews'), 
          where('userId', '==', userId),
          where('blogId', '==', actualBlogId),
          limit(100)
        ));
        viewsCount = viewsSnapshot.size;
      } catch (error) {
        errors.push('pageViews');
        console.warn('Cannot access pageViews collection:', error.message);
      }

      try {
        const interactionsSnapshot = await getDocs(query(
          collection(db, 'interactions'), 
          where('userId', '==', userId),
          where('blogId', '==', actualBlogId),
          limit(100)
        ));
        interactionsCount = interactionsSnapshot.size;
      } catch (error) {
        errors.push('interactions');
        console.warn('Cannot access interactions collection:', error.message);
      }

      // Calculate storage usage (safe estimation)
      const storageUsage = await this.estimateStorageUsage(contentCount);

      return {
        documentCounts: {
          content: contentCount,
          pageViews: viewsCount,
          interactions: interactionsCount
        },
        estimatedReads: this.estimateReads(contentCount, viewsCount, interactionsCount),
        estimatedWrites: this.estimateWrites(contentCount),
        storageUsage,
        lastUpdated: new Date(),
        errors: errors.length > 0 ? errors : null,
        note: errors.length > 0 ? 'Some data collections could not be accessed due to permissions' : null
      };

    } catch (error) {
      console.error('Error getting backend usage:', error);
      
      // Return fallback data instead of null
      return {
        documentCounts: {
          content: 0,
          pageViews: 0,
          interactions: 0
        },
        estimatedReads: { error: 'Permission denied' },
        estimatedWrites: { error: 'Permission denied' },
        storageUsage: { error: 'Permission denied' },
        lastUpdated: new Date(),
        error: error.message,
        note: 'Backend usage data unavailable due to permissions. Check admin console for exact usage.'
      };
    }
  },

  // Helper methods
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  processAnalytics(views, interactions) {
    const dailyViews = {};
    const hourlyViews = {};

    views.forEach(view => {
      const date = view.timestamp.toDate();
      const day = date.toISOString().split('T')[0];
      const hour = date.getHours();

      dailyViews[day] = (dailyViews[day] || 0) + 1;
      hourlyViews[hour] = (hourlyViews[hour] || 0) + 1;
    });

    return {
      dailyViews,
      hourlyViews,
      peakHour: Object.keys(hourlyViews).reduce((a, b) => hourlyViews[a] > hourlyViews[b] ? a : b, '0'),
      averageViewsPerDay: Object.values(dailyViews).reduce((a, b) => a + b, 0) / Object.keys(dailyViews).length || 0
    };
  },

  processDailyStats(views, interactions, days) {
    const stats = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      stats[dateStr] = {
        views: views.filter(v => v.timestamp.toDate().toISOString().split('T')[0] === dateStr).length,
        interactions: interactions.filter(i => i.timestamp.toDate().toISOString().split('T')[0] === dateStr).length
      };
    }

    return stats;
  },

  processReferrerStats(views) {
    const referrers = {};
    views.forEach(view => {
      const referrer = view.referrer || 'Direct';
      referrers[referrer] = (referrers[referrer] || 0) + 1;
    });
    return referrers;
  },

  processInteractionStats(interactions) {
    const stats = {};
    interactions.forEach(interaction => {
      stats[interaction.type] = (stats[interaction.type] || 0) + 1;
    });
    return stats;
  },

  async estimateStorageUsage(contentCount = 0) {
    // This is an approximation since we can't get exact storage usage from client
    try {
      if (contentCount === 0) {
        return {
          estimated: true,
          contentSize: 0,
          unit: 'bytes',
          note: 'Unable to estimate - no content data available'
        };
      }

      // Very rough estimation based on average content size
      const averageContentSize = 5000; // bytes per content item (rough estimate)
      const estimatedSize = contentCount * averageContentSize;

      return {
        estimated: true,
        contentSize: estimatedSize,
        unit: 'bytes',
        note: 'This is a rough approximation based on content count. Check admin console for exact usage.'
      };
    } catch (error) {
      return { 
        error: 'Unable to estimate storage usage',
        note: 'Check admin console for exact storage usage'
      };
    }
  },

  estimateReads(contentCount = 0, viewsCount = 0, interactionsCount = 0) {
    // This would need to be tracked separately in a real implementation
    const totalDocs = contentCount + viewsCount + interactionsCount;
    return {
      estimated: true,
      approximateReads: totalDocs * 2, // Rough estimate
      note: 'Read operations are not tracked client-side. This is a rough estimate. Check admin console for exact usage.'
    };
  },

  estimateWrites(contentCount = 0) {
    // This would need to be tracked separately in a real implementation
    return {
      estimated: true,
      approximateWrites: contentCount, // Very rough estimate
      note: 'Write operations are not tracked client-side. This is a rough estimate. Check admin console for exact usage.'
    };
  }
};