import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Monitor, Search, Building2, Calendar, Activity } from 'lucide-react';

const LuneMachines = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [lunes, setLunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');

  const loadLunes = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/lune-machines', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLunes(result.data);
        }
      }
    } catch (error) {
      setMessage('Error loading lune machines. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadLunes();
    }
  }, [isAuthenticated, navigate, loadLunes]);

  const filteredLunes = lunes.filter(lune =>
    lune.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lune.office_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading lune machines...
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
            <div className="p-3 bg-green-500 rounded-lg">
              <Monitor className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Lune Machines</h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Monitor and manage all lune machines</p>
            </div>
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
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="Search by serial number or office name..."
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Machines</p>
                <p className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{lunes.length}</p>
              </div>
              <Monitor className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          
          <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Active Machines</p>
                <p className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{lunes.filter(lune => !lune.is_deleted).length}</p>
              </div>
              <Activity className="h-12 w-12 text-green-500" />
            </div>
          </div>
          
          <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Connected Offices</p>
                <p className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{new Set(lunes.map(lune => lune.dental_office_id)).size}</p>
              </div>
              <Building2 className="h-12 w-12 text-purple-500" />
            </div>
          </div>
          
          <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>This Month</p>
                <p className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{lunes.filter(lune => {
                  const purchaseDate = new Date(lune.purchase_date);
                  const now = new Date();
                  return purchaseDate.getMonth() === now.getMonth() && 
                         purchaseDate.getFullYear() === now.getFullYear();
                }).length}</p>
              </div>
              <Calendar className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Lunes Grid */}
        {filteredLunes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLunes.map((lune, index) => (
              <div
                key={lune.id}
                className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => navigate(`/lune/${lune.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
                    <div className={`p-3 rounded-lg ${
                      lune.is_deleted 
                        ? 'bg-red-100 dark:bg-red-900' 
                        : 'bg-green-100 dark:bg-green-900'
                    }`}>
                      <Monitor className={`h-6 w-6 ${
                        lune.is_deleted 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-lg font-mono break-all leading-tight ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`} title={lune.serial_number}>
                        {lune.serial_number}
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Serial Number
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className={`text-sm truncate ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`} title={lune.office_name}>
                      {lune.office_name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Purchased: {new Date(lune.purchase_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Location: {lune.office_town && lune.office_state ? `${lune.office_town}, ${lune.office_state}` : 'Location not available'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lune.is_deleted 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {lune.is_deleted ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Monitor className={`mx-auto h-16 w-16 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <div className={`text-xl mt-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {searchTerm ? 'No lune machines found' : 'No lune machines yet'}
            </div>
            <p className={`text-sm mt-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {searchTerm 
                ? 'Try adjusting your search criteria' 
                : 'Lune machines will appear here once offices are created'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/create-office')}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Create Office with Lune Machines
              </button>
            )}
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

export default LuneMachines;
