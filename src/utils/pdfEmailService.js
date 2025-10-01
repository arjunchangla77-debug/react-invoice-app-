/**
 * Frontend PDF Email Service
 * 
 * Handles PDF generation from frontend components and sends them via email.
 * This service captures the exact visual representation that users see,
 * converts it to PDF, and sends it to the backend for email delivery.
 * 
 * Key features:
 * - Frontend PDF generation using html2canvas + jsPDF
 * - Maintains visual fidelity with user interface
 * - Base64 encoding for backend transmission
 * - Error handling and user feedback
 */

/**
 * Generate PDF from frontend element and send via email
 * @param {Object} invoiceData - Invoice data for email content
 * @param {HTMLElement} pdfElement - DOM element to convert to PDF
 * @returns {Promise<Object>} - Success/error response
 */
export const sendInvoiceEmailWithPDF = async (invoiceData, pdfElement) => {
  try {
    console.log('Starting frontend PDF capture and email process...');
    
    // Dynamically import PDF generation libraries to reduce initial bundle size
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    // Generate PDF from the exact element that user sees on screen
    console.log('Generating PDF from frontend element...');
    const canvas = await html2canvas(pdfElement, {
      scale: 2, // High resolution for better quality
      useCORS: true, // Allow cross-origin images
      allowTaint: true, // Allow tainted canvas
      backgroundColor: '#ffffff' // Ensure white background
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Convert PDF to base64
    const pdfBase64 = pdf.output('datauristring');
    console.log('PDF generated successfully from frontend');
    
    // Send to backend for email
    console.log('Sending PDF to backend for email delivery...');
    const response = await fetch('/api/invoices/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        invoiceNumber: invoiceData.invoiceNumber,
        officeName: invoiceData.office?.name || invoiceData.office?.office_name,
        officeEmail: invoiceData.office?.email,
        totalAmount: invoiceData.total || invoiceData.totalAmount,
        issueDate: invoiceData.issueDate || new Date().toISOString(),
        dueDate: invoiceData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        pdfBase64: pdfBase64
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Invoice email sent successfully with frontend PDF');
      return { success: true, message: 'Invoice email sent successfully' };
    } else {
      throw new Error(result.message || 'Failed to send email');
    }
    
  } catch (error) {
    console.error('Error in PDF email process:', error);
    return { success: false, error: error.message };
  }
};

// Alternative method: Use existing PDF download and convert to base64
export const sendInvoiceEmailWithExistingPDF = async (invoiceData, generatePDFFunction) => {
  try {
    console.log('Using existing PDF generation for email...');
    
    // Generate PDF using existing function
    const pdfBlob = await generatePDFFunction();
    
    // Convert blob to base64
    const pdfBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(pdfBlob);
    });
    
    console.log('PDF converted to base64 for email');
    
    // Send to backend for email
    const response = await fetch('/api/invoices/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        invoiceNumber: invoiceData.invoiceNumber,
        officeName: invoiceData.office?.name || invoiceData.office?.office_name,
        officeEmail: invoiceData.office?.email,
        totalAmount: invoiceData.total || invoiceData.totalAmount,
        issueDate: invoiceData.issueDate || new Date().toISOString(),
        dueDate: invoiceData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        pdfBase64: pdfBase64
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Invoice email sent successfully with existing PDF');
      return { success: true, message: 'Invoice email sent successfully' };
    } else {
      throw new Error(result.message || 'Failed to send email');
    }
    
  } catch (error) {
    console.error('Error in existing PDF email process:', error);
    return { success: false, error: error.message };
  }
};
