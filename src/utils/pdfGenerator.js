import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatMinutesToDuration } from './timePricing';

export const generateUnifiedInvoicePDF = async (invoiceData) => {
  const {
    office,
    items,
    total,
    monthlyStats,
    invoiceNumber,
    selectedMonth,
    selectedYear,
    lunes = []
  } = invoiceData;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Add professional header with logo space
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // Try to add EnamelPure Logo
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const logoDataUrl = canvas.toDataURL('image/png');
          doc.addImage(logoDataUrl, 'PNG', 20, 5, 55, 18);
          resolve();
        } catch (error) {
          console.log('Canvas error:', error);
          resolve();
        }
      };
      
      img.onerror = () => {
        console.log('Logo not found - continuing without logo');
        resolve();
      };
      
      img.src = '/images/logo.png';
      setTimeout(() => resolve(), 2000);
    });
  } catch (error) {
    console.log('Logo loading error:', error);
  }

  // Company Info Section
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  // Removed 'Billing Management System' text

  // Invoice Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('TAX INVOICE', pageWidth - 20, 18, { align: 'right' });

  // Company Details Box
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 35, 80, 50, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, 35, 80, 50);

  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.text('EnamelPure', 80, 18);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('17 Briden St,', 25, 52);
  doc.text('Worcester, MA 01605', 25, 58);
  doc.text('Phone: +1 207-240-1203', 25, 64);
  doc.text('Email: billing@enamelpure.com', 25, 70);
  doc.text('Web: www.enamelpure.com', 25, 76);

  // Invoice Details Box
  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - 80, 35, 60, 50, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(pageWidth - 80, 35, 60, 50);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice Number:', pageWidth - 75, 42);
  doc.setFont(undefined, 'bold');
  doc.text(invoiceNumber || 'N/A', pageWidth - 75, 48);
  doc.setFont(undefined, 'normal');
  
  doc.text('Invoice Date:', pageWidth - 75, 55);
  doc.text(new Date().toLocaleDateString(), pageWidth - 75, 61);
  doc.text('Due Date:', pageWidth - 75, 68);
  doc.text(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(), pageWidth - 75, 74);

  // Bill To Section
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('BILL TO:', 20, 100);
  
  // Office Name (larger, bold)
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text(office?.office_name || office?.name || 'N/A', 20, 108);
  doc.setFont(undefined, 'normal');
  
  // Office Details (with better spacing)
  doc.setFontSize(10);
  doc.text(`NPI ID: ${office?.npi_id || 'N/A'}`, 20, 118);
  
  // Address (single line)
  const address = (office?.address || 'N/A').replace(/[\r\n]+/g, ' ');
  doc.text(address, 20, 128);
  
  // Contact Information
  doc.text(`Phone: ${office?.phone_number || office?.phone || 'N/A'}`, 20, 138);
  doc.text(`Email: ${office?.email || 'N/A'}`, 20, 148);

  // Invoice Period Section
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('INVOICE PERIOD:', pageWidth - 80, 100);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Try to get period from multiple sources
  let displayMonth = selectedMonth || monthlyStats?.month;
  let displayYear = selectedYear || monthlyStats?.year;
  
  // Fallback to current date if no period specified
  if (!displayMonth || !displayYear) {
    const currentDate = new Date();
    displayMonth = displayMonth || currentDate.getMonth() + 1;
    displayYear = displayYear || currentDate.getFullYear();
  }
  
  const periodText = `${monthNames[displayMonth - 1]} ${displayYear}`;
  doc.text(periodText, pageWidth - 80, 110);
  doc.setFont(undefined, 'normal');

  // Summary Statistics Bar
  doc.setFillColor(41, 128, 185);
  doc.rect(20, 180, pageWidth - 40, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`Total Records: ${items?.length || 0}`, 25, 192);
  doc.text(`Total Usage Time: ${formatMinutesToDuration(monthlyStats?.totalMinutes || 0)}`, 80, 192);
  doc.text(`Total Amount: $${total?.toFixed(2) || '0.00'}`, pageWidth - 60, 192);

  // Add new page for detailed table
  doc.addPage();
  
  // Detailed Usage Table on new page
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('USAGE RECORDS:', 20, 30);
  doc.setFont(undefined, 'normal');
  
  let tableStartY = 40;

  const tableData = (items || []).map((item, index) => [
    index + 1,
    item.tid || 'N/A',
    item.luneSerial || item.luneId || 'N/A',
    item.sbc || 'N/A', // Add SBC column
    item.date || 'N/A',
    item.time || 'N/A',
    item.action || 'N/A',
    item.duration || 'N/A',
    `$${(item.charge || item.amount || 0).toFixed(2)}`
  ]);

  doc.autoTable({
    head: [['Sr.\nNo', 'Transaction ID', 'Device ID', 'SBC', 'Date', 'Time', 'Action', 'Duration', 'Charge']],
    body: tableData,
    startY: tableStartY,
    margin: { left: 20, right: 20 },
    theme: 'grid',
    tableWidth: 'auto',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.3,
      lineColor: [200, 200, 200],
      minCellHeight: 12
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      minCellHeight: 10,
      lineWidth: 0.3,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', valign: 'middle' }, // Sr.No
      1: { cellWidth: 28, fontSize: 7, halign: 'center' }, // Transaction ID
      2: { cellWidth: 28, fontSize: 7, halign: 'center' }, // Device ID
      3: { cellWidth: 18, fontSize: 7, halign: 'center' }, // SBC
      4: { cellWidth: 18, halign: 'center', valign: 'middle' }, // Date
      5: { cellWidth: 18, halign: 'center', valign: 'middle' }, // Time
      6: { cellWidth: 15, halign: 'center', valign: 'middle' }, // Action
      7: { cellWidth: 18, halign: 'center', valign: 'middle' }, // Duration
      8: { cellWidth: 15, halign: 'center', valign: 'middle' }   // Charge
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    styles: {
      lineWidth: 0.3,
      lineColor: [200, 200, 200],
      overflow: 'linebreak',
      cellPadding: 2
    },
    didParseCell: function(data) {
      // Center align the "Charge" header text specifically
      if (data.section === 'head' && data.column.index === 8) {
        data.cell.styles.halign = 'center';
      }
    }
  });

  // Device Usage Summary (after table)
  let yPosition = 0; // Declare yPosition in outer scope
  if (monthlyStats?.luneBreakdown && Object.keys(monthlyStats.luneBreakdown).length > 0) {
    let summaryStartY = doc.lastAutoTable.finalY + 25;
    
    // Check if we need a new page for the summary
    if (summaryStartY + 80 > pageHeight - 30) {
      doc.addPage();
      summaryStartY = 30;
    }
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('DEVICE USAGE SUMMARY:', 20, summaryStartY);
    doc.setFont(undefined, 'normal');

    yPosition = summaryStartY + 15;
    Object.entries(monthlyStats.luneBreakdown).forEach(([serial, data]) => {
      const luneInfo = lunes.find(l => l.serial_number === serial);
      
      // Check if we need a new page
      if (yPosition + 60 > pageHeight - 30) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Machine header box
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPosition - 5, pageWidth - 40, 50, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, yPosition - 5, pageWidth - 40, 50);

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Device ID: ${serial}`, 25, yPosition + 5);
      doc.setFont(undefined, 'normal');
      
      if (luneInfo) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Plan: ${luneInfo.plan_type || 'N/A'} | SBC: ${luneInfo.sbc_identifier || 'N/A'}`, 25, yPosition + 12);
        doc.setTextColor(0, 0, 0);
      }
      
      // Time-based usage breakdown
      doc.setFontSize(9);
      doc.text(`Total Records: ${data.totalRecords || 0} sessions`, 25, yPosition + 19);
      doc.text(`Total Time: ${formatMinutesToDuration(data.totalMinutes || 0)}`, 25, yPosition + 26);
      
      // Total for this machine
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Device Total: $${(data.totalAmount || 0).toFixed(2)}`, pageWidth - 70, yPosition + 36);
      doc.setFont(undefined, 'normal');
      
      yPosition += 60;
    });
  }

  // Total Section
  let finalY = doc.lastAutoTable.finalY + 15;
  if (monthlyStats?.luneBreakdown && Object.keys(monthlyStats.luneBreakdown).length > 0) {
    finalY = yPosition + 15;
  }
    
  doc.setFillColor(41, 128, 185);
  doc.rect(pageWidth - 80, finalY, 60, 25, 'F');
  
  doc.setDrawColor(30, 96, 139);
  doc.setLineWidth(1);
  doc.rect(pageWidth - 80, finalY, 60, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Subtotal:', pageWidth - 75, finalY + 8);
  doc.text(`$${(total || 0).toFixed(2)}`, pageWidth - 25, finalY + 8, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL:', pageWidth - 75, finalY + 18);
  doc.text(`$${(total || 0).toFixed(2)}`, pageWidth - 25, finalY + 18, { align: 'right' });

  // Click to Pay Button (positioned horizontally next to total box)
  const buttonY = finalY; // Same Y position as total box
  const buttonWidth = 60; // Same width as total box
  const buttonHeight = 25; // Same height as total box
  const buttonX = pageWidth - 150; // Position to the left of total box
  
  // Button background
  doc.setFillColor(34, 197, 94); // Green color for pay button
  doc.rect(buttonX, buttonY, buttonWidth, buttonHeight, 'F');
  
  // Button border
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(1);
  doc.rect(buttonX, buttonY, buttonWidth, buttonHeight);
  
  // Button text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('CLICK TO PAY', buttonX + (buttonWidth / 2), buttonY + (buttonHeight / 2) + 2, { align: 'center' });
  
  // Add clickable payment link - temporarily redirect to Stripe India
  // TODO: Replace with actual payment implementation later
  const paymentUrl = 'https://stripe.com/in';
  doc.link(buttonX, buttonY, buttonWidth, buttonHeight, { url: paymentUrl });
  

  return doc;
};
