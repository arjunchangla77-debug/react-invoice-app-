import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const EmailSent = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from state passed during navigation
  const email = location.state?.email || 'your email';

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = () => {
    navigate('/login', { state: { showForgotPassword: true, email } });
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-lg shadow-lg transition-colors duration-300 ${
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
          
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-green-600 mb-2">Email Sent Successfully!</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Check your inbox for password reset instructions
          </p>
        </div>

        {/* Email Info */}
        <div className={`p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
        } border`}>
          <div className="flex items-center space-x-3">
            <Mail className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Password reset email sent to:
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-mono`}>
                {email}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className={`p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Check your email inbox (and spam folder)
          </p>
        </div>

        {/* Important Note */}
        <div className={`p-3 rounded-lg mb-6 ${
          isDarkMode ? 'bg-yellow-900/20 border-yellow-600' : 'bg-yellow-50 border-yellow-300'
        } border`}>
          <p className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
            <strong>⚠️ Important:</strong> The reset link will expire in 30 minutes for security reasons.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleBackToLogin}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Login</span>
          </button>
          
          <button
            onClick={handleResendEmail}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            } focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <RefreshCw className="h-5 w-5" />
            <span>Resend Email</span>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailSent;
