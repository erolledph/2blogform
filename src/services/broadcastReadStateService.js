import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export const broadcastReadStateService = {
  // Mark a broadcast message as read for a specific user
  async markBroadcastAsRead(userId, messageId) {
    try {
      const readStateRef = doc(db, 'users', userId, 'broadcastReadStates', messageId);
      
      await setDoc(readStateRef, {
        messageId,
        readAt: new Date(),
        read: true
      });
      
      console.log('Broadcast message marked as read:', {
        userId,
        messageId
      });
    } catch (error) {
      console.error('Error marking broadcast as read:', error);
      throw error;
    }
  },

  // Check if a broadcast message has been read by a user
  async isBroadcastRead(userId, messageId) {
    try {
      const readStateRef = doc(db, 'users', userId, 'broadcastReadStates', messageId);
      const readStateDoc = await readStateRef.get();
      
      return readStateDoc.exists() && readStateDoc.data().read === true;
    } catch (error) {
      console.error('Error checking broadcast read state:', error);
      return false;
    }
  },

  // Get all read broadcast message IDs for a user
  async getUserReadBroadcasts(userId) {
    try {
      const readStatesRef = collection(db, 'users', userId, 'broadcastReadStates');
      const q = query(readStatesRef, where('read', '==', true));
      const snapshot = await getDocs(q);
      
      const readMessageIds = [];
      snapshot.forEach(doc => {
        readMessageIds.push(doc.id);
      });
      
      return readMessageIds;
    } catch (error) {
      console.error('Error fetching user read broadcasts:', error);
      return [];
    }
  },

  // Get unread broadcast count for a user
  async getUnreadBroadcastCount(userId, allBroadcastIds) {
    try {
      const readBroadcastIds = await this.getUserReadBroadcasts(userId);
      const unreadCount = allBroadcastIds.filter(id => !readBroadcastIds.includes(id)).length;
      
      return unreadCount;
    } catch (error) {
      console.error('Error calculating unread broadcast count:', error);
      return allBroadcastIds.length; // Assume all are unread on error
    }
  }
};