// Frontend PDF capture approach - use the same PDF as frontend
const generateInvoicePDF = async (invoiceData) => {
  console.log('Using FRONTEND PDF approach - no backend generation needed');
  console.log('Invoice data:', invoiceData);
  
  // Return null to indicate frontend should handle PDF generation
  // The frontend will generate the PDF and send it to the email service
  console.log('Returning null - frontend will provide PDF');
  return null;
};

module.exports = {
  generateInvoicePDF
};
