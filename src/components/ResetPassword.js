import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [token, setToken] = useState('');

  const { resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      setMessage('Invalid or missing reset token');
      setMessageType('error');
    } else {
      setToken(resetToken);
    }
  }, [searchParams]);

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
    if (!formData.newPassword || !formData.confirmPassword) {
      setMessage('Both password fields are required');
      setMessageType('error');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return false;
    }
    
    if (formData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return false;
    }
    
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      setMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      setMessageType('error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setMessage('Invalid reset token');
      setMessageType('error');
      return;
    }
    
    if (!validateForm()) return;

    try {
      const result = await resetPassword(token, formData.newPassword);
      if (result.success) {
        setMessage('Password reset successfully! Redirecting to login...');
        setMessageType('success');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to reset password');
      setMessageType('error');
    }
  };

  const getPasswordStrength = () => {
    const password = formData.newPassword;
    if (!password) return { strength: 0, text: '' };
    
    let strength = 0;
    let requirements = [];
    
    if (password.length >= 6) {
      strength += 1;
      requirements.push('✓ At least 6 characters');
    } else {
      requirements.push('✗ At least 6 characters');
    }
    
    if (/[a-z]/.test(password)) {
      strength += 1;
      requirements.push('✓ Lowercase letter');
    } else {
      requirements.push('✗ Lowercase letter');
    }
    
    if (/[A-Z]/.test(password)) {
      strength += 1;
      requirements.push('✓ Uppercase letter');
    } else {
      requirements.push('✗ Uppercase letter');
    }
    
    if (/\d/.test(password)) {
      strength += 1;
      requirements.push('✓ Number');
    } else {
      requirements.push('✗ Number');
    }
    
    const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];
    const strengthColor = ['red', 'orange', 'yellow', 'blue', 'green'][strength];
    
    return { strength, text: strengthText, color: strengthColor, requirements };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 rounded-lg shadow-lg bg-white">
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
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Reset Password</h1>
          <p className="text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm flex items-center space-x-2 ${
            messageType === 'error' 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {messageType === 'error' ? (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your new password"
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
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 bg-${passwordStrength.color}-500`}
                      style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium text-${passwordStrength.color}-600`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  {passwordStrength.requirements.map((req, index) => (
                    <div key={index} className={req.startsWith('✓') ? 'text-green-600' : 'text-red-600'}>
                      {req}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Confirm your new password"
                disabled={loading}
              />
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="mt-1 text-sm">
                {formData.newPassword === formData.confirmPassword ? (
                  <span className="text-green-600 flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Passwords match</span>
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center space-x-1">
                    <XCircle className="h-4 w-4" />
                    <span>Passwords do not match</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !token}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              loading || !token
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            } text-white`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                <span>Reset Password</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            disabled={loading}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
