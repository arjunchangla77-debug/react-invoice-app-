import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Download, Phone, Mail, MapPin } from 'lucide-react';
import apiService from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ProfessionalInvoice = () => {
  const { officeId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [invoiceData, setInvoiceData] = useState(null);
  const [buttonDetails, setButtonDetails] = useState([]);

  // Load office data
  useEffect(() => {
    const loadOfficeData = async () => {
      try {
        const response = await apiService.getDentalOffice(officeId);
        if (response.success) {
          setOffice(response.data);
        }
      } catch (error) {
        console.error('Error loading office data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOfficeData();
  }, [officeId]);

  // Load button data from S3
  useEffect(() => {
    const loadButtonData = async () => {
      try {
        const response = await fetch('https://enamelpure.s3.amazonaws.com/button_details.json');
        const data = await response.json();
        setButtonDetails(data);
      } catch (error) {
        console.error('Error loading button data:', error);
      }
    };

    loadButtonData();
  }, []);

  const generateInvoiceData = useCallback(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Filter data for selected month/year
    const filteredData = buttonDetails.filter(item => {
      if (item.Date) {
        const [, month, year] = item.Date.split('/').map(Number);
        return month === selectedMonth && year === selectedYear;
      }
      return false;
    });

    // Calculate totals
    const PRICING = {
      subging: 20,
      purify: 20,
      clean: 10
    };

    let subtotal = 0;
    const lineItems = filteredData.map((item, index) => {
      // Updated for new JSON structure: Action -> Btn, Time -> Current_time, Id -> Device_Id
      const charge = PRICING[item.Btn?.toLowerCase()] || 0;
      subtotal += charge;
      
      return {
        id: index + 1,
        date: item.Date,
        time: item.Current_time,
        luneId: item.Device_Id?.substring(0, 12) + '...',
        sbc: item.Serial_Number, // Add SBC field
        action: item.Btn,
        duration: item.Duration || '0:00:00',
        charge: charge
      };
    });

    const invoiceNumber = `INV-${office.npi_id}-${Date.now()}`;
    const currentDate = new Date();
    const dueDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    setInvoiceData({
      invoiceNumber,
      issueDate: currentDate.toLocaleDateString(),
      dueDate: dueDate.toLocaleDateString(),
      period: `${monthNames[selectedMonth - 1]} ${selectedYear}`,
      lineItems,
      subtotal,
      total: subtotal,
      totalRecords: filteredData.length,
      totalButtonPresses: filteredData.length
    });
  }, [office, buttonDetails, selectedMonth, selectedYear]);

  // Generate invoice data based on selected month/year
  useEffect(() => {
    if (office && buttonDetails.length > 0) {
      generateInvoiceData();
    }
  }, [office, buttonDetails, selectedMonth, selectedYear, generateInvoiceData]);

  const generatePDF = () => {
    if (!invoiceData || !office) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add logo (you'll need to convert your logo to base64 or use a URL)
    // doc.addImage(logoBase64, 'PNG', 20, 5, 55, 18);

    // Header - Company Info
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('EnamelPure', 20, 18);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    // Removed 'Billing Management System' text
    doc.text('17 Briden St', 20, 46);
    doc.text('Worcester, MA 01605', 20, 54);
    doc.text('Phone: +1 207-240-1203', 20, 62);
    doc.text('Email: billing@enamelpure.com', 20, 70);

    // Invoice Title
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text('TAX INVOICE', pageWidth - 20, 18, { align: 'right' });

    // Invoice Details Box
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - 100, 40, 80, 60, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Invoice Number:', pageWidth - 95, 50);
    doc.text(invoiceData.invoiceNumber, pageWidth - 95, 58);
    doc.text('Invoice Date:', pageWidth - 95, 68);
    doc.text(invoiceData.issueDate, pageWidth - 95, 76);
    doc.text('Due Date:', pageWidth - 95, 86);
    doc.text(invoiceData.dueDate, pageWidth - 95, 94);

    // Bill To Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('BILL TO:', 20, 120);
    
    doc.setFontSize(12);
    doc.text(office.name, 20, 132);
    doc.text(`NPI ID: ${office.npi_id}`, 20, 142);
    doc.text(office.address, 20, 152);
    doc.text(`${office.town}, ${office.state}`, 20, 162);
    doc.text(`Phone: ${office.phone}`, 20, 172);
    doc.text(`Email: ${office.email}`, 20, 182);

    // Invoice Period
    doc.setFontSize(14);
    doc.text('INVOICE PERIOD:', pageWidth - 100, 120);
    doc.setFontSize(12);
    doc.text(invoiceData.period, pageWidth - 100, 132);

    // Summary Stats
    doc.setFillColor(41, 128, 185);
    doc.rect(20, 200, pageWidth - 40, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`Total Records: ${invoiceData.totalRecords}`, 25, 215);
    doc.text(`Total Button Presses: ${invoiceData.totalButtonPresses}`, 100, 215);
    doc.text(`Total Amount: $${invoiceData.total.toFixed(2)}`, pageWidth - 80, 215);

    // Line Items Table
    const tableColumns = ['#', 'Date', 'Time', 'Lune ID', 'Action', 'Duration', 'Charge'];
    const tableRows = invoiceData.lineItems.map(item => [
      item.id,
      item.date,
      item.time,
      item.luneId,
      item.action,
      item.duration,
      `$${item.charge.toFixed(2)}`
    ]);

    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 240,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25, halign: 'right' }
      }
    });

    // Total Section
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - 80, finalY, 60, 30, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Subtotal:', pageWidth - 75, finalY + 12);
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, pageWidth - 25, finalY + 12, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', pageWidth - 75, finalY + 25);
    doc.text(`$${invoiceData.total.toFixed(2)}`, pageWidth - 25, finalY + 25, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('For Billing Questions Call (800) 555-1234', pageWidth / 2, pageHeight - 30, { align: 'center' });
    doc.text('Monday - Friday, 9:00 AM - 5:00 PM', pageWidth / 2, pageHeight - 20, { align: 'center' });

    // Save PDF
    doc.save(`EnamelPure-Invoice-${invoiceData.invoiceNumber}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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

      {/* Month/Year Selection */}
      <div className={`rounded-lg shadow-sm p-6 mb-6 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>Invoice Period</h3>
        
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
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((month, index) => (
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

      {/* Professional Invoice */}
      {invoiceData && (
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
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Billing Management System</p>
                  <div className={`mt-2 text-sm space-y-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>17 Briden St, Worcester, MA 01605</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>+1 207-240-1203</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>billing@enamelpure.com</span>
                    </div>
                  </div>
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
                    }`}>{invoiceData.invoiceNumber}</div>
                  </div>
                  <div>
                    <span className="font-medium">Invoice Date:</span>
                    <div>{invoiceData.issueDate}</div>
                  </div>
                  <div>
                    <span className="font-medium">Due Date:</span>
                    <div>{invoiceData.dueDate}</div>
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
                  }`}>{office?.name}</div>
                  <div>NPI ID: {office?.npi_id}</div>
                  <div>{office?.address}</div>
                  <div>{office?.town}, {office?.state}</div>
                  <div>Phone: {office?.phone}</div>
                  <div>Email: {office?.email}</div>
                </div>
              </div>

              {/* Invoice Period */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>INVOICE PERIOD:</h3>
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>{invoiceData.period}</div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className={`rounded-lg p-6 mb-8 ${
              isDarkMode ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>{invoiceData.totalRecords}</div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-blue-200' : 'text-blue-500'
                  }`}>Total Records</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>{invoiceData.totalButtonPresses}</div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-blue-200' : 'text-blue-500'
                  }`}>Button Presses</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    isDarkMode ? 'text-green-300' : 'text-green-600'
                  }`}>${invoiceData.total.toFixed(2)}</div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-green-200' : 'text-green-500'
                  }`}>Total Amount</div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-8">
              <table className={`w-full ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <thead>
                  <tr className={`${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Lune ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">SBC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Charge</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  {invoiceData.lineItems.map((item) => (
                    <tr key={item.id} className={`${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-3 text-sm">{item.id}</td>
                      <td className="px-4 py-3 text-sm">{item.date}</td>
                      <td className="px-4 py-3 text-sm">{item.time}</td>
                      <td className="px-4 py-3 text-sm font-mono">{item.luneId}</td>
                      <td className="px-4 py-3 text-sm font-mono">{item.sbc || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.action === 'subging' ? 'bg-blue-100 text-blue-800' :
                          item.action === 'purify' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{item.duration}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        ${item.charge.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Section */}
            <div className="flex justify-end">
              <div className={`w-80 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              } rounded-lg p-6`}>
                <div className={`flex justify-between items-center mb-4 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <span>Subtotal:</span>
                  <span className="font-medium">${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between items-center text-xl font-bold border-t pt-4 ${
                  isDarkMode ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-800'
                }`}>
                  <span>TOTAL:</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-6 text-center ${
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'
          }`}>
            <div className="space-y-2">
              <div className="font-semibold">For Billing Questions Call (800) 555-1234</div>
              <div className="text-sm">Monday - Friday, 9:00 AM - 5:00 PM</div>
              <div className="text-xs mt-4">
                Thank you for choosing EnamelPure Billing Management System
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalInvoice;
