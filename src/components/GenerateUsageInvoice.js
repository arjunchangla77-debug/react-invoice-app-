import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { processUsageRecords, formatMinutesToDuration } from '../utils/timePricing';
import { generateInvoiceNumber } from '../utils/invoiceNumberGenerator';
import { generateUnifiedInvoicePDF } from '../utils/pdfGenerator';
import { sendInvoiceEmailWithExistingPDF } from '../utils/pdfEmailService';
import { useAutoMessage } from '../hooks/useAutoMessage';

const GenerateUsageInvoice = () => {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { officeId } = useParams();
  
  const [office, setOffice] = useState(null);
  const [lunes, setLunes] = useState([]);
  const [buttonDetails, setButtonDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { message, setMessage } = useAutoMessage(5000); // Auto-dismiss after 5 seconds
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Time-based pricing is now handled by the timePricing utility

  // Load office and lune data
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        // Load office data
        const officeResponse = await fetch(`/api/dental-offices/${officeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (officeResponse.ok) {
          const officeResult = await officeResponse.json();
          if (officeResult.success) {
            setOffice(officeResult.data);
          }
        }

        // Load lune machines for this office
        const lunesResponse = await fetch(`/api/lune-machines?officeId=${officeId}`, {
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

        // Load S3 button usage data (updated URL)
        const s3Response = await fetch('https://siqolawsbucket.s3.us-east-1.amazonaws.com/Button_details_updated.json');
        if (s3Response.ok) {
          const s3Data = await s3Response.json();
          setButtonDetails(s3Data);
        }

      } catch (error) {
        setMessage('Error loading data', 'error');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadData();
    }
  }, [isAuthenticated, navigate, officeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process usage data for invoice with time-based pricing
  const processInvoiceData = () => {
    if (!lunes.length || !buttonDetails.length) return { items: [], total: 0, monthlyStats: {} };

    const items = [];
    let totalAmount = 0;
    const monthlyStats = {
      month: selectedMonth,
      year: selectedYear,
      totalRecords: 0,
      totalMinutes: 0,
      luneBreakdown: {}
    };

    lunes.forEach(lune => {
      // Filter button data for this specific lune machine and selected month/year
      const luneButtonData = buttonDetails.filter(item => {
        // Match by Device_Id or Serial_Number (new JSON structure)
        const matchesLune = item.Device_Id === lune.serial_number || 
                           item.Serial_Number === lune.serial_number ||
                           (item.Device_Id && item.Device_Id.includes(lune.serial_number)) ||
                           (item.Serial_Number && item.Serial_Number.includes(lune.serial_number));
        
        // Filter by selected month and year
        if (matchesLune && item.Date) {
          const [, month, year] = item.Date.split('/').map(Number);
          return month === selectedMonth && year === selectedYear;
        }
        return false;
      });

      if (luneButtonData.length > 0) {
        // Process usage records with time-based pricing
        const { processedRecords, statistics } = processUsageRecords(luneButtonData);
        
        // Initialize lune breakdown
        monthlyStats.luneBreakdown[lune.serial_number] = {
          luneName: lune.serial_number,
          totalRecords: statistics.totalRecords,
          totalMinutes: statistics.totalMinutes,
          totalAmount: statistics.totalCharge,
          averageDuration: statistics.averageDuration,
          priceBreakdown: statistics.priceBreakdown
        };

        // Update overall monthly stats
        monthlyStats.totalRecords += statistics.totalRecords;
        monthlyStats.totalMinutes += statistics.totalMinutes;

        // Add each usage record as separate line item
        processedRecords.forEach(record => {
          items.push({
            tid: record.Tid,
            luneSerial: lune.serial_number,
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

        totalAmount += statistics.totalCharge;
      }
    });

    return { items, total: totalAmount, monthlyStats };
  };

  // Generate Professional PDF invoice
  const generatePDF = async () => {
    const { items: pdfItems, total: pdfTotal, monthlyStats: pdfMonthlyStats } = processInvoiceData();
    
    if (pdfItems.length === 0) {
      setMessage('No usage data found for PDF generation', 'error');
      return;
    }

    try {
      const invoiceNumber = generateInvoiceNumber();
      
      // Save invoice to database first to get invoice ID for payment link
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dental_office_id: officeId,
          invoiceNumber: invoiceNumber,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
          description: 'Lune Machine Usage Invoice',
          items: pdfItems.map(item => ({
            description: `${item.action.toUpperCase()} Service - ${item.luneSerial} (${item.duration})`,
            quantity: 1,
            rate: item.charge,
            amount: item.charge
          })),
          subtotal: pdfTotal,
          tax: 0, // No tax applied
          total: pdfTotal,
          notes: `Generated from time-based usage data. Total sessions: ${pdfItems.length}, Total usage time: ${formatMinutesToDuration(pdfMonthlyStats.totalMinutes)}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Now generate PDF with invoice ID for public payment link
          const invoiceData = {
            office,
            items: pdfItems,
            total: pdfTotal,
            monthlyStats: pdfMonthlyStats,
            invoiceNumber,
            invoiceId: result.data.id, // Add invoice ID for public payment link
            selectedMonth,
            selectedYear,
            lunes
          };

          const doc = await generateUnifiedInvoicePDF(invoiceData);
          doc.save(`EnamelPure-Invoice-${invoiceNumber}.pdf`);
          
          setMessage('✅ PDF downloaded successfully!', 'success');
        } else {
          setMessage('Error saving invoice for PDF generation', 'error');
        }
      } else {
        setMessage('Error saving invoice for PDF generation', 'error');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setMessage('Error generating PDF', 'error');
    }
  };


  // Generate and save invoice to database
  const generateInvoice = async () => {
    setGenerating(true);
    
    try {
      const { items, total, monthlyStats } = processInvoiceData();
      
      if (items.length === 0) {
        setMessage('No usage data found for invoice generation', 'error');
        setGenerating(false);
        return;
      }

      const invoiceNumber = generateInvoiceNumber();
      
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dental_office_id: officeId,
          invoiceNumber: invoiceNumber,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
          description: 'Lune Machine Usage Invoice',
          items: items.map(item => ({
            description: `${item.action.toUpperCase()} Service - ${item.luneSerial} (${item.duration})`,
            quantity: 1,
            rate: item.charge,
            amount: item.charge
          })),
          subtotal: total,
          tax: 0, // No tax applied
          total: total,
          notes: `Generated from time-based usage data. Total sessions: ${items.length}, Total usage time: ${formatMinutesToDuration(monthlyStats.totalMinutes)}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessage('✅ Invoice generated and saved successfully!', 'success');
          
          // Automatically send email after successful invoice generation
          if (office?.email) {
            try {
              setMessage('✅ Invoice saved! Sending email...', 'info');
              
              // Prepare invoice data for email with invoice ID for public payment link
              const emailInvoiceData = {
                office,
                items,
                total,
                monthlyStats,
                invoiceNumber,
                invoiceId: result.data.id, // Add invoice ID for public payment link
                selectedMonth,
                selectedYear,
                lunes,
                issueDate: new Date().toISOString(),
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
              };

              // Generate PDF and send email
              const generatePDFForEmail = async () => {
                const doc = await generateUnifiedInvoicePDF(emailInvoiceData);
                return doc.output('blob');
              };

              const emailResult = await sendInvoiceEmailWithExistingPDF(emailInvoiceData, generatePDFForEmail);
              
              if (emailResult.success) {
                setMessage(`✅ Invoice generated, saved, and emailed to ${office.email}!`, 'success');
              } else {
                setMessage(`✅ Invoice saved successfully! ⚠️ Email failed: ${emailResult.error}`, 'warning');
              }
            } catch (emailError) {
              console.error('Email sending error:', emailError);
              setMessage(`✅ Invoice saved successfully! ⚠️ Email failed: ${emailError.message}`, 'warning');
            }
          } else {
            setMessage('✅ Invoice generated and saved! ⚠️ No email address configured for this office.', 'warning');
          }
          
          setTimeout(() => {
            navigate(`/office/${officeId}?tab=invoices`);
          }, 3000); // Increased timeout to show email status
        } else {
          setMessage(result.message || 'Error generating invoice', 'error');
        }
      } else {
        const errorData = await response.text();
        console.error('Invoice generation error:', errorData);
        setMessage(`Error generating invoice: ${response.status}`, 'error');
      }
    } catch (error) {
      setMessage('Error generating invoice', 'error');
      console.error('Error:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading usage data...
        </span>
      </div>
    );
  }

  const { items, total, monthlyStats } = processInvoiceData();

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
              }`}>Monthly Usage Invoice</h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>for {office?.name}</p>
            </div>
          </div>
        </div>

        {/* Month/Year Selection */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>Select Month & Year</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="mb-6">
            <h2 className={`text-2xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>EnamelPure - Invoice Data Report</h2>
            <div className={`text-sm space-y-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Company Details:</h3>
                  <p><strong>Office Name:</strong> {office?.name}</p>
                  <p><strong>NPI ID:</strong> {office?.npi_id}</p>
                  <p><strong>Address:</strong> {office?.address}</p>
                  <p><strong>City:</strong> {office?.town}, {office?.state}</p>
                  <p><strong>Phone:</strong> {office?.phone_number || office?.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {office?.email}</p>
                </div>
                <div>
                  <h3 className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Invoice Details:</h3>
                  <p><strong>Report Date:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>Invoice Period:</strong> {monthNames[selectedMonth - 1]} {selectedYear}</p>
                  <p><strong>Total Records:</strong> {items.length}</p>
                  <p><strong>Total Usage Time:</strong> {formatMinutesToDuration(monthlyStats.totalMinutes)}</p>
                  <p><strong>Total Revenue:</strong> ${total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Summary by Device */}
          {Object.keys(monthlyStats.luneBreakdown).length > 0 && (
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Device Usage Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.entries(monthlyStats.luneBreakdown).map(([serial, data]) => {
                  const luneInfo = lunes.find(l => l.serial_number === serial);
                  return (
                    <div key={serial} className={`p-4 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className={`font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Lune Machine: {serial}
                          </h4>
                          {luneInfo && (
                            <div className={`text-xs mt-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              <p>Plan: {luneInfo.plan_type}</p>
                              <p>SBC: {luneInfo.sbc_identifier}</p>
                            </div>
                          )}
                        </div>
                        <div className={`text-right ${
                          isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          <div className="font-bold text-lg">${data.totalAmount.toFixed(2)}</div>
                          <div className="text-xs">Total Amount</div>
                        </div>
                      </div>
                      
                      <div className={`space-y-2 text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
                          <div className="font-semibold text-blue-800 dark:text-blue-200">Total Records</div>
                          <div className="text-lg font-bold">{data.totalRecords}</div>
                          <div className="text-xs">usage sessions</div>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900 p-3 rounded">
                          <div className="font-semibold text-green-800 dark:text-green-200">Total Time</div>
                          <div className="text-lg font-bold">{formatMinutesToDuration(data.totalMinutes)}</div>
                          <div className="text-xs">usage duration</div>
                        </div>
                        
                        {/* Price Breakdown by Time Ranges */}
                        {Object.keys(data.priceBreakdown).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                            <div className="font-semibold mb-2">Time-based Pricing Breakdown:</div>
                            {Object.entries(data.priceBreakdown).map(([range, breakdown]) => (
                              <div key={range} className="flex justify-between text-xs mb-1">
                                <span>{range}: {breakdown.count} sessions</span>
                                <span>${breakdown.totalCharge.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Usage Data Table */}
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <thead>
                  <tr className={`${
                    isDarkMode ? 'bg-gray-700' : 'bg-blue-500'
                  } text-white`}>
                    <th className="border px-3 py-2 text-left">Sr.No</th>
                    <th className="border px-3 py-2 text-left">Tid</th>
                    <th className="border px-3 py-2 text-left">Device ID</th>
                    <th className="border px-3 py-2 text-left">SBC</th>
                    <th className="border px-3 py-2 text-left">Date</th>
                    <th className="border px-3 py-2 text-left">Time</th>
                    <th className="border px-3 py-2 text-left">Action</th>
                    <th className="border px-3 py-2 text-left">Duration</th>
                    <th className="border px-3 py-2 text-left">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.tid} className={`${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                    }`}>
                      <td className={`border px-3 py-2 ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{index + 1}</td>
                      <td className={`border px-3 py-2 text-xs ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{item.tid}</td>
                      <td className={`border px-3 py-2 text-xs ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{item.luneSerial}</td>
                      <td className={`border px-3 py-2 text-xs ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{item.sbc || 'N/A'}</td>
                      <td className={`border px-3 py-2 ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{item.date}</td>
                      <td className={`border px-3 py-2 ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{item.time}</td>
                      <td className={`border px-3 py-2 ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.action === 'subging' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          item.action === 'purify' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className={`border px-3 py-2 ${
                        isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'
                      }`}>{item.duration}</td>
                      <td className={`border px-3 py-2 font-medium ${
                        isDarkMode ? 'border-gray-600 text-green-400' : 'border-gray-200 text-green-600'
                      }`}>${item.charge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className={`mt-4 text-right ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <div className="text-xl font-bold">
                  Total Revenue: ${total.toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-center py-8 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No usage data found for this office</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate(`/office/${officeId}?tab=invoices`)}
            className={`px-6 py-2 border rounded-lg transition-colors ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          
          {items.length > 0 && (
            <>
              <button
                onClick={generatePDF}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              
              <button
                onClick={generateInvoice}
                disabled={generating}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                title={office?.email ? `Will save invoice and send email to ${office.email}` : 'Will save invoice (no email configured)'}
              >
                <FileText className="w-4 h-4" />
                <span>{generating ? 'Generating...' : 'Generate & Save Invoice'}</span>
              </button>
            </>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg max-w-md ${
            message.includes('❌') || message.includes('Error') 
              ? 'bg-red-50 text-red-600 border border-red-200' 
              : message.includes('✅')
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateUsageInvoice;
