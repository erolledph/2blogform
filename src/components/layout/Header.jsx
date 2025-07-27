import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';

export default function Header({ onMenuClick }) {

  return (
    <header className="bg-white border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
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

        {/* Right side - Notifications */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Notifications */}
          <button 
            className="p-2 rounded-md hover:bg-muted transition-colors duration-200 relative"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}