import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Building2, Calendar, DollarSign, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';

const Invoices = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInvoices(result.data);
        }
      }
    } catch (error) {
      setMessage('Error loading invoices. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadInvoices();
    }
  }, [isAuthenticated, navigate, loadInvoices]);

  const updateInvoiceStatus = async (invoiceId, status) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        loadInvoices();
        setMessage(`Invoice marked as ${status}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error updating invoice status');
      console.error('Error:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.office_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, invoice) => sum + parseFloat(invoice.total_amount), 0);
  const unpaidAmount = invoices.filter(inv => inv.status === 'unpaid').reduce((sum, invoice) => sum + parseFloat(invoice.total_amount), 0);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading invoices...
        </span>
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
            <div className="p-3 bg-purple-500 rounded-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Invoices</h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Manage billing and payments</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="Search by invoice number or office name..."
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`pl-10 pr-8 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Invoices</p>
                <p className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{invoices.length}</p>
              </div>
              <FileText className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Amount</p>
                <p className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>${totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-500" />
            </div>
          </div>
          
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Paid Amount</p>
                <p className={`text-3xl font-bold text-green-600`}>
                  ${paidAmount.toFixed(2)}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Unpaid Amount</p>
                <p className={`text-3xl font-bold text-red-600`}>
                  ${unpaidAmount.toFixed(2)}
                </p>
              </div>
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length > 0 ? (
          <div className={`rounded-lg shadow-lg overflow-hidden ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Invoice Number</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Office</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Period</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Amount</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Status</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Generated</th>
                    <th className={`px-6 py-4 text-left text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className={`hover:${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'} transition-colors`}>
                      <td className={`px-6 py-4 text-sm font-mono font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {invoice.invoice_number}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{invoice.office_name}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{invoice.month}/{invoice.year}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        ${parseFloat(invoice.total_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          {invoice.status === 'paid' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {new Date(invoice.generated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/invoice/${invoice.id}`)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateInvoiceStatus(invoice.id, invoice.status === 'paid' ? 'unpaid' : 'paid')}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              invoice.status === 'paid'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                            }`}
                          >
                            Mark {invoice.status === 'paid' ? 'Unpaid' : 'Paid'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className={`mx-auto h-16 w-16 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <div className={`text-xl mt-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {searchTerm || statusFilter !== 'all' ? 'No invoices found' : 'No invoices yet'}
            </div>
            <p className={`text-sm mt-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filters' 
                : 'Invoices will appear here once they are generated'
              }
            </p>
          </div>
        )}

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

export default Invoices;
