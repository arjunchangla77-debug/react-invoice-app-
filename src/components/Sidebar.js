import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Home, 
  Building2, 
  Monitor, 
  FileText, 
  Plus, 
  User, 
  Settings, 
  LogOut, 
  ChevronUp,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { logout, user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Scroll functionality
  const scrollContainerRef = useRef(null);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Check scroll position and update scroll indicators
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollUp(scrollTop > 20);
      setShowScrollDown(scrollTop < scrollHeight - clientHeight - 20 && scrollHeight > clientHeight);
    }
  };

  // Smooth scroll functions
  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: -200,
        behavior: 'smooth'
      });
    }
  };

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: 200,
        behavior: 'smooth'
      });
    }
  };

  // Initialize scroll indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll(); // Initial check
      container.addEventListener('scroll', handleScroll);
      
      // Also check on resize
      const resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(container);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }
  }, [isCollapsed]); // Re-run when sidebar collapses/expands

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      description: 'Overview & Search'
    },
    {
      id: 'offices',
      label: 'Dental Offices',
      icon: Building2,
      path: '/offices',
      description: 'Manage Offices'
    },
    {
      id: 'lunes',
      label: 'Lune Machines',
      icon: Monitor,
      path: '/lunes',
      description: 'Machine Management'
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: FileText,
      path: '/invoices',
      description: 'Billing & Payments'
    }
  ];

  const actionItems = [
    {
      id: 'create-office',
      label: 'Add Office',
      icon: Plus,
      path: '/create-office',
      description: 'Create New Office'
    }
  ];

  const userItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      description: 'Account Settings'
    },
    // Only show Admin Panel for admin users
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin Panel',
      icon: Settings,
      path: '/admin',
      description: 'System Management'
    }] : [])
  ];


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const NavItem = ({ item, isActive }) => (
    <button
      onClick={() => navigate(item.path)}
      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-300 group transform hover:scale-105 hover:translate-x-1 ${
        isActive 
          ? isDarkMode 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl scale-105 translate-x-1' 
            : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-r-4 border-blue-600 shadow-lg scale-105 translate-x-1'
          : isDarkMode
            ? 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-white hover:shadow-lg'
            : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:shadow-md'
      }`}
      style={{
        boxShadow: isActive ? '0 10px 25px rgba(59, 130, 246, 0.3)' : undefined
      }}
      title={isCollapsed ? item.label : ''}
    >
      <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
        isActive 
          ? 'text-current scale-125 rotate-12' 
          : 'text-gray-500 group-hover:text-current group-hover:scale-110 group-hover:rotate-6'
      }`} />
      {!isCollapsed && (
        <div className="flex-1 text-left">
          <div className="font-medium text-sm">{item.label}</div>
          {item.description && (
            <div className={`text-xs ${
              isActive 
                ? 'text-current opacity-80' 
                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {item.description}
            </div>
          )}
        </div>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      } shadow-lg`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <img 
                src="/images/sidebar_logo.png" 
                alt="EnamelPure Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className={`font-bold text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Enamel Pure
                </h1>
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Billing Management
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center w-full">
              <img 
                src="/images/sidebar_logo.png" 
                alt="EnamelPure Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Scroll Up Button */}
        {showScrollUp && !isCollapsed && (
          <div className="absolute top-20 right-2 z-10">
            <button
              onClick={scrollUp}
              className={`p-1 rounded-full shadow-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-white hover:bg-gray-100 text-gray-600'
              }`}
              title="Scroll Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
        >
          
          {/* Main Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Main
              </h3>
            )}
            {navigationItems.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                isActive={isActive(item.path)} 
              />
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Actions
              </h3>
            )}
            {actionItems.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                isActive={isActive(item.path)} 
              />
            ))}
          </div>

          {/* User Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Account
              </h3>
            )}
            {userItems.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                isActive={isActive(item.path)} 
              />
            ))}
          </div>

        </div>

        {/* Scroll Down Button */}
        {showScrollDown && !isCollapsed && (
          <div className="absolute bottom-20 right-2 z-10">
            <button
              onClick={scrollDown}
              className={`p-1 rounded-full shadow-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-white hover:bg-gray-100 text-gray-600'
              }`}
              title="Scroll Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              isDarkMode
                ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                : 'text-red-600 hover:bg-red-50'
            }`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Logout</div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Sign out of account
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

    </>
  );
};

export default Sidebar;
