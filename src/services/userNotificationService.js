import { collection, doc, addDoc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

export const userNotificationService = {
  // Add a new notification for a user
  async addNotification(userId, type, title, description) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'userNotifications');
      
      const notificationData = {
        type, // 'limit_increase', 'system_update', etc.
        title,
        description,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(notificationsRef, notificationData);
      
      console.log('User notification added:', {
        userId,
        notificationId: docRef.id,
        type,
        title
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding user notification:', error);
      throw error;
    }
  },

  // Set up real-time listener for user notifications
  fetchNotifications(userId, callback) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'userNotifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifications = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({
              id: doc.id,
              type: data.type,
              title: data.title,
              description: data.description,
              read: data.read || false,
              createdAt: data.createdAt ? data.createdAt.toDate() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
            });
          });
          
          console.log('User notifications updated:', {
            userId,
            count: notifications.length,
            unread: notifications.filter(n => !n.read).length
          });
          
          callback(notifications);
        },
        (error) => {
          console.error('Error in user notifications listener:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up user notifications listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Mark a notification as read
  async markNotificationAsRead(userId, notificationId) {
    try {
      const notificationRef = doc(db, 'users', userId, 'userNotifications', notificationId);
      
      await updateDoc(notificationRef, {
        read: true,
        updatedAt: new Date()
      });
      
      console.log('Notification marked as read:', {
        userId,
        notificationId
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Get unread notifications count
  getUnreadCount(notifications) {
    return notifications.filter(notification => !notification.read).length;
  }
};