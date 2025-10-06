import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Building2, Save } from 'lucide-react';
import apiService from '../services/api';

const CreateOffice = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    npi_id: '',
    state: '',
    town: '',
    address: '',
    phone_number: '',
    email: '',
    lunes: [{ 
      serial_number: '', 
      purchase_date: '', 
      connected_phone: '', 
      sbc_identifier: '', 
      plan_type: '' 
    }]
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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

  const handleLuneChange = (index, field, value) => {
    const newLunes = [...formData.lunes];
    newLunes[index][field] = value;
    setFormData(prev => ({
      ...prev,
      lunes: newLunes
    }));
    
    // Clear error for this lune field
    const errorKey = `lunes.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  const addLune = () => {
    setFormData(prev => ({
      ...prev,
      lunes: [...prev.lunes, { 
        serial_number: '', 
        purchase_date: '', 
        connected_phone: '', 
        sbc_identifier: '', 
        plan_type: '' 
      }]
    }));
  };

  const removeLune = (index) => {
    if (formData.lunes.length > 1) {
      const newLunes = formData.lunes.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        lunes: newLunes
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate office fields
    if (!formData.name.trim()) newErrors.name = 'Office name is required';
    if (!formData.npi_id.trim()) {
      newErrors.npi_id = 'NPI ID is required';
    } else if (!/^\d{10}$/.test(formData.npi_id)) {
      newErrors.npi_id = 'NPI ID must be exactly 10 digits';
    }
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.town.trim()) newErrors.town = 'Town is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Validate lunes
    formData.lunes.forEach((lune, index) => {
      if (!lune.serial_number.trim()) {
        newErrors[`lunes.${index}.serial_number`] = 'Serial number is required';
      }
      if (!lune.purchase_date) {
        newErrors[`lunes.${index}.purchase_date`] = 'Purchase date is required';
      }
      if (!lune.connected_phone.trim()) {
        newErrors[`lunes.${index}.connected_phone`] = 'Connected phone number is required';
      }
      if (!lune.sbc_identifier.trim()) {
        newErrors[`lunes.${index}.sbc_identifier`] = 'SBC identifier is required';
      }
      if (!lune.plan_type.trim()) {
        newErrors[`lunes.${index}.plan_type`] = 'Plan type is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage('Please fill the required fields');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const result = await apiService.createDentalOffice(formData);
      
      if (result.success) {
        setMessage('Dental office created successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setMessage(result.message || 'Failed to create dental office');
      }
    } catch (error) {
      setMessage('Error creating dental office. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Add New Dental Office</h1>
          </div>
        </div>

        {/* Form */}
        <div className={`max-w-4xl mx-auto rounded-lg shadow-lg p-8 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Office Information */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 flex items-center space-x-2 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                <Building2 className="w-5 h-5" />
                <span>Office Information</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Office Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter office name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    NPI ID *
                  </label>
                  <input
                    type="text"
                    name="npi_id"
                    value={formData.npi_id}
                    onChange={handleInputChange}
                    maxLength="10"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.npi_id ? 'border-red-500' : ''}`}
                    placeholder="10-digit NPI ID"
                  />
                  {errors.npi_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.npi_id}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.state ? 'border-red-500' : ''}`}
                    placeholder="Enter state"
                  />
                  {errors.state && (
                    <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Town *
                  </label>
                  <input
                    type="text"
                    name="town"
                    value={formData.town}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.town ? 'border-red-500' : ''}`}
                    placeholder="Enter town"
                  />
                  {errors.town && (
                    <p className="text-red-500 text-sm mt-1">{errors.town}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.address ? 'border-red-500' : ''}`}
                    placeholder="Enter full address"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.phone_number ? 'border-red-500' : ''}`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lune Machines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold flex items-center space-x-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <span>Lune Machines</span>
                </h2>
                <button
                  type="button"
                  onClick={addLune}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Lune</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.lunes.map((lune, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        Lune #{index + 1}
                      </h3>
                      {formData.lunes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLune(index)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Serial Number *
                        </label>
                        <input
                          type="text"
                          value={lune.serial_number}
                          onChange={(e) => handleLuneChange(index, 'serial_number', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } ${errors[`lunes.${index}.serial_number`] ? 'border-red-500' : ''}`}
                          placeholder="Enter serial number"
                        />
                        {errors[`lunes.${index}.serial_number`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`lunes.${index}.serial_number`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Purchase Date *
                        </label>
                        <input
                          type="date"
                          value={lune.purchase_date}
                          onChange={(e) => handleLuneChange(index, 'purchase_date', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-600 border-gray-500 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } ${errors[`lunes.${index}.purchase_date`] ? 'border-red-500' : ''}`}
                        />
                        {errors[`lunes.${index}.purchase_date`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`lunes.${index}.purchase_date`]}</p>
                        )}
                      </div>
                    </div>

                    {/* New Fields Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Connected Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={lune.connected_phone}
                          onChange={(e) => handleLuneChange(index, 'connected_phone', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } ${errors[`lunes.${index}.connected_phone`] ? 'border-red-500' : ''}`}
                          placeholder="e.g., +1-555-123-4567"
                        />
                        {errors[`lunes.${index}.connected_phone`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`lunes.${index}.connected_phone`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          SBC Identifier *
                        </label>
                        <input
                          type="text"
                          value={lune.sbc_identifier}
                          onChange={(e) => handleLuneChange(index, 'sbc_identifier', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } ${errors[`lunes.${index}.sbc_identifier`] ? 'border-red-500' : ''}`}
                          placeholder="e.g., SBC-001-A"
                        />
                        {errors[`lunes.${index}.sbc_identifier`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`lunes.${index}.sbc_identifier`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Plan Type *
                        </label>
                        <select
                          value={lune.plan_type}
                          onChange={(e) => handleLuneChange(index, 'plan_type', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-600 border-gray-500 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } ${errors[`lunes.${index}.plan_type`] ? 'border-red-500' : ''}`}
                        >
                          <option value="">Select Plan Type</option>
                          <option value="basic">Basic Plan</option>
                        </select>
                        {errors[`lunes.${index}.plan_type`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`lunes.${index}.plan_type`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={`px-6 py-3 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{loading ? 'Creating...' : 'Create Office'}</span>
              </button>
            </div>
          </form>

          {message && (
            <div className={`mt-6 p-3 rounded-lg text-center ${
              message.includes('Error') || message.includes('fix') || message.includes('Please fill') || message.includes('Failed')
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOffice;
