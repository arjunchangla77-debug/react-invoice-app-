/**
 * Dashboard Component
 * 
 * Main dashboard for the EnamelPure Lune Laser Management System.
 * Provides an overview of:
 * - Dental offices and their status
 * - Financial summary (total owed vs paid)
 * - Search functionality for offices and Lune machines
 * - Quick access to create new offices and invoices
 * - Real-time updates when data changes
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Building2, Sun, Moon, DollarSign, CheckCircle } from 'lucide-react';
import apiService from '../services/api';

const Dashboard = () => {
  // Context hooks for authentication, theme, and navigation
  const { isAuthenticated } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // State management for dashboard data
  const [dentalOffices, setDentalOffices] = useState([]); // All dental offices
  const [filteredOffices, setFilteredOffices] = useState([]); // Filtered offices based on search
  const [searchTerm, setSearchTerm] = useState(''); // Office search term
  const [luneSearchTerm, setLuneSearchTerm] = useState(''); // Lune machine search term
  const [loading, setLoading] = useState(true); // Loading state
  const [message, setMessage] = useState(''); // Status messages
  const [searchResult, setSearchResult] = useState(null); // Lune search results
  
  // Financial overview data
  const [financialData, setFinancialData] = useState({
    totalOwed: 0, // Total amount owed across all offices
    totalPaid: 0, // Total amount paid across all offices
    currentMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  });
  
  // Invoice data mapped by office ID for quick access
  const [officeInvoiceData, setOfficeInvoiceData] = useState({});

  /**
   * Load invoice data for all offices
   * Calculates financial totals and maps invoice data by office
   * Used to display financial overview and office-specific invoice counts
   */
  const loadInvoiceData = React.useCallback(async (offices) => {
    try {
      const token = localStorage.getItem('authToken');
      const invoiceDataMap = {};
      let totalOwed = 0;
      let totalPaid = 0;

      // Iterate through each office to load their invoice data
      for (const office of offices) {
        try {
          const response = await fetch(`/api/invoices/office/${office.id}?includeDeleted=false`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              const invoices = result.data;
              
              // Calculate totals for this office
              const officeTotal = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount || 0), 0);
              const officePaid = invoices.filter(inv => inv.status === 'paid')
                .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount || 0), 0);
              const officeUnpaid = officeTotal - officePaid;

              // Determine payment status
              let paymentStatus = 'no_invoices';
              if (officeTotal > 0) {
                // Use Math.abs to handle floating point precision issues
                if (Math.abs(officePaid - officeTotal) < 0.01) {
                  paymentStatus = 'paid';
                } else if (officePaid > 0) {
                  paymentStatus = 'partial';
                } else {
                  // Check if any invoices are overdue (older than 30 days)
                  const hasOverdue = invoices.some(inv => {
                    const invoiceDate = new Date(inv.generated_at || inv.created_at);
                    const daysDiff = (new Date() - invoiceDate) / (1000 * 60 * 60 * 24);
                    return daysDiff > 30 && inv.status !== 'paid';
                  });
                  paymentStatus = hasOverdue ? 'overdue' : 'pending';
                }
              }


              invoiceDataMap[office.id] = {
                totalAmount: officeTotal,
                paidAmount: officePaid,
                unpaidAmount: officeUnpaid,
                paymentStatus,
                invoiceCount: invoices.length,
                lastInvoiceDate: invoices.length > 0 ? invoices[0].created_at : null
              };

              totalOwed += officeUnpaid;
              totalPaid += officePaid;
            } else {
              // No invoices for this office
              invoiceDataMap[office.id] = {
                totalAmount: 0,
                paidAmount: 0,
                unpaidAmount: 0,
                paymentStatus: 'no_invoices',
                invoiceCount: 0,
                lastInvoiceDate: null
              };
            }
          }
        } catch (error) {
          console.error(`Error loading invoices for office ${office.id}:`, error);
          // Set default values for offices with errors
          invoiceDataMap[office.id] = {
            totalAmount: 0,
            paidAmount: 0,
            unpaidAmount: 0,
            paymentStatus: 'no_invoices',
            invoiceCount: 0,
            lastInvoiceDate: null
          };
        }
      }

      setOfficeInvoiceData(invoiceDataMap);
      setFinancialData(prev => ({
        ...prev,
        totalOwed,
        totalPaid
      }));

      // Sort offices by payment status priority: overdue -> pending -> partial -> paid -> no_invoices
      const sortedOffices = offices.sort((a, b) => {
        const aData = invoiceDataMap[a.id];
        const bData = invoiceDataMap[b.id];
        const aStatus = aData ? aData.paymentStatus : 'no_invoices';
        const bStatus = bData ? bData.paymentStatus : 'no_invoices';
        
        const statusPriority = { 
          'overdue': 0,     // Highest priority - appears first
          'pending': 1,     // Second priority
          'partial': 2,     // Third priority  
          'no_invoices': 3, // Fourth priority
          'paid': 4         // Lowest priority - appears last
        };
        
        return statusPriority[aStatus] - statusPriority[bStatus];
      });
      
      
      setDentalOffices(sortedOffices);
      setFilteredOffices(sortedOffices);

    } catch (error) {
      console.error('Error loading invoice data:', error);
    }
  }, []);

  const loadDentalOffices = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getDentalOffices();
      if (result.success) {
        // Load invoice data for all offices (this will set and sort the offices)
        await loadInvoiceData(result.data);
      }
    } catch (error) {
      setMessage('Error loading dental offices. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [loadInvoiceData]);

  const searchLuneBySerial = async () => {
    if (!luneSearchTerm.trim()) {
      setSearchResult(null);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/lune-machines/search/serial/${luneSearchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSearchResult(result.data);
          setMessage('');
        }
      } else if (response.status === 404) {
        setSearchResult(null);
        setMessage('Lune machine not found');
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      setSearchResult(null);
      setMessage('Error searching for lune machine');
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadDentalOffices();
    }
  }, [isAuthenticated, navigate, loadDentalOffices]);

  // Listen for data changes from other components
  useEffect(() => {
    const handleDataRefresh = () => {
      console.log('Dashboard refreshing due to data change');
      loadDentalOffices();
    };

    // Listen for custom events
    window.addEventListener('invoiceDeleted', handleDataRefresh);
    window.addEventListener('invoiceUpdated', handleDataRefresh);
    window.addEventListener('invoicePaid', handleDataRefresh);
    window.addEventListener('dataChanged', handleDataRefresh);

    return () => {
      window.removeEventListener('invoiceDeleted', handleDataRefresh);
      window.removeEventListener('invoiceUpdated', handleDataRefresh);
      window.removeEventListener('invoicePaid', handleDataRefresh);
      window.removeEventListener('dataChanged', handleDataRefresh);
    };
  }, [loadDentalOffices]);

  // Search functionality for dental offices
  useEffect(() => {
    const filtered = dentalOffices.filter(office =>
      office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      office.npi_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      office.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      office.town.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOffices(filtered);
  }, [searchTerm, dentalOffices]);


  return (
    <div className="p-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 mb-8">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <button
            onClick={() => navigate('/create-office')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Dental Office</span>
          </button>
        </div>

        {/* Search Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Dental Office Search */}
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Search Dental Offices</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Search by name, NPI, state, or town..."
              />
            </div>
          </div>

          {/* Lune Machine Search */}
          <div className={`p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Search Lune by Serial Number</h3>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={luneSearchTerm}
                  onChange={(e) => setLuneSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter serial number..."
                  onKeyPress={(e) => e.key === 'Enter' && searchLuneBySerial()}
                />
              </div>
              <button
                onClick={searchLuneBySerial}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
            
            {/* Search Result */}
            {searchResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Device Found: {searchResult.serial_number}
                </h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Office: {searchResult.office_name} ({searchResult.npi_id})
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Location: {searchResult.town}, {searchResult.state}
                </p>
                <button
                  onClick={() => navigate(`/lune/${searchResult.id}`)}
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  View Details →
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Loading dental offices...
            </span>
          </div>
        )}

        {!loading && (
          <>
            {/* Financial Overview */}
            <div className="mb-8">
              <h2 className={`text-2xl font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Financial Overview - {financialData.currentMonth}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Total Owed */}
                <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Total Amount Owed</p>
                      <p className={`text-3xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>${financialData.totalOwed.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-12 w-12 text-red-500" />
                  </div>
                </div>

                {/* Total Paid */}
                <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>Total Amount Paid</p>
                      <p className={`text-3xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>${financialData.totalPaid.toLocaleString()}</p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>

              </div>
            </div>

            {/* Dental Offices Grid */}
            <div className="mb-6">
              <h2 className={`text-2xl font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Dental Offices ({filteredOffices.length})</h2>
              
              {filteredOffices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOffices.map((office) => (
                    <div 
                      key={office.id} 
                      className={`rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-2 p-6 ${
                        isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => navigate(`/office/${office.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className={`font-semibold text-lg ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>{office.name}</h3>
                          </div>
                        </div>
                        {office.lune_count > 0 && (
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full">
                            {office.lune_count} Lune{office.lune_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>NPI ID:</span>
                          <span className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{office.npi_id}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>Location:</span>
                          <span className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{office.town}, {office.state}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>Phone:</span>
                          <span className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{office.phone_number || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>Email:</span>
                          <span className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{office.email || 'N/A'}</span>
                        </div>
                        
                        {/* Payment Status Section */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                          {(() => {
                            const invoiceData = officeInvoiceData[office.id];
                            const hasInvoices = invoiceData && invoiceData.invoiceCount > 0;
                            
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>Total Amount:</span>
                                  <span className={`text-sm font-bold ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    ${hasInvoices ? invoiceData.totalAmount.toLocaleString() : '0.00'}
                                  </span>
                                </div>
                                
                                {hasInvoices && (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-medium ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>Amount Paid:</span>
                                      <span className={`text-sm font-semibold text-green-600 dark:text-green-400`}>
                                        ${invoiceData.paidAmount.toLocaleString()}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-medium ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>Amount Owed:</span>
                                      <span className={`text-sm font-semibold ${
                                        invoiceData.unpaidAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        ${invoiceData.unpaidAmount.toLocaleString()}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-medium ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>Payment Status:</span>
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        invoiceData.paymentStatus === 'paid'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          : invoiceData.paymentStatus === 'overdue'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                          : invoiceData.paymentStatus === 'partial'
                                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                      }`}>
                                        {invoiceData.paymentStatus === 'paid' ? 'Paid' :
                                         invoiceData.paymentStatus === 'overdue' ? 'Overdue' :
                                         invoiceData.paymentStatus === 'partial' ? 'Partial' : 'Pending'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-medium ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>Invoices:</span>
                                      <span className={`text-sm font-semibold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                      }`}>{invoiceData.invoiceCount}</span>
                                    </div>
                                  </>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>Lune Machines:</span>
                                  <span className={`text-sm font-semibold ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}>{office.lune_count || 0}</span>
                                </div>
                                
                                {!hasInvoices && (
                                  <div className={`text-center py-2 text-sm ${
                                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                  }`}>
                                    No invoices generated yet
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className={`mx-auto h-12 w-12 ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-lg mt-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>No dental offices found</div>
                  <p className={`text-sm mt-2 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>Try adjusting your search criteria or add a new dental office</p>
                </div>
              )}
            </div>
          </>
        )}

        {message && (
          <div className={`text-center p-3 rounded-lg mt-6 ${
            message.includes('Error') || message.includes('not found') 
              ? 'bg-red-50 text-red-600 border border-red-200' 
              : 'bg-green-50 text-green-600 border border-green-200'
          }`}>
            {message}
          </div>
        )}
    </div>
  );
};

export default Dashboard;
