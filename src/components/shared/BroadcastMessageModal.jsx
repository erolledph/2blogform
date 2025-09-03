import React from 'react';
import ReactMarkdown from 'react-markdown';
import Modal from './Modal';
import { Bell } from 'lucide-react';

export default function BroadcastMessageModal({ 
  isOpen, 
  onClose, 
  message 
}) {
  if (!message) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={message.title}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="h-6 w-6 text-primary" />
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
              Published: {message.createdAt ? new Date(message.createdAt).toLocaleDateString() : 'Recently'}
            </span>
            {message.updatedAt && message.updatedAt !== message.createdAt && (
              <span>
                Updated: {new Date(message.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

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