import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';

export default function Header({ onMenuClick }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
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

        {/* Center - Empty space */}
        <div className="flex-1"></div>

        {/* Right side - Notifications */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Notifications */}
          <div className="relative">
            <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-md hover:bg-muted transition-colors duration-200 relative"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse"></span>
            )}
          </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-medium text-foreground">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <div key={index} className="p-3 border-b border-border last:border-b-0 hover:bg-muted/30">
                          <p className="text-sm text-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-border">
                      <button
                        onClick={() => setNotifications([])}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Clear all notifications
                      </button>
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}