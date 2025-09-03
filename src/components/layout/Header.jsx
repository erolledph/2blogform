import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import Modal from '@/components/shared/Modal';

export default function Header({ onMenuClick }) {
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageModal, setMessageModal] = useState({ isOpen: false });

  useEffect(() => {
    // Set up real-time listener for active broadcast messages
    const broadcastQuery = query(
      collection(db, 'broadcast-messages'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
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
        
        console.log('Real-time broadcast messages updated:', messages.length);
      },
      (error) => {
        console.error('Error in broadcast messages listener:', error);
        setLoadingMessages(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    setMessageModal({ isOpen: true });
    setShowNotifications(false);
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left side - Mobile menu button */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors duration-200"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Center - Empty space for future use */}
          <div className="flex-1 flex justify-center"></div>

          {/* Right side - Notifications */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-md hover:bg-muted transition-colors duration-200 relative"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {broadcastMessages.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingMessages ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : broadcastMessages.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No new announcements</p>
                      </div>
                    ) : (
                      broadcastMessages.map((message) => (
                        <div
                          key={message.id}
                          className="p-4 border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleMessageClick(message)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate mb-1">
                                {message.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {message.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {message.createdAt ? message.createdAt.toLocaleDateString() : 'Recently'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
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
        size="md"
      >
        {selectedMessage && (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {selectedMessage.title}
                </h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <ReactMarkdown>{selectedMessage.description}</ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
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

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={() => {
                  setMessageModal({ isOpen: false });
                  setSelectedMessage(null);
                }}
                className="btn-primary"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}