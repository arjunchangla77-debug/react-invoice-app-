/**
 * Generate invoice number in format: INV-YYMM######
 * Example: INV-2509000001
 * 
 * @param {Date} date - The date for the invoice (defaults to current date)
 * @returns {string} - Formatted invoice number
 */
export const generateInvoiceNumber = (date = new Date()) => {
  // Get last 2 digits of year
  const year = date.getFullYear().toString().slice(-2);
  
  // Get 2-digit month (01-12)
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Generate 6-digit random number (000001-999999)
  const randomNum = Math.floor(Math.random() * 999999) + 1;
  const paddedNum = randomNum.toString().padStart(6, '0');
  
  return `INV-${year}${month}${paddedNum}`;
};

/**
 * Generate invoice number with sequential numbering (for database-backed sequence)
 * @param {Date} date - The date for the invoice
 * @param {number} sequenceNumber - Sequential number from database
 * @returns {string} - Formatted invoice number
 */
export const generateSequentialInvoiceNumber = (date = new Date(), sequenceNumber = 1) => {
  // Get last 2 digits of year
  const year = date.getFullYear().toString().slice(-2);
  
  // Get 2-digit month (01-12)
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Use sequential number padded to 6 digits
  const paddedNum = sequenceNumber.toString().padStart(6, '0');
  
  return `INV-${year}${month}${paddedNum}`;
};

/**
 * Parse invoice number to extract components
 * @param {string} invoiceNumber - Invoice number to parse
 * @returns {object} - Parsed components {year, month, sequence, isValid}
 */
export const parseInvoiceNumber = (invoiceNumber) => {
  const match = invoiceNumber.match(/^INV-(\d{2})(\d{2})(\d{6})$/);
  
  if (!match) {
    return { isValid: false };
  }
  
  const [, year, month, sequence] = match;
  
  return {
    isValid: true,
    year: parseInt(`20${year}`), // Convert 25 to 2025
    month: parseInt(month),
    sequence: parseInt(sequence),
    yearShort: year,
    monthPadded: month,
    sequencePadded: sequence
  };
};

export default generateInvoiceNumber;
