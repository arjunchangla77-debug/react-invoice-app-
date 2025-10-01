import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, Monitor, Plus, Search, CheckCircle, XCircle } from 'lucide-react';

const OfficeDetail = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  
  const [office, setOffice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [lunes, setLunes] = useState([]);
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadOfficeData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Load office details - include deleted if coming from admin panel
      const urlParams = new URLSearchParams(location.search);
      const fromAdmin = urlParams.get('from') === 'admin';
      const includeDeletedParam = fromAdmin ? '?includeDeleted=true' : '';
      
      const officeResponse = await fetch(`/api/dental-offices/${id}${includeDeletedParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!officeResponse.ok) {
        throw new Error('Office not found');
      }

      const officeResult = await officeResponse.json();
      if (officeResult.success) {
        setOffice(officeResult.data);
      }

      // Load invoices
      const invoicesResponse = await fetch(`/api/invoices?officeId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (invoicesResponse.ok) {
        const invoicesResult = await invoicesResponse.json();
        if (invoicesResult.success) {
          setInvoices(invoicesResult.data);
        }
      }

      // Load lune machines - include deleted if coming from admin panel
      const includeDeletedQuery = fromAdmin ? '&includeDeleted=true' : '';
      const lunesResponse = await fetch(`/api/lune-machines?officeId=${id}${includeDeletedQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (lunesResponse.ok) {
        const lunesResult = await lunesResponse.json();
        if (lunesResult.success) {
          setLunes(lunesResult.data);
        }
      }

    } catch (error) {
      setMessage('Error loading office data. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id, location.search]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOfficeData();
    }
  }, [isAuthenticated, loadOfficeData]);

  // Store original navigation source when component first loads
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const fromParam = urlParams.get('from');
    const fromState = location.state?.from;
    
    // Always update sessionStorage if we have a URL parameter (it takes precedence)
    if (fromParam) {
      sessionStorage.setItem(`office-${id}-source`, fromParam);
    } else if (fromState) {
      sessionStorage.setItem(`office-${id}-source`, fromState);
    } else {
      // Only set default if no existing source
      const existingSource = sessionStorage.getItem(`office-${id}-source`);
      if (!existingSource) {
        sessionStorage.setItem(`office-${id}-source`, 'dashboard');
      }
    }
  }, [id, location.search, location.state]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Handle tab switching from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam === 'lunes') {
      setActiveTab('lunes');
    } else if (tabParam === 'invoices') {
      setActiveTab('invoices');
    }
    // If no tab parameter, keep default activeTab state
  }, [location.search]);

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
        // Reload invoices
        loadOfficeData();
        setMessage(`Invoice marked as ${status}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error updating invoice status');
      console.error('Error:', error);
    }
  };

  // Smart back navigation function
  const handleBackNavigation = () => {
    // Check if there's a 'from' parameter in the URL
    const urlParams = new URLSearchParams(location.search);
    const fromParam = urlParams.get('from');
    
    // Check if we have navigation state from React Router
    const fromState = location.state?.from;
    
    // Check sessionStorage for original navigation source
    const originalSource = sessionStorage.getItem(`office-${id}-source`);
    
    // Priority order for determining back navigation:
    // 1. URL parameter 'from'
    // 2. React Router state 'from'
    // 3. SessionStorage original source
    // 4. Default fallback to dashboard
    
    if (fromParam === 'offices') {
      // Came from main dental offices page
      navigate('/offices');
    } else if (fromParam === 'dashboard') {
      // Came from dashboard
      navigate('/dashboard');
    } else if (fromParam === 'admin') {
      // Came from admin panel - check if we need to show deleted records
      const adminDeleted = urlParams.get('adminDeleted');
      if (adminDeleted === 'true') {
        navigate('/admin?showDeleted=true');
      } else {
        navigate('/admin');
      }
    } else if (fromState === 'offices') {
      // Came from main dental offices page (via state)
      navigate('/offices');
    } else if (fromState === 'dashboard') {
      // Came from dashboard (via state)
      navigate('/dashboard');
    } else if (fromState === 'admin') {
      // Came from admin panel (via state) - check if we need to show deleted records
      const adminDeleted = urlParams.get('adminDeleted');
      if (adminDeleted === 'true') {
        navigate('/admin?showDeleted=true');
      } else {
        navigate('/admin');
      }
    } else if (originalSource === 'dashboard') {
      // Original navigation was from dashboard
      navigate('/dashboard');
    } else if (originalSource === 'offices') {
      // Original navigation was from offices
      navigate('/offices');
    } else if (originalSource === 'admin') {
      // Original navigation was from admin
      navigate('/admin');
    } else {
      // Default fallback to dashboard
      navigate('/dashboard');
    }
  };

  const filteredLunes = lunes.filter(lune =>
    lune.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading office details...
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
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
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
              onClick={handleBackNavigation}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>{office.name}</h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>NPI: {office.npi_id}</p>
            </div>
          </div>
        </div>

        {/* Office Information */}
        <div className={`rounded-lg shadow-lg p-6 mb-8 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center space-x-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Building2 className="w-5 h-5" />
            <span>Office Information</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Location</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {office.town}, {office.state}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Phone</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {office.phone_number || 'N/A'}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Email</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {office.email || 'N/A'}
              </p>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Address</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {office.address}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Invoices ({invoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('lunes')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'lunes'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span>Lune Machines ({lunes.length})</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'invoices' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Invoices</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate(`/generate-usage-invoice/${id}`)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate Monthly Invoice</span>
                    </button>
                  </div>
                </div>

                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                          isDarkMode ? 'border-gray-600 bg-gray-700 hover:bg-gray-650' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => navigate(`/invoice/${invoice.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {invoice.invoice_number}
                            </h4>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {new Date(invoice.generated_at).toLocaleDateString()} • 
                              {invoice.month}/{invoice.year}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                ${invoice.total_amount}
                              </p>
                              <div className="flex items-center space-x-2">
                                {invoice.status === 'paid' ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`text-sm capitalize ${
                                  invoice.status === 'paid' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {invoice.status}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateInvoiceStatus(invoice.id, invoice.status === 'paid' ? 'unpaid' : 'paid');
                              }}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                invoice.status === 'paid'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              Mark {invoice.status === 'paid' ? 'Unpaid' : 'Paid'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No invoices found</div>
                    <p className={`text-sm mt-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>Generate your first invoice to get started</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'lunes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Lune Machines</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Search by serial..."
                      />
                    </div>
                    <button
                      onClick={() => navigate(`/add-lune/${id}`)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Lune</span>
                    </button>
                  </div>
                </div>

                {filteredLunes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLunes.map((lune) => (
                      <div
                        key={lune.id}
                        className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:scale-105 ${
                          isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                        }`}
                        onClick={() => navigate(`/lune/${lune.id}?from=office`)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Monitor className="w-6 h-6 text-blue-500" />
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            Active
                          </span>
                        </div>
                        <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {lune.serial_number}
                        </h4>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Purchased: {new Date(lune.purchase_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Monitor className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No lune machines found</div>
                    <p className={`text-sm mt-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {searchTerm ? 'Try adjusting your search criteria' : 'Add your first lune machine to get started'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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

export default OfficeDetail;
