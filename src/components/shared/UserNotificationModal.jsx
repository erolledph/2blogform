import React from 'react';
import ReactMarkdown from 'react-markdown';
import Modal from './Modal';
import { Gift, TrendingUp, Settings, Bell } from 'lucide-react';

export default function UserNotificationModal({ 
  isOpen, 
  onClose, 
  message 
}) {
  if (!message) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'limit_increase':
        return <Gift className="h-6 w-6 text-green-600" />;
      case 'system_update':
        return <TrendingUp className="h-6 w-6 text-blue-600" />;
      case 'account_update':
        return <Settings className="h-6 w-6 text-purple-600" />;
      default:
        return <Bell className="h-6 w-6 text-primary" />;
    }
  };

  const getNotificationBgColor = (type) => {
    switch (type) {
      case 'limit_increase':
        return 'bg-green-100';
      case 'system_update':
        return 'bg-blue-100';
      case 'account_update':
        return 'bg-purple-100';
      default:
        return 'bg-primary/10';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={message.title}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 ${getNotificationBgColor(message.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
            {getNotificationIcon(message.type)}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {message.title}
            </h3>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <ReactMarkdown>
                {message.description}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Received: {message.createdAt ? message.createdAt.toLocaleDateString() : 'Recently'}
            </span>
            {message.updatedAt && message.updatedAt.getTime() !== message.createdAt?.getTime() && (
              <span>
                Updated: {message.updatedAt.toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {message.type === 'limit_increase' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Gift className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-800 font-medium">Account Upgrade</p>
                <p className="text-sm text-green-700">
                  Your account limits have been increased by an administrator. You can now take advantage of these new capabilities immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Got it!
          </button>
        </div>
      </div>
    </Modal>
  );
}