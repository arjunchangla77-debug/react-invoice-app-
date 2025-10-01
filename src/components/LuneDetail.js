import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Monitor, Calendar, Search, BarChart3, Clock, MousePointer } from 'lucide-react';

const LuneDetail = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  
  const [lune, setLune] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [buttonDetails, setButtonDetails] = useState([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  const loadButtonDetails = useCallback(async () => {
    setButtonLoading(true);
    try {
      const response = await fetch('https://siqolawsbucket.s3.us-east-1.amazonaws.com/Button_details_updated.json');
      if (response.ok) {
        const data = await response.json();
        
        // Create a mapping between lune serial numbers and Device_Id fields in new JSON structure
        // New JSON structure uses: Device_Id, Serial_Number, Tid, Date, Current_time, Btn, Duration
        const luneIdMapping = {
          '290b100001071e00000f303433424250': '290b100001071e00000f303433424250', // Direct match - serial number matches Device_Id
          'P09250001': '290b100001071e00000f303433424250', // Serial_Number to Device_Id mapping
          // Add more mappings as needed:
          // 'LUNE_SERIAL': 'DEVICE_ID_FROM_JSON',
        };
        
        // Alternative: If you want to use a different field for mapping, you can modify this
        // For example, if the JSON Id should match the lune's database ID or another field
        
        if (lune && lune.serial_number) {
          // Try multiple approaches to find the correct mapping
          let filteredData = [];
          let mappingMethod = '';
          
          // Method 1: Direct match - check if serial number equals Device_Id exactly
          filteredData = data.filter(item => item.Device_Id === lune.serial_number);
          if (filteredData.length > 0) {
            mappingMethod = 'direct Device_Id match';
          }
          
          // Method 1b: Try matching with Serial_Number field
          if (filteredData.length === 0) {
            filteredData = data.filter(item => item.Serial_Number === lune.serial_number);
            if (filteredData.length > 0) {
              mappingMethod = 'Serial_Number match';
            }
          }
          
          // Method 2: Use the predefined mapping (fallback)
          if (filteredData.length === 0) {
            const mappedId = luneIdMapping[lune.serial_number];
            if (mappedId) {
              filteredData = data.filter(item => item.Device_Id === mappedId);
              mappingMethod = 'predefined Device_Id mapping';
            }
          }
          
          // Method 3: If no predefined mapping, try to use a database field (if available)
          if (filteredData.length === 0 && lune.json_id) {
            filteredData = data.filter(item => item.Device_Id === lune.json_id);
            mappingMethod = 'database json_id field';
          }
          
          // Method 4: Try partial matching (last resort)
          if (filteredData.length === 0) {
            filteredData = data.filter(item => 
              item.Device_Id && (
                lune.serial_number.includes(item.Device_Id) ||
                item.Device_Id.includes(lune.serial_number) ||
                (item.Serial_Number && (
                  lune.serial_number.includes(item.Serial_Number) ||
                  item.Serial_Number.includes(lune.serial_number)
                ))
              )
            );
            if (filteredData.length > 0) {
              mappingMethod = 'partial matching';
            }
          }
          
          setButtonDetails(filteredData);
          console.log(`LUNE FILTERING RESULTS:`);
          console.log(`   Lune Serial: ${lune.serial_number}`);
          console.log(`   Method Used: ${mappingMethod}`);
          console.log(`   Records Found: ${filteredData.length}`);
          console.log(`   Total Records in S3: ${data.length}`);
          
          if (filteredData.length === 0) {
            console.log(`No button data found for lune ${lune.serial_number}`);
            console.log(`Available Device_IDs in S3 data:`, [...new Set(data.map(item => item.Device_Id))]);
            console.log(`Available Serial_Numbers in S3 data:`, [...new Set(data.map(item => item.Serial_Number))]);
            console.log(`This is normal if this lune machine hasn't generated button data yet.`);
          } else {
            console.log(`Found ${filteredData.length} button records for ${lune.serial_number}`);
          }
        } else {
          setButtonDetails([]);
        }
      }
    } catch (error) {
      console.error('Error loading button details:', error);
      setMessage('Error loading button details from external source');
    } finally {
      setButtonLoading(false);
    }
  }, [lune]);

  const loadLuneData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Load lune details - include deleted if coming from admin panel
      const urlParams = new URLSearchParams(location.search);
      const fromAdmin = urlParams.get('from') === 'admin';
      const includeDeletedParam = fromAdmin ? '?includeDeleted=true' : '';
      
      const luneResponse = await fetch(`/api/lune-machines/${id}${includeDeletedParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!luneResponse.ok) {
        throw new Error('Lune machine not found');
      }

      const luneResult = await luneResponse.json();
      if (luneResult.success) {
        setLune(luneResult.data);
      }

      // Load available months
      const monthsResponse = await fetch(`/api/lune-machines/${id}/months`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (monthsResponse.ok) {
        const monthsResult = await monthsResponse.json();
        if (monthsResult.success) {
          // Load button details from S3 instead of monthly stats
          if (monthsResult.data.length > 0) {
            // We now use S3 button data instead of monthly stats
          }
        }
      }

    } catch (error) {
      setMessage('Error loading lune data. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id, location.search]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadLuneData();
    }
  }, [isAuthenticated, navigate, loadLuneData]);

  useEffect(() => {
    if (lune) {
      loadButtonDetails();
    }
  }, [lune, loadButtonDetails]);

  // Smart back navigation function
  const handleBackNavigation = () => {
    // Check if there's a 'from' parameter in the URL
    const urlParams = new URLSearchParams(location.search);
    const fromParam = urlParams.get('from');
    
    // Check if we have navigation state from React Router
    const fromState = location.state?.from;
    
    // Priority order for determining back navigation:
    // 1. URL parameter 'from'
    // 2. React Router state 'from'
    // 3. Browser history (if available)
    // 4. Default fallback to dental office
    
    if (fromParam === 'lunes') {
      // Came from main lune machines page
      navigate('/lunes');
    } else if (fromParam === 'admin') {
      // Came from admin panel - check if we need to show deleted records
      const adminDeleted = urlParams.get('adminDeleted');
      if (adminDeleted === 'true') {
        navigate('/admin?showDeleted=true');
      } else {
        navigate('/admin');
      }
    } else if (fromParam === 'office' && lune?.dental_office_id) {
      // Came from dental office detail page - go back to lune tab
      navigate(`/office/${lune.dental_office_id}?tab=lunes`);
    } else if (fromState === 'lunes') {
      // Came from main lune machines page (via state)
      navigate('/lunes');
    } else if (fromState === 'office' && lune?.dental_office_id) {
      // Came from dental office detail page (via state) - go back to lune tab
      navigate(`/office/${lune.dental_office_id}?tab=lunes`);
    } else if (window.history.length > 1) {
      // Use browser back if available
      navigate(-1);
    } else if (lune?.dental_office_id) {
      // Default fallback to dental office
      navigate(`/office/${lune.dental_office_id}`);
    } else {
      // Ultimate fallback to lunes page
      navigate('/lunes');
    }
  };


  const filteredDetails = buttonDetails.filter(item => {
    // Search term filter
    const matchesSearch = !searchTerm || (
      item.Btn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Date.includes(searchTerm) ||
      item.Current_time.includes(searchTerm) ||
      item.Tid.includes(searchTerm)
    );

    // Month/Year filter
    const matchesMonthYear = selectedMonth === 'all' || (() => {
      if (!item.Date) return false;
      
      // Parse date from DD/MM/YYYY format
      const [, month, year] = item.Date.split('/').map(Number);
      
      // Check if year matches
      if (year !== selectedYear) return false;
      
      // Check if month matches (month is 1-indexed in the data)
      return month === parseInt(selectedMonth);
    })();

    return matchesSearch && matchesMonthYear;
  });

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading lune details...
        </span>
      </div>
    );
  }

  if (!lune) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Lune machine not found
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
              }`}>Device ID {lune.serial_number}</h1>
            </div>
          </div>
        </div>

        {/* Lune Information */}
        <div className={`rounded-lg shadow-lg p-6 mb-8 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center space-x-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Monitor className="w-5 h-5" />
            <span>Machine Information</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Lune Serial Number</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {lune.serial_number}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>SBC Identifier</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {lune.sbc_identifier || 'Not specified'}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Phone Number it is Connected To</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {lune.connected_phone || 'Not specified'}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Purchase Date</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {new Date(lune.purchase_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Dental Office</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {lune.office_name}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Location</label>
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {lune.town}, {lune.state}
              </p>
            </div>
          </div>
        </div>

        {/* Month Selection */}
        <div className={`rounded-lg shadow-lg p-6 mb-8 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold flex items-center space-x-2 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              <Calendar className="w-5 h-5" />
              <span>Usage Statistics</span>
            </h2>
            
            {buttonDetails.length > 0 && (
              <div className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
              }`}>
                <span className="text-sm font-medium">
                  Total Records: {buttonDetails.length}
                </span>
              </div>
            )}
          </div>

          {buttonLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Loading button statistics...
              </span>
            </div>
          )}

          {!buttonLoading && buttonDetails.length > 0 && (
            <>
              {/* Summary Cards - Using S3 Button Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {['subging', 'purify', 'clean'].map((buttonType) => {
                  const buttonData = filteredDetails.filter(item => item.Btn.toLowerCase() === buttonType);
                  const totalPresses = buttonData.length;
                  const totalDuration = buttonData.reduce((sum, item) => {
                    const [hours, minutes, seconds] = item.Duration.split(':').map(Number);
                    return sum + (hours * 3600) + (minutes * 60) + seconds;
                  }, 0);
                  
                  return (
                    <div key={buttonType} className={`p-4 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {buttonType.toUpperCase()}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-center space-x-1">
                            <MousePointer className={`w-3 h-3 ${
                              buttonType === 'subging' ? 'text-blue-500' : 
                              buttonType === 'purify' ? 'text-green-500' : 'text-orange-500'
                            }`} />
                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {totalPresses} presses
                            </span>
                          </div>
                          <div className="flex items-center justify-center space-x-1">
                            <Clock className={`w-3 h-3 ${
                              buttonType === 'subging' ? 'text-blue-500' : 
                              buttonType === 'purify' ? 'text-green-500' : 'text-orange-500'
                            }`} />
                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m {totalDuration % 60}s
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Usage Log */}
              <div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
                  <h3 className={`text-lg font-semibold flex items-center space-x-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    <BarChart3 className="w-5 h-5" />
                    <span>Detailed Usage Log ({filteredDetails.length} records)</span>
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    {/* Month Filter */}
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="all">All Months</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>

                    {/* Year Filter */}
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>

                    {/* Search Input */}
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
                        placeholder="Search by button, date, or time..."
                      />
                    </div>
                  </div>
                </div>

                {filteredDetails.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className={`w-full border rounded-lg ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-200'
                    }`}>
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Button</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>SBC</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Date</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Start Time</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>End Time</th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>Duration</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                        {filteredDetails
                          .sort((a, b) => new Date(b.Date.split('/').reverse().join('-')) - new Date(a.Date.split('/').reverse().join('-')))
                          .map((item, index) => {
                            // Calculate end time from start time and duration
                            const [hours, minutes, seconds] = item.Duration.split(':').map(Number);
                            const durationMs = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
                            const startTime = new Date(`${item.Date.split('/').reverse().join('-')} ${item.Current_time}`);
                            const endTime = new Date(startTime.getTime() + durationMs);
                            
                            return (
                              <tr key={item.Tid} className={`${
                                isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                              } border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.Btn === 'subging' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    item.Btn === 'purify' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                  }`}>
                                    {item.Btn.toUpperCase()}
                                  </span>
                                </td>
                                <td className={`py-3 px-4 text-sm font-mono ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {item.Serial_Number || 'N/A'}
                                </td>
                                <td className={`py-3 px-4 text-sm ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {item.Date}
                                </td>
                                <td className={`py-3 px-4 text-sm ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {item.Current_time}
                                </td>
                                <td className={`py-3 px-4 text-sm ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {endTime.toLocaleTimeString()}
                                </td>
                                <td className={`py-3 px-4 text-sm font-medium ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {item.Duration}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className={`mx-auto h-12 w-12 ${
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-lg mt-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No usage records found</div>
                    <p className={`text-sm mt-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {searchTerm ? 'Try adjusting your search criteria' : 'No button presses recorded for this month'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {!buttonLoading && buttonDetails.length === 0 && (
            <div className="text-center py-12">
              <Calendar className={`mx-auto h-12 w-12 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <div className={`text-lg mt-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>No usage data available</div>
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>This lune machine hasn't recorded any button presses yet</p>
            </div>
          )}
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

export default LuneDetail;
