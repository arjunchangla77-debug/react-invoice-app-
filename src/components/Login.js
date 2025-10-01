import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { Eye, EyeOff, Moon, Sun, UserPlus, Mail, Lock, User } from 'lucide-react';



const Login = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { login, register, forgotPassword, loading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      setMessage(error);
      setMessageType('error');
    }
  }, [error]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user starts typing
    if (message) {
      setMessage('');
      setMessageType('');
      clearError();
    }
  };

  const validateForm = () => {
    if (isForgotPassword) {
      if (!formData.email) {
        const notification = showError('Email is required');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
        return false;
      }
      return true;
    }

    if (isRegistering) {
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        const notification = showError('All fields are required');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        const notification = showError('Passwords do not match');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
        return false;
      }
      
      if (formData.password.length < 6) {
        const notification = showError('Password must be at least 6 characters long');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
        return false;
      }
      
    } else {
      if (!formData.username || !formData.password) {
        const notification = showError('Username and password are required');
        if (notification) {
          setMessage(notification.message);
          setMessageType('error');
        }
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (isForgotPassword) {
        const result = await forgotPassword(formData.email);
        if (result.success) {
          // Redirect to email sent success page
          navigate('/email-sent', { state: { email: formData.email } });
        }
      } else if (isRegistering) {
        const result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName
        });
        
        if (result.success) {
          const notification = showSuccess('Registration successful! Redirecting...');
          if (notification) {
            setMessage(notification.message);
            setMessageType('success');
          }
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      } else {
        const result = await login({
          username: formData.username,
          password: formData.password
        });
        
        if (result.success) {
          const notification = showSuccess('Login successful! Redirecting...');
          if (notification) {
            setMessage(notification.message);
            setMessageType('success');
          }
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      }
    } catch (err) {
      const notification = showError(err.message || 'An error occurred');
      if (notification) {
        setMessage(notification.message);
        setMessageType('error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      fullName: '',
      confirmPassword: ''
    });
    setMessage('');
    setMessageType('');
    clearError();
  };

  const switchMode = (mode) => {
    resetForm();
    setIsRegistering(mode === 'register');
    setIsForgotPassword(mode === 'forgot');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Theme Toggle - Top Right Corner */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-full transition-colors duration-200 shadow-lg ${
            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-white hover:bg-gray-100 text-gray-700'
          }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </button>
      </div>

      <div className={`max-w-md w-full mx-4 p-8 rounded-lg shadow-lg transition-all duration-300 ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/images/logo.png" 
              alt="EnamelPure Logo" 
              className="h-16 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            messageType === 'error' 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Email field for forgot password */}
          {isForgotPassword && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter your email address"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Registration fields */}
          {isRegistering && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}

          {/* Username field */}
          {!isForgotPassword && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Password field */}
          {!isForgotPassword && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  className={`w-full pl-10 pr-12 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password field for registration */}
          {isRegistering && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            } text-white`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isRegistering && <UserPlus className="h-5 w-5" />}
                {isForgotPassword && <Mail className="h-5 w-5" />}
                <span>
                  {isForgotPassword ? 'Send Reset Email' : 
                   isRegistering ? 'Create Account' : 'Sign In'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Mode Switch Links */}
        <div className="mt-6 text-center space-y-2">
          {!isForgotPassword && !isRegistering && (
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Create Account
              </Link>
            </p>
          )}
          
          {!isRegistering && (
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isForgotPassword ? 'Remember your password?' : 'Forgot your password?'}
              <button
                onClick={() => switchMode(isForgotPassword ? 'login' : 'forgot')}
                className="ml-1 text-blue-600 hover:text-blue-500 font-medium"
                disabled={loading}
              >
                {isForgotPassword ? 'Sign In' : 'Reset Password'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
