import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import apiService from '../services/api';
import { generateUnifiedInvoicePDF } from '../utils/pdfGenerator';
import { processUsageRecords, formatMinutesToDuration } from '../utils/timePricing';

const InvoiceViewer = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [invoice, setInvoice] = useState(null);
  const [office, setOffice] = useState(null);
  const [lunes, setLunes] = useState([]);
  const [buttonDetails, setButtonDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        setLoading(true);
        
        // Load invoice data
        const invoiceResponse = await apiService.getInvoice(invoiceId);
        if (invoiceResponse.success) {
          setInvoice(invoiceResponse.data);
          
          // Load office data
          const officeResponse = await apiService.getDentalOffice(invoiceResponse.data.dental_office_id);
          if (officeResponse.success) {
            setOffice(officeResponse.data);
            
            // Load lune machines for this office
            const token = localStorage.getItem('authToken');
            const lunesResponse = await fetch(`/api/lune-machines?officeId=${invoiceResponse.data.dental_office_id}`, {
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

            // Load S3 button usage data
            try {
              const s3Response = await fetch('https://siqolawsbucket.s3.us-east-1.amazonaws.com/Button_details_updated.json');
              if (s3Response.ok) {
                const s3Data = await s3Response.json();
                setButtonDetails(s3Data);
              }
            } catch (s3Error) {
              console.log('S3 data not available:', s3Error);
            }
          }
        } else {
          setError('Invoice not found');
        }
      } catch (error) {
        console.error('Error loading invoice:', error);
        setError('Error loading invoice data');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      loadInvoiceData();
    }
  }, [invoiceId]);

  // Process usage data for invoice (same logic as GenerateUsageInvoice)
  const processInvoiceData = () => {
    
    // Get month and year from invoice, or fallback to generated date
    let targetMonth = invoice?.month;
    let targetYear = invoice?.year;
    
    if (!targetMonth || !targetYear) {
      const generatedDate = new Date(invoice?.generated_at || Date.now());
      targetMonth = generatedDate.getMonth() + 1;
      targetYear = generatedDate.getFullYear();
      console.log('Using fallback month/year from generated_at:', targetMonth, targetYear);
    }
    
    if (!lunes.length || !buttonDetails.length) {
      return { items: [], total: 0, monthlyStats: {} };
    }

    // Time-based pricing is now handled by the timePricing utility
    const items = [];
    let totalAmount = 0;
    
    const monthlyStats = {
      month: targetMonth,
      year: targetYear,
      totalRecords: 0,
      totalMinutes: 0,
      luneBreakdown: {}
    };

    // Process each lune machine
    lunes.forEach(lune => {
      const luneSerial = lune.serial_number;
      
      // Get all data for this lune machine (updated for new JSON structure)
      const allLuneData = buttonDetails.filter(item => {
        const matchesLune = (item.Device_Id && (item.Device_Id === luneSerial || item.Device_Id.includes(luneSerial))) ||
                           (item.Serial_Number && (item.Serial_Number === luneSerial || item.Serial_Number.includes(luneSerial)));
        return matchesLune;
      });
      
      // Use available data instead of strict month filtering
      let luneUsage;
      
      if (allLuneData.length > 0) {
        // Get the first available month/year from the data
        const firstRecord = allLuneData[0];
        const [, availableMonth, availableYear] = firstRecord.Date.split('/').map(Number);
        
        // Filter using the available month/year (updated for new JSON structure)
        luneUsage = buttonDetails.filter(item => {
          const matchesLune = (item.Device_Id && (item.Device_Id === luneSerial || item.Device_Id.includes(luneSerial))) ||
                             (item.Serial_Number && (item.Serial_Number === luneSerial || item.Serial_Number.includes(luneSerial)));
          
          if (matchesLune && item.Date) {
            const [, month, year] = item.Date.split('/').map(Number);
            return month === availableMonth && year === availableYear;
          }
          return false;
        });
        
        // Update monthlyStats to reflect the actual data month/year
        monthlyStats.month = availableMonth;
        monthlyStats.year = availableYear;
      } else {
        luneUsage = [];
      }

      if (luneUsage.length > 0) {
        // Process usage records with time-based pricing
        const { processedRecords, statistics } = processUsageRecords(luneUsage);
        
        // Initialize lune breakdown with time-based structure
        monthlyStats.luneBreakdown[luneSerial] = {
          luneName: luneSerial,
          totalRecords: statistics.totalRecords,
          totalMinutes: statistics.totalMinutes,
          totalAmount: statistics.totalCharge,
          averageDuration: statistics.averageDuration,
          priceBreakdown: statistics.priceBreakdown
        };

        // Update overall monthly stats
        monthlyStats.totalRecords += statistics.totalRecords;
        monthlyStats.totalMinutes += statistics.totalMinutes;
        totalAmount += statistics.totalCharge;

        // Add individual items for each usage record
        processedRecords.forEach(record => {
          items.push({
            tid: record.Tid,
            luneSerial: luneSerial,
            sbc: record.Serial_Number, // Add SBC field
            date: record.Date,
            time: record.Current_time,
            action: record.Btn,
            duration: record.Duration,
            durationMinutes: record.durationMinutes,
            priceRange: record.priceRange,
            charge: record.charge,
            amount: record.charge
          });
        });
      }
    });

    return { items, total: totalAmount, monthlyStats };
  };

  const generatePDF = async () => {
    if (!invoice || !office) return;

    // Process the usage data
    const { items: pdfItems, total: pdfTotal, monthlyStats: pdfMonthlyStats } = processInvoiceData();

    const invoiceData = {
      office,
      items: pdfItems,
      total: pdfTotal,
      monthlyStats: pdfMonthlyStats,
      invoiceNumber: invoice.invoice_number,
      invoiceId: invoice.id, // Add invoice ID for public payment link
      selectedMonth: null, // Will be handled by the unified generator
      selectedYear: null,
      lunes
    };

    const doc = await generateUnifiedInvoicePDF(invoiceData);
    doc.save(`EnamelPure-Invoice-${invoice.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {error}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!invoice || !office) {
    return (
      <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Invoice not found
          </h2>
        </div>
      </div>
    );
  }

  // Get processed usage data for display
  const { items, total, monthlyStats } = processInvoiceData();

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex space-x-3">
          <button
            onClick={generatePDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className={`rounded-lg shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Invoice Header */}
        <div className={`p-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-start">
            {/* Company Logo & Info */}
            <div className="flex items-start space-x-4">
              <img 
                src="/images/logo.png" 
                alt="EnamelPure Logo" 
                className="w-16 h-16 object-contain"
              />
              <div>
                <h1 className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>EnamelPure</h1>
                {/* Removed Billing Management System text */}
              </div>
            </div>

            {/* Invoice Details */}
            <div className={`text-right ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } p-4 rounded-lg shadow-sm`}>
              <h2 className={`text-2xl font-bold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>TAX INVOICE</h2>
              <div className={`space-y-2 text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <div>
                  <span className="font-medium">Invoice Number:</span>
                  <div className={`font-mono ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>{invoice.invoice_number}</div>
                </div>
                <div>
                  <span className="font-medium">Invoice Date:</span>
                  <div>{new Date(invoice.generated_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    invoice.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status || 'Unpaid'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Invoice Period */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Bill To */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>BILL TO:</h3>
              <div className={`space-y-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <div className={`font-semibold text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>{office.name}</div>
                <div>NPI ID: {office.npi_id}</div>
                <div>{office.address}</div>
                <div>Phone: {office.phone_number || office.phone || 'N/A'}</div>
                <div>Email: {office.email}</div>
              </div>
            </div>

            {/* Invoice Summary */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>INVOICE SUMMARY:</h3>
              <div className={`space-y-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <div>Total Records: {items.length}</div>
                <div>Total Usage Time: {formatMinutesToDuration(monthlyStats.totalMinutes || 0)}</div>
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>Total: ${(total || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Detailed Usage Records */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>DETAILED USAGE RECORDS:</h3>
            
            <div className="overflow-x-auto">
              <table className={`w-full ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <thead>
                  <tr className={`${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Sr.No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Transaction ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Device ID</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">SBC</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Charge</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  {items.map((item, index) => (
                    <tr key={index} className={`${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">{item.tid}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">{item.luneSerial}</td>
                      <td className="px-4 py-3 text-sm text-center font-mono">{item.sbc || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.time}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.action === 'subging' ? 'bg-blue-100 text-blue-800' :
                          item.action === 'purify' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{item.duration}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        ${(item.charge || item.rate || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Device Usage Summary */}
          {Object.keys(monthlyStats.luneBreakdown || {}).length > 0 && (
            <div className="mb-8">
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>DEVICE USAGE SUMMARY:</h3>
              
              {Object.entries(monthlyStats.luneBreakdown).map(([serial, data]) => {
                const luneInfo = lunes.find(l => l.serial_number === serial);
                return (
                  <div key={serial} className={`mb-4 p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className={`font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Device ID: {serial}
                    </div>
                    {luneInfo && (
                      <div className={`text-sm mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Plan: {luneInfo.plan_type} | SBC: {luneInfo.sbc_identifier}
                      </div>
                    )}
                    <div className={`space-y-1 text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      <div>Total Records: {data.totalRecords || 0} sessions</div>
                      <div>Total Time: {formatMinutesToDuration(data.totalMinutes || 0)}</div>
                    </div>
                    <div className={`text-right mt-2 font-semibold ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Device Total: ${(data.totalAmount || 0).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total Section */}
          <div className="flex justify-end">
            <div className={`w-80 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            } rounded-lg p-6`}>
              <div className={`flex justify-between items-center text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                <span>TOTAL:</span>
                <span>${(total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;
