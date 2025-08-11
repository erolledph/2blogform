import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  BarChart3,
  Settings,
  Folder,
  Package,
  Plus,
  Lightbulb,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  Edit,
  Upload,
  Download
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  // Create New menu will be inserted here
  { name: 'Manage Content', href: '/dashboard/manage', icon: FileText },
  { name: 'Manage Products', href: '/dashboard/manage-products', icon: Package },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'File Storage', href: '/dashboard/storage', icon: Folder },
];

const createMenuItems = [
  { name: 'Create Content', href: '/dashboard/create', icon: FileText },
  { name: 'Add Product', href: '/dashboard/create-product', icon: Package },
];

const manageMenuItems = [
  { name: 'Manage Blog', href: '/dashboard/manage-blog', icon: Edit },
];

const settingsMenuItems = [
  { name: 'User Management', href: '/dashboard/user-management', icon: Users, adminOnly: true },
  { name: 'Account Settings', href: '/dashboard/account-settings', icon: Settings },
  { name: 'Tips', href: '/dashboard/tips', icon: Lightbulb },
  { name: 'Documentation', href: '/dashboard/documentation', icon: BookOpen },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, closeSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1023);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine if sidebar should be expanded
  const shouldBeExpanded = sidebarOpen || isManuallyExpanded || (isHovered && !isManuallyExpanded && !isMobile);

  const handleLinkClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1023) {
      closeSidebar();
    }
  };

  const toggleManualExpansion = () => {
    setIsManuallyExpanded(!isManuallyExpanded);
  };

  const toggleCreateMenu = () => {
    setCreateMenuOpen(!createMenuOpen);
  };

  const toggleManageMenu = () => {
    setManageMenuOpen(!manageMenuOpen);
  };

  const toggleSettingsMenu = () => {
    setSettingsMenuOpen(!settingsMenuOpen);
  };

  const handleMouseEnter = () => {
    if (!isMobile && !isManuallyExpanded) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && !isManuallyExpanded) {
      setIsHovered(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <nav 
      className={`sidebar ${sidebarOpen ? 'open' : ''} ${shouldBeExpanded ? 'expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-header">
        <div className="logo">
          <img 
            src="/fire.svg" 
            alt="Logo" 
            className="logo-icon"
          />
          <span className="logo-text">Admin CMS</span>
        </div>
        <button className="hamburger" onClick={closeSidebar} aria-label="Close sidebar">
          <ChevronLeft />
        </button>
      </div>
      
      <ul className="nav-menu">
        {/* Overview */}
        <li className="nav-item">
          <Link
            to="/dashboard/overview"
            onClick={handleLinkClick}
            className={`nav-link ${location.pathname === '/dashboard/overview' || location.pathname === '/dashboard' ? 'active' : ''}`}
            title={!shouldBeExpanded ? 'Overview' : ''}
            aria-label="Overview"
          >
            <LayoutDashboard className="nav-link-icon" />
            <span className="nav-link-text">Overview</span>
            {!shouldBeExpanded && (
              <div className="nav-tooltip">Overview</div>
            )}
          </Link>
        </li>
        
        {/* Create New Mega Menu - moved up */}
        <li className="nav-item">
          <button
            onClick={toggleCreateMenu}
            className={`nav-link w-full text-left ${createMenuOpen ? 'active' : ''}`}
            title={!shouldBeExpanded ? 'Create New' : ''}
            aria-label="Create New"
          >
            <Plus className="nav-link-icon" />
            <span className="nav-link-text">Create</span>
            <span className="nav-link-text ml-auto">
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${createMenuOpen ? 'rotate-90' : ''}`} />
            </span>
            {!shouldBeExpanded && (
              <div className="nav-tooltip">Create New</div>
            )}
          </button>
          
          {/* Submenu */}
          {createMenuOpen && shouldBeExpanded && (
            <ul className="ml-6 mt-2 space-y-1">
              {createMenuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={handleLinkClick}
                    className={`nav-link text-sm py-2 ${location.pathname === item.href ? 'active' : ''}`}
                  >
                    <item.icon className="nav-link-icon h-4 w-4" />
                    <span className="nav-link-text">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>

        {/* Manage Mega Menu */}
        <li className="nav-item">
          <button
            onClick={toggleManageMenu}
            className={`nav-link w-full text-left ${manageMenuOpen ? 'active' : ''}`}
            title={!shouldBeExpanded ? 'Manage' : ''}
            aria-label="Manage"
          >
            <Edit className="nav-link-icon" />
            <span className="nav-link-text">Manage</span>
            <span className="nav-link-text ml-auto">
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${manageMenuOpen ? 'rotate-90' : ''}`} />
            </span>
            {!shouldBeExpanded && (
              <div className="nav-tooltip">Manage</div>
            )}
          </button>
          
          {/* Manage Submenu */}
          {manageMenuOpen && shouldBeExpanded && (
            <ul className="ml-6 mt-2 space-y-1">
              {manageMenuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={handleLinkClick}
                    className={`nav-link text-sm py-2 ${location.pathname === item.href ? 'active' : ''}`}
                  >
                    <item.icon className="nav-link-icon h-4 w-4" />
                    <span className="nav-link-text">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>

        {/* Rest of navigation items (excluding Overview since it's already rendered above) */}
        {navigation.slice(1).map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <li key={item.name} className="nav-item">
              <Link
                to={item.href}
                onClick={handleLinkClick}
                className={`nav-link ${isActive ? 'active' : ''}`}
                title={!shouldBeExpanded ? item.name : ''}
                aria-label={item.name}
              >
                <item.icon className="nav-link-icon" />
                <span className="nav-link-text">{item.name}</span>
                {!shouldBeExpanded && (
                  <div className="nav-tooltip">{item.name}</div>
                )}
              </Link>
            </li>
          );
        })}

        {/* Settings Mega Menu */}
        <li className="nav-item">
          <button
            onClick={toggleSettingsMenu}
            className={`nav-link w-full text-left ${settingsMenuOpen ? 'active' : ''}`}
            title={!shouldBeExpanded ? 'Settings' : ''}
            aria-label="Settings"
          >
            <Settings className="nav-link-icon" />
            <span className="nav-link-text">Settings</span>
            <span className="nav-link-text ml-auto">
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${settingsMenuOpen ? 'rotate-90' : ''}`} />
            </span>
            {!shouldBeExpanded && (
              <div className="nav-tooltip">Settings</div>
            )}
          </button>
          
          {/* Settings Submenu */}
          {settingsMenuOpen && shouldBeExpanded && (
            <ul className="ml-6 mt-2 space-y-1">
              {settingsMenuItems.filter(item => !item.adminOnly || currentUser?.role === 'admin').map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={handleLinkClick}
                      className={`nav-link text-sm py-2 ${isActive ? 'active' : ''}`}
                    >
                      <item.icon className="nav-link-icon h-4 w-4" />
                      <span className="nav-link-text">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      </ul>
      
      {/* Logout Section */}
      <div className="logout-section">
        <button
          onClick={handleLogout}
          className="logout-button"
          title={!shouldBeExpanded ? 'Logout' : ''}
          aria-label="Logout"
        >
          <LogOut className="logout-button-icon" />
          <span className="logout-button-text">Logout</span>
          {!shouldBeExpanded && (
            <div className="nav-tooltip">Logout</div>
          )}
        </button>
      </div>
    </nav>
  );
}