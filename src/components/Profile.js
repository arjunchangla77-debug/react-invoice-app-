import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { User, Mail, Shield, Save, Eye, EyeOff, Lock, Settings, Bell } from 'lucide-react';
import apiService from '../services/api';

const Profile = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const { 
    notificationPreferences, 
    updateNotificationPreferences: updateNotificationPrefs,
    showSuccess,
    showError 
  } = useNotification();
  const navigate = useNavigate();

  // Helper function to safely format dates
  const formatDate = (dateString, format = 'locale') => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return format === 'locale' ? date.toLocaleDateString() : date.toLocaleString();
    } catch (error) {
      return null;
    }
  };
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'User',
    lastLogin: null,
    createdAt: null
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: notificationPreferences.emailNotifications,
    systemNotifications: notificationPreferences.systemNotifications,
    language: 'en',
    timezone: 'UTC'
  });

  // Load user profile data
  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      const [profileResponse, preferencesResponse] = await Promise.all([
        apiService.getProfile(),
        apiService.getNotificationPreferences()
      ]);
      
      if (profileResponse.success) {
        const userData = profileResponse.data.user;
        console.log('Profile data received:', userData); // Debug log
        setProfileData({
          username: userData.username,
          email: userData.email,
          fullName: userData.fullName || '',
          role: userData.role === 'admin' ? 'Administrator' : 'User',
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt
        });
      }

      if (preferencesResponse.success) {
        const prefsData = preferencesResponse.data;
        console.log('Preferences data received:', prefsData); // Debug log
        setPreferences(prev => ({
          ...prev,
          emailNotifications: prefsData.emailNotifications,
          systemNotifications: prefsData.systemNotifications
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage('Failed to load profile data');
      setMessageType('error');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Always fetch fresh profile data to ensure we have the latest information
      loadProfileData();
    }
  }, [isAuthenticated, navigate]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await apiService.makeRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: profileData.fullName,
          email: profileData.email
        })
      });

      if (response.success) {
        const notification = showSuccess('Profile updated successfully!');
        if (notification) {
          setMessage(notification.message);
          setMessageType('success');
        }
        // Reload profile data to get updated info
        await loadProfileData();
      } else {
        const notification = showError(response.message || 'Failed to update profile');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const notification = showError(error.message || 'Failed to update profile');
      if (notification) {
        setMessage(notification.message);
        setMessageType('error');
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      const notification = showError('New passwords do not match');
      if (notification) {
        setMessage(notification.message);
        setMessageType('error');
      }
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      const notification = showError('Password must be at least 6 characters long');
      if (notification) {
        setMessage(notification.message);
        setMessageType('error');
      }
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        const notification = showSuccess('Password changed successfully!');
        if (notification) {
          setMessage(notification.message);
          setMessageType('success');
        }
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const notification = showError(response.message || 'Failed to change password');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
      }
    } catch (error) {
      console.error('Password change error:', error);
      const notification = showError(error.message || 'Failed to change password');
      if (notification) {
        setMessage(notification.message);
        setMessageType('error');
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    }
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      // Update notification preferences using the context
      const result = await updateNotificationPrefs(
        preferences.emailNotifications,
        preferences.systemNotifications
      );

      if (result.success) {
        const notification = showSuccess('Preferences updated successfully!');
        if (notification) {
          setMessage(notification.message);
          setMessageType('success');
        }
      } else {
        const notification = showError(result.message || 'Failed to update preferences');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
      }
    } catch (error) {
      console.error('Preferences update error:', error);
      // Revert the toggle if the API call fails - reload from profile data
      await loadProfileData();
      setMessage(error.message || 'Failed to update preferences');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    }
  };

  // Show loading spinner while profile data is being fetched
  if (profileLoading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Profile</h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className={`rounded-lg shadow-lg p-6 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {profileData.fullName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {profileData.fullName}
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {profileData.role}
                  </p>
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:translate-x-1 ${
                        activeTab === tab.id
                          ? isDarkMode
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl scale-105 translate-x-1'
                            : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 shadow-lg scale-105 translate-x-1'
                          : isDarkMode
                            ? 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:shadow-lg'
                            : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:shadow-md'
                      }`}
                      style={{
                        boxShadow: activeTab === tab.id ? '0 10px 25px rgba(59, 130, 246, 0.3)' : undefined
                      }}
                    >
                      <IconComponent className={`w-5 h-5 transition-all duration-300 ${
                        activeTab === tab.id ? 'scale-125 rotate-12' : 'group-hover:scale-110 group-hover:rotate-6'
                      }`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
              
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className={`rounded-lg shadow-lg p-6 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Profile Information Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className={`text-xl font-semibold mb-6 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Profile Information</h2>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Username
                        </label>
                        <input
                          type="text"
                          value={profileData.username}
                          onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          disabled
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.fullName}
                          onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Role
                        </label>
                        <input
                          type="text"
                          value={profileData.role}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-gray-100 border-gray-300 text-gray-900'
                          }`}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Last Login
                        </label>
                        <input
                          type="text"
                          value={formatDate(profileData.lastLogin, 'full') || 'Never'}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-gray-100 border-gray-300 text-gray-900'
                          }`}
                          disabled
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Account Created
                        </label>
                        <input
                          type="text"
                          value={formatDate(profileData.createdAt) || 'Unknown'}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-gray-100 border-gray-300 text-gray-900'
                          }`}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className={`text-xl font-semibold mb-6 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Security Settings</h2>

                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Shield className="w-5 h-5" />
                        )}
                        <span>{loading ? 'Changing...' : 'Change Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className={`text-xl font-semibold mb-6 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Preferences</h2>

                  <form onSubmit={handlePreferencesUpdate} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className={`text-lg font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <label className={`text-sm font-medium ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Email Notifications
                            </label>
                            <p className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Receive email updates about invoices and system changes
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.emailNotifications}
                            onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bell className="w-5 h-5 text-gray-400" />
                          <div>
                            <label className={`text-sm font-medium ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              System Notifications
                            </label>
                            <p className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Show in-app notifications for important events
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.systemNotifications}
                            onChange={(e) => setPreferences({...preferences, systemNotifications: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        <span>{loading ? 'Saving...' : 'Save Preferences'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg ${
            messageType === 'error'
              ? 'bg-red-50 text-red-600 border border-red-200' 
              : 'bg-green-50 text-green-600 border border-green-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
