import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Edit, Eye, EyeOff, Building2, Monitor, RotateCcw, X, FileText, Users } from 'lucide-react';

const AdminPanel = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize showDeleted state from localStorage and URL params
  const getInitialShowDeleted = () => {
    // Check URL parameter first
    const urlParams = new URLSearchParams(location.search);
    const showDeletedParam = urlParams.get('showDeleted');
    if (showDeletedParam !== null) {
      return showDeletedParam === 'true';
    }
    
    // Fall back to localStorage
    const savedShowDeleted = localStorage.getItem('adminPanel_showDeleted');
    return savedShowDeleted === 'true';
  };
  
  const [activeTab, setActiveTab] = useState('offices');
  const [dentalOffices, setDentalOffices] = useState([]);
  const [luneMachines, setLuneMachines] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(getInitialShowDeleted);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingOffice, setEditingOffice] = useState(null);
  const [editingLune, setEditingLune] = useState(null);

  // Global authentication error handler
  const handleAuthError = useCallback((response) => {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      setMessage('Session expired. Please login again.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return true;
    }
    return false;
  }, [navigate]);

  // Handle showDeleted toggle with persistence
  const handleShowDeletedToggle = () => {
    const newShowDeleted = !showDeleted;
    setShowDeleted(newShowDeleted);
    
    // Persist to localStorage
    localStorage.setItem('adminPanel_showDeleted', newShowDeleted.toString());
    
    // Update URL parameter to maintain state on refresh
    const urlParams = new URLSearchParams(location.search);
    if (newShowDeleted) {
      urlParams.set('showDeleted', 'true');
    } else {
      urlParams.delete('showDeleted');
    }
    
    // Update URL without triggering navigation
    const newUrl = `${location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Load dental offices
      const officesResponse = await fetch(`/api/dental-offices?includeDeleted=${showDeleted}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (handleAuthError(officesResponse)) return;

      if (officesResponse.ok) {
        const officesResult = await officesResponse.json();
        if (officesResult.success) {
          setDentalOffices(officesResult.data);
        }
      }

      // Load lune machines
      const lunesResponse = await fetch(`/api/lune-machines?includeDeleted=${showDeleted}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (handleAuthError(lunesResponse)) return;

      if (lunesResponse.ok) {
        const lunesResult = await lunesResponse.json();
        if (lunesResult.success) {
          setLuneMachines(lunesResult.data);
        }
      }

      // Load invoices
      const invoicesResponse = await fetch(`/api/invoices?includeDeleted=${showDeleted}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (handleAuthError(invoicesResponse)) return;

      if (invoicesResponse.ok) {
        const invoicesResult = await invoicesResponse.json();
        if (invoicesResult.success) {
          setInvoices(invoicesResult.data);
        }
      }

      // Load users
      const usersResponse = await fetch(`/api/users?includeDeleted=${showDeleted}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (handleAuthError(usersResponse)) return;

      if (usersResponse.ok) {
        const usersResult = await usersResponse.json();
        if (usersResult.success) {
          setUsers(usersResult.data);
        }
      }

    } catch (error) {
      setMessage('Error loading data. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [showDeleted, handleAuthError]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadData();
    }
  }, [isAuthenticated, navigate, loadData]);

  // Update showDeleted state when URL changes (e.g., when navigating back from detail pages)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showDeletedParam = urlParams.get('showDeleted');
    if (showDeletedParam !== null) {
      const newShowDeleted = showDeletedParam === 'true';
      setShowDeleted(newShowDeleted);
      // Also persist to localStorage
      localStorage.setItem('adminPanel_showDeleted', newShowDeleted.toString());
    }
  }, [location.search]);

  // Reload data when showDeleted state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [showDeleted, isAuthenticated, loadData]);

  const handleDeleteOffice = async (officeId) => {
    if (!window.confirm('Are you sure you want to delete this dental office? This will also delete all associated lune machines.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/dental-offices/${officeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Dental office deleted successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to delete office');
      }
    } catch (error) {
      setMessage('Error deleting dental office');
      console.error('Error:', error);
    }
  };

  const handleDeleteLune = async (luneId) => {
    if (!window.confirm('Are you sure you want to delete this lune machine?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/lune-machines/${luneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Lune machine deleted successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to delete lune machine');
      }
    } catch (error) {
      setMessage('Error deleting lune machine');
      console.error('Error:', error);
    }
  };

  const handleUpdateOffice = async (officeData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/dental-offices/${editingOffice.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(officeData)
      });

      if (response.ok) {
        setMessage('Dental office updated successfully');
        setEditingOffice(null);
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to update office');
      }
    } catch (error) {
      setMessage('Error updating dental office');
      console.error('Error:', error);
    }
  };

  const handleUpdateLune = async (luneData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/lune-machines/${editingLune.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(luneData)
      });

      if (response.ok) {
        setMessage('Lune machine updated successfully');
        setEditingLune(null);
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to update lune machine');
      }
    } catch (error) {
      setMessage('Error updating lune machine');
      console.error('Error:', error);
    }
  };

  const handleRestoreOffice = async (officeId) => {
    if (!window.confirm('Are you sure you want to restore this dental office?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/dental-offices/${officeId}/restore`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Dental office restored successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to restore office');
      }
    } catch (error) {
      setMessage('Error restoring dental office');
      console.error('Error:', error);
    }
  };

  const handlePermanentDeleteOffice = async (officeId) => {
    if (!window.confirm('Are you sure you want to permanently delete this dental office? This action cannot be undone and will also permanently delete all associated lune machines.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/dental-offices/${officeId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Dental office permanently deleted');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to permanently delete office');
      }
    } catch (error) {
      setMessage('Error permanently deleting dental office');
      console.error('Error:', error);
    }
  };

  const handleRestoreLune = async (luneId) => {
    if (!window.confirm('Are you sure you want to restore this lune machine?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/lune-machines/${luneId}/restore`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Lune machine restored successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to restore lune machine');
      }
    } catch (error) {
      setMessage('Error restoring lune machine');
      console.error('Error:', error);
    }
  };

  const handlePermanentDeleteLune = async (luneId) => {
    if (!window.confirm('Are you sure you want to permanently delete this lune machine? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/lune-machines/${luneId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Lune machine permanently deleted');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to permanently delete lune machine');
      }
    } catch (error) {
      setMessage('Error permanently deleting lune machine');
      console.error('Error:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Invoice deleted successfully');
        loadData();
        
        // 🔄 Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('invoiceDeleted', { detail: { invoiceId } }));
        console.log('Invoice deleted - triggering dashboard refresh');
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to delete invoice');
      }
    } catch (error) {
      setMessage('Error deleting invoice');
      console.error('Error:', error);
    }
  };

  const handleRestoreInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to restore this invoice?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/invoices/${invoiceId}/restore`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Invoice restored successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to restore invoice');
      }
    } catch (error) {
      setMessage('Error restoring invoice');
      console.error('Error:', error);
    }
  };

  const handlePermanentDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('⚠️ PERMANENT DELETE: This will completely remove the invoice from the database forever. This action CANNOT be undone. Are you sure?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/invoices/${invoiceId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Invoice permanently deleted');
        loadData();
        
        // 🔄 Trigger dashboard refresh for permanent deletion
        window.dispatchEvent(new CustomEvent('invoiceDeleted', { detail: { invoiceId, permanent: true } }));
        console.log('Invoice permanently deleted - triggering dashboard refresh');
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to permanently delete invoice');
      }
    } catch (error) {
      setMessage('Error permanently deleting invoice');
      console.error('Error:', error);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to update user role');
      }
    } catch (error) {
      setMessage(`Error updating user role: ${error.message}`);
      console.error('Error:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('User deleted successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to delete user');
      }
    } catch (error) {
      setMessage(`Error deleting user: ${error.message}`);
      console.error('Error:', error);
    }
  };

  const handleRestoreUser = async (userId) => {
    if (!window.confirm('Are you sure you want to restore this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${userId}/restore`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('User restored successfully');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to restore user');
      }
    } catch (error) {
      setMessage(`Error restoring user: ${error.message}`);
      console.error('Error:', error);
    }
  };

  const handlePermanentDeleteUser = async (userId) => {
    if (!window.confirm('⚠️ PERMANENT DELETE: This will completely remove the user from the database forever. This action CANNOT be undone. Are you sure?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${userId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('User permanently deleted');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to permanently delete user');
      }
    } catch (error) {
      setMessage(`Error permanently deleting user: ${error.message}`);
      console.error('Error:', error);
    }
  };

  const filteredOffices = dentalOffices.filter(office =>
    office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.npi_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.town.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLunes = luneMachines.filter(lune =>
    lune.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lune.office_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lune.connected_phone && lune.connected_phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lune.sbc_identifier && lune.sbc_identifier.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lune.plan_type && lune.plan_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredInvoices = invoices.filter(invoice => {
    // First filter by deleted status
    const matchesDeletedFilter = showDeleted ? invoice.is_deleted : !invoice.is_deleted;
    
    // Then filter by search term
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.office_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDeletedFilter && matchesSearch;
  });

  const filteredUsers = users.filter(user => {
    // First filter by active status (opposite of deleted)
    const matchesDeletedFilter = showDeleted ? !user.is_active : user.is_active;
    
    // Then filter by search term
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDeletedFilter && matchesSearch;
  });

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
            }`}>Admin Panel</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleShowDeletedToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showDeleted 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 border'
              }`}
            >
              {showDeleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showDeleted ? 'Hide Deleted' : 'Show Deleted'}</span>
            </button>
          </div>
        </div>


        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
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
              placeholder="Search by name, NPI, serial number, phone, SBC identifier, plan type..."
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('offices')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'offices'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>Dental Offices ({filteredOffices.length})</span>
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
              <span>Lune Machines ({filteredLunes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Invoices ({filteredInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Users ({filteredUsers.length})</span>
            </button>
          </div>

          <div className="p-6">
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Loading data...
                </span>
              </div>
            )}

            {!loading && activeTab === 'offices' && (
              <div>
                {filteredOffices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className={`w-full border rounded-lg ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Office Name</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>NPI ID</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Location</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Lunes</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Status</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                        {filteredOffices.map((office) => (
                          <tr key={office.id} className={`${
                            office.is_deleted ? 'opacity-60' : ''
                          } ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <td className={`px-4 py-3 text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {office.name}
                            </td>
                            <td className={`px-4 py-3 text-sm font-mono ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {office.npi_id}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {office.town}, {office.state}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {office.lune_count}
                            </td>
                            <td className={`px-4 py-3 text-sm`}>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                office.is_deleted 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {office.is_deleted ? 'Deleted' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => navigate(`/office/${office.id}?from=admin${showDeleted ? '&adminDeleted=true' : ''}`)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!office.is_deleted ? (
                                  <>
                                    <button
                                      onClick={() => setEditingOffice(office)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Edit Office"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOffice(office.id)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Delete Office"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleRestoreOffice(office.id)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Restore Office"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteOffice(office.id)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Permanently Delete Office"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No dental offices found</div>
                  </div>
                )}
              </div>
            )}

            {!loading && activeTab === 'lunes' && (
              <div>
                {filteredLunes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className={`w-full border rounded-lg ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Serial Number</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Dental Office</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Purchase Date</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Phone Number</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>SBC Identifier</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Plan Type</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Status</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                        {filteredLunes.map((lune) => (
                          <tr key={lune.id} className={`${
                            lune.is_deleted ? 'opacity-60' : ''
                          } ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <td className={`px-4 py-3 text-sm font-mono font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {lune.serial_number}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {lune.office_name}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {new Date(lune.purchase_date).toLocaleDateString()}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {lune.connected_phone || 'Not specified'}
                            </td>
                            <td className={`px-4 py-3 text-sm font-mono ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {lune.sbc_identifier || 'Not specified'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {lune.plan_type ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {lune.plan_type.charAt(0).toUpperCase() + lune.plan_type.slice(1)}
                                </span>
                              ) : (
                                'Not specified'
                              )}
                            </td>
                            <td className={`px-4 py-3 text-sm`}>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                lune.is_deleted 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {lune.is_deleted ? 'Deleted' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => navigate(`/lune/${lune.id}?from=admin${showDeleted ? '&adminDeleted=true' : ''}`)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!lune.is_deleted ? (
                                  <>
                                    <button
                                      onClick={() => setEditingLune(lune)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Edit Lune Machine"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLune(lune.id)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Soft Delete Lune"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleRestoreLune(lune.id)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Restore Lune Machine"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteLune(lune.id)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Permanently Delete Lune Machine"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Monitor className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No lune machines found</div>
                  </div>
                )}
              </div>
            )}

            {!loading && activeTab === 'invoices' && (
              <div>
                {filteredInvoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className={`w-full border rounded-lg ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Invoice Number</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Office</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Amount</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Status</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Generated</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${
                        isDarkMode ? 'divide-gray-600' : 'divide-gray-200'
                      }`}>
                        {filteredInvoices.map((invoice) => (
                          <tr key={invoice.id} className={`${
                            isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                          } transition-colors`}>
                            <td className={`px-4 py-3 text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {invoice.invoice_number}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {invoice.office_name}
                            </td>
                            <td className={`px-4 py-3 text-sm font-medium ${
                              isDarkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              ${invoice.total_amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {new Date(invoice.generated_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center space-x-2">
                                {invoice.is_deleted ? (
                                  <>
                                    <button
                                      onClick={() => handleRestoreInvoice(invoice.id)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Restore Invoice"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteInvoice(invoice.id)}
                                      className="text-red-700 hover:text-red-900 p-1 bg-red-50 hover:bg-red-100 rounded"
                                      title="⚠️ Permanently Delete Invoice (Cannot be undone)"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete Invoice"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No invoices found</div>
                  </div>
                )}
              </div>
            )}

            {!loading && activeTab === 'users' && (
              <div>
                {filteredUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className={`w-full border rounded-lg ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Username</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Full Name</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Email</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Role</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Status</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Last Login</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className={`border-t ${
                            isDarkMode ? 'border-gray-600' : 'border-gray-200'
                          }`}>
                            <td className={`px-4 py-3 text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {user.username}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {user.full_name || 'N/A'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {user.email}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                                className={`px-3 py-1 rounded-lg border text-sm ${
                                  isDarkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.is_active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center space-x-2">
                                {!user.is_active ? (
                                  <>
                                    <button
                                      onClick={() => handleRestoreUser(user.id)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Restore User"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteUser(user.id)}
                                      className="text-red-700 hover:text-red-900 p-1 bg-red-50 hover:bg-red-100 rounded"
                                      title="⚠️ Permanently Delete User (Cannot be undone)"
                                      disabled={user.role === 'admin'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete User"
                                    disabled={user.role === 'admin' && user.username === 'Eric_enamel001'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No users found</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Office Modal */}
        {editingOffice && (
          <EditOfficeModal
            office={editingOffice}
            isDarkMode={isDarkMode}
            onSave={handleUpdateOffice}
            onCancel={() => setEditingOffice(null)}
          />
        )}

        {/* Lune Edit Modal */}
        {editingLune && (
          <LuneEditModal
            lune={editingLune}
            onSave={handleUpdateLune}
            onCancel={() => setEditingLune(null)}
            isDarkMode={isDarkMode}
          />
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

// Edit Office Modal Component
const EditOfficeModal = ({ office, isDarkMode, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: office.name,
    state: office.state,
    town: office.town,
    address: office.address,
    phone_number: office.phone_number || '',
    email: office.email || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-2xl w-full mx-4 rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-6">
          <h2 className={`text-xl font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>Edit Dental Office</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Office Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
                }`}>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
                }`}>Town</label>
                <input
                  type="text"
                  value={formData.town}
                  onChange={(e) => setFormData({...formData, town: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
                }`}>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Lune Edit Modal Component
const LuneEditModal = ({ lune, onSave, onCancel, isDarkMode }) => {
  const [formData, setFormData] = useState({
    connected_phone: lune.connected_phone || '',
    sbc_identifier: lune.sbc_identifier || '',
    plan_type: lune.plan_type || '',
    purchase_date: lune.purchase_date ? lune.purchase_date.split('T')[0] : ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-md w-full mx-4 p-6 rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Edit Lune Machine: {lune.serial_number}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>Connected Phone Number</label>
            <input
              type="tel"
              value={formData.connected_phone}
              onChange={(e) => setFormData({...formData, connected_phone: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="e.g., +1-555-123-4567"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>SBC Identifier</label>
            <input
              type="text"
              value={formData.sbc_identifier}
              onChange={(e) => setFormData({...formData, sbc_identifier: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="e.g., SBC-001-A"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>Plan Type</label>
            <select
              value={formData.plan_type}
              onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select Plan Type</option>
              <option value="basic">Basic Plan</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>Purchase Date</label>
            <input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;
