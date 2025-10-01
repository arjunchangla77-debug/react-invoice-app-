import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Monitor, Calendar, Hash, Phone, Settings, Package } from 'lucide-react';

const AddLune = () => {
  const { officeId } = useParams();
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [formData, setFormData] = useState({
    serial_number: '',
    purchase_date: '',
    connected_phone: '',
    sbc_identifier: '',
    plan_type: ''
  });
  const [errors, setErrors] = useState({});

  const loadOfficeData = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/dental-offices/${officeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOffice(result.data);
        }
      } else {
        setMessage('Office not found');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error loading office data');
      setMessageType('error');
      console.error('Error:', error);
    }
  }, [officeId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadOfficeData();
    }
  }, [isAuthenticated, navigate, loadOfficeData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.serial_number.trim()) {
      newErrors.serial_number = 'Serial number is required';
    }
    
    if (!formData.purchase_date) {
      newErrors.purchase_date = 'Purchase date is required';
    }
    
    if (!formData.connected_phone.trim()) {
      newErrors.connected_phone = 'Connected phone number is required';
    }
    
    if (!formData.sbc_identifier.trim()) {
      newErrors.sbc_identifier = 'SBC identifier is required';
    }
    
    if (!formData.plan_type.trim()) {
      newErrors.plan_type = 'Plan type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage('Please fix the errors below');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/lune-machines', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          dental_office_id: parseInt(officeId)
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setMessage('Lune machine added successfully!');
        setMessageType('success');
        setTimeout(() => {
          navigate(`/office/${officeId}`);
        }, 1500);
      } else {
        setMessage(result.message || 'Failed to add lune machine');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error adding lune machine. Please try again.');
      setMessageType('error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!office && !message) {
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/office/${officeId}`)}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Add Lune Machine</h1>
              {office && (
                <p className={`text-lg ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  to {office.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'error' 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {message}
          </div>
        )}

        {/* Form */}
        <div className={`rounded-lg shadow-lg p-6 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Serial Number */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Serial Number *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${errors.serial_number ? 'border-red-500' : ''}`}
                  placeholder="Enter lune machine serial number"
                  disabled={loading}
                />
              </div>
              {errors.serial_number && (
                <p className="mt-1 text-sm text-red-600">{errors.serial_number}</p>
              )}
            </div>

            {/* Purchase Date */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Purchase Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${errors.purchase_date ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
              </div>
              {errors.purchase_date && (
                <p className="mt-1 text-sm text-red-600">{errors.purchase_date}</p>
              )}
            </div>

            {/* Connected Phone Number */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Connected Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="connected_phone"
                  value={formData.connected_phone}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${errors.connected_phone ? 'border-red-500' : ''}`}
                  placeholder="e.g., +1-555-123-4567"
                  disabled={loading}
                />
              </div>
              {errors.connected_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.connected_phone}</p>
              )}
            </div>

            {/* SBC Identifier */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                SBC Identifier *
              </label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="sbc_identifier"
                  value={formData.sbc_identifier}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${errors.sbc_identifier ? 'border-red-500' : ''}`}
                  placeholder="e.g., SBC-001-A"
                  disabled={loading}
                />
              </div>
              {errors.sbc_identifier && (
                <p className="mt-1 text-sm text-red-600">{errors.sbc_identifier}</p>
              )}
            </div>

            {/* Plan Type */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Plan Type *
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  name="plan_type"
                  value={formData.plan_type}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${errors.plan_type ? 'border-red-500' : ''}`}
                  disabled={loading}
                >
                  <option value="">Select Plan Type</option>
                  <option value="basic">Basic Plan</option>
                </select>
              </div>
              {errors.plan_type && (
                <p className="mt-1 text-sm text-red-600">{errors.plan_type}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(`/office/${officeId}`)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                } text-white`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Monitor className="h-5 w-5" />
                    <span>Add Lune Machine</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLune;
