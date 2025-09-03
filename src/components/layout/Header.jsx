import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Bell, X } from 'lucide-react';
import { db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { userNotificationService } from '@/services/userNotificationService';
import { broadcastReadStateService } from '@/services/broadcastReadStateService';
import ReactMarkdown from 'react-markdown';
import Modal from '@/components/shared/Modal';
import UserNotificationModal from '@/components/shared/UserNotificationModal';

export default function Header({ onMenuClick }) {
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [readBroadcastIds, setReadBroadcastIds] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [unreadUserNotificationsCount, setUnreadUserNotificationsCount] = useState(0);
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageModal, setMessageModal] = useState({ isOpen: false });
  const [userNotificationModal, setUserNotificationModal] = useState({ isOpen: false, message: null });
  const { currentUser } = useAuth();

  useEffect(() => {
    const broadcastQuery = query(
      collection(db, 'broadcast-messages'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBroadcast = onSnapshot(
      broadcastQuery,
      (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            isActive: data.isActive,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
            createdBy: data.createdBy
          });
        });
        
        setBroadcastMessages(messages);
        setLoadingMessages(false);
        
        if (currentUser?.uid && messages.length > 0) {
          const messageIds = messages.map(msg => msg.id);
          broadcastReadStateService.getUserReadBroadcasts(currentUser.uid)
            .then(readIds => {
              setReadBroadcastIds(readIds);
              const unreadCount = messageIds.filter(id => !readIds.includes(id)).length;
              setUnreadBroadcastCount(unreadCount);
            })
            .catch(error => {
              console.error('Error calculating unread broadcast count:', error);
              setReadBroadcastIds([]);
              setUnreadBroadcastCount(messages.length);
            });
        } else {
          setReadBroadcastIds([]);
          setUnreadBroadcastCount(0);
        }
      },
      (error) => {
        console.error('Error in broadcast messages listener:', error);
        setLoadingMessages(false);
      }
    );

    let unsubscribeUserNotifications = () => {};
    
    if (currentUser?.uid) {
      unsubscribeUserNotifications = userNotificationService.fetchNotifications(
        currentUser.uid,
        (notifications) => {
          setUserNotifications(notifications);
          setUnreadUserNotificationsCount(userNotificationService.getUnreadCount(notifications));
        }
      );
    }

    return () => {
      unsubscribeBroadcast();
      unsubscribeUserNotifications();
    };
  }, [currentUser?.uid]);

  const handleMessageClick = async (message) => {
    setSelectedMessage(message);
    setMessageModal({ isOpen: true });
    setShowNotifications(false);
    
    if (currentUser?.uid) {
      try {
        await broadcastReadStateService.markBroadcastAsRead(currentUser.uid, message.id);
        setUnreadBroadcastCount(prev => Math.max(0, prev - 1));
        setReadBroadcastIds(prev => [...prev, message.id]);
      } catch (error) {
        console.error('Failed to mark broadcast message as read:', error);
      }
    }
  };

  const handleUserNotificationClick = async (notification) => {
    setUserNotificationModal({ isOpen: true, message: notification });
    setShowNotifications(false);
    
    if (!notification.read && currentUser?.uid) {
      try {
        await userNotificationService.markNotificationAsRead(currentUser.uid, notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const totalUnreadCount = unreadBroadcastCount + unreadUserNotificationsCount;

  return (
    <>
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          {/* Left side - Mobile menu button */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Center - Empty space */}
          <div className="flex-1" />

          {/* Right side - Notifications */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 relative group"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold text-gray-800">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {loadingMessages ? (
                      <div className="p-6 text-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                        <p className="text-sm text-gray-500">Loading notifications...</p>
                      </div>
                    ) : broadcastMessages.length === 0 && userNotifications.length === 0 ? (
                      <div className="p-6 text-center space-y-4">
                        <Bell className="h-10 w-10 mx-auto text-gray-400" />
                        <p className="text-sm font-medium text-gray-500">No new notifications</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* User Notifications Section */}
                        {userNotifications.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-green-50 border-b border-green-100">
                              <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                                Account Updates ({unreadUserNotificationsCount} unread)
                              </h4>
                            </div>
                            {userNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-all duration-150 ${
                                  !notification.read ? 'bg-green-50/70' : ''
                                }`}
                                onClick={() => handleUserNotificationClick(notification)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    !notification.read ? 'bg-green-500' : 'bg-gray-300'
                                  }`}></div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-800 truncate">
                                        {notification.title}
                                      </p>
                                      {!notification.read && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          New
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {notification.createdAt ? notification.createdAt.toLocaleDateString() : 'Recently'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Broadcast Messages Section */}
                        {broadcastMessages.length > 0 && (
                          <div>
                            {userNotifications.length > 0 && (
                              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                  System Announcements ({unreadBroadcastCount} unread)
                                </h4>
                              </div>
                            )}
                            {broadcastMessages.map((message) => {
                              const isMessageRead = readBroadcastIds.includes(message.id);
                              return (
                                <div
                                  key={message.id}
                                  className={`px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-all duration-150 ${
                                    !isMessageRead ? 'bg-blue-50/70' : ''
                                  }`}
                                  onClick={() => handleMessageClick(message)}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                      !isMessageRead ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}></div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <p className="text-sm font-medium text-gray-800 truncate">
                                        {message.title}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {message.createdAt ? message.createdAt.toLocaleDateString() : 'Recently'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Broadcast Message Modal */}
      <Modal
        isOpen={messageModal.isOpen}
        onClose={() => {
          setMessageModal({ isOpen: false });
          setSelectedMessage(null);
        }}
        title={selectedMessage?.title}
        size="lg"
        className="max-w-2xl"
      >
        {selectedMessage && (
          <div className="space-y-6 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  {selectedMessage.title}
                </h3>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                  <ReactMarkdown>{selectedMessage.description}</ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500 gap-4">
                <span>
                  Published: {selectedMessage.createdAt ? selectedMessage.createdAt.toLocaleDateString() : 'Recently'}
                </span>
                {selectedMessage.updatedAt && selectedMessage.updatedAt.getTime() !== selectedMessage.createdAt.getTime() && (
                  <span>
                    Updated: {selectedMessage.updatedAt.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setMessageModal({ isOpen: false });
                  setSelectedMessage(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Notification Modal */}
      <UserNotificationModal
        isOpen={userNotificationModal.isOpen}
        onClose={() => {
          setUserNotificationModal({ isOpen: false, message: null });
        }}
        message={userNotificationModal.message}
      />
    </>
  );
}
