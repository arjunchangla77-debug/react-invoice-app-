/**
 * CreateInvoice Component
 * 
 * Allows users to create custom invoices for dental offices.
 * This component provides a form interface for creating invoices with:
 * - Office selection and details
 * - Invoice items with quantities and rates
 * - Automatic total calculations
 * - Invoice number generation
 * - Due date management
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Building2, Calendar, DollarSign, Plus, Trash2 } from 'lucide-react';
import { generateInvoiceNumber } from '../utils/invoiceNumberGenerator';

const CreateInvoice = () => {
  // Context hooks for authentication and theme
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { officeId } = useParams(); // Get office ID from URL parameters
  
  // Component state management
  const [office, setOffice] = useState(null); // Selected dental office data
  const [loading, setLoading] = useState(true); // Loading state for office data
  const [submitting, setSubmitting] = useState(false); // Loading state for form submission
  const [message, setMessage] = useState(''); // Success/error messages
  
  // Invoice form data with default values
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '', // Will be auto-generated
    issueDate: new Date().toISOString().split('T')[0], // Today's date
    dueDate: '', // User-selected due date
    description: '', // Invoice description
    items: [
      // Default invoice item
      { description: 'Lune Laser Service', quantity: 1, rate: 0, amount: 0 }
    ],
    subtotal: 0, // Calculated from items
    tax: 0, // Currently set to 0 (no tax applied)
    total: 0, // Subtotal + tax
    notes: '' // Additional notes
  });

  /**
   * Load office data when component mounts or officeId changes
   * Fetches dental office information and generates invoice number
   */
  useEffect(() => {
    const loadOfficeData = async () => {
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
            // Generate invoice number
            const invoiceNumber = generateInvoiceNumber();
            setInvoiceData(prev => ({ ...prev, invoiceNumber }));
          }
        }
      } catch (error) {
        setMessage('Error loading office data');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadOfficeData();
    }
  }, [isAuthenticated, navigate, officeId]);

  // Calculate totals
  useEffect(() => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    const total = subtotal; // No tax applied
    
    setInvoiceData(prev => ({
      ...prev,
      subtotal,
      tax: 0,
      total
    }));
  }, [invoiceData.items]);

  // Handle item changes
  const updateItem = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;
    
    // Calculate amount for quantity and rate changes
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setInvoiceData(prev => ({ ...prev, items: newItems }));
  };

  // Add new item
  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    if (invoiceData.items.length > 1) {
      const newItems = invoiceData.items.filter((_, i) => i !== index);
      setInvoiceData(prev => ({ ...prev, items: newItems }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...invoiceData,
          dental_office_id: officeId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessage('Invoice created successfully!');
          setTimeout(() => {
            navigate(`/office/${officeId}?tab=invoices`);
          }, 2000);
        } else {
          setMessage(result.message || 'Error creating invoice');
        }
      } else {
        setMessage('Error creating invoice');
      }
    } catch (error) {
      setMessage('Error creating invoice');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading...
        </span>
      </div>
    );
  }

  if (!office) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Office not found
          </div>
          <button
            onClick={() => navigate('/offices')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Offices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/office/${officeId}?tab=invoices`)}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Create Invoice</h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>for {office.name}</p>
            </div>
          </div>
        </div>

        {/* Invoice Form */}
        <div className={`rounded-lg shadow-lg p-6 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Issue Date
                </label>
                <input
                  type="date"
                  value={invoiceData.issueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, issueDate: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <input
                  type="text"
                  value={invoiceData.description}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Service description"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Invoice Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {invoiceData.items.map((item, index) => (
                  <div key={index} className={`grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-lg ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className={`w-full px-2 py-1 border rounded text-sm ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className={`w-full px-2 py-1 border rounded text-sm ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        ${item.amount.toFixed(2)}
                      </span>
                      {invoiceData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Subtotal:</span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      ${invoiceData.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className={`flex justify-between font-bold text-lg border-t pt-2 ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                  }`}>
                    <span>Total:</span>
                    <span>${invoiceData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Notes
              </label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                placeholder="Additional notes or terms..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/office/${officeId}?tab=invoices`)}
                className={`px-6 py-2 border rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>{submitting ? 'Creating...' : 'Create Invoice'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Message */}
        {message && (
          <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg ${
            message.includes('Error') 
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

export default CreateInvoice;
