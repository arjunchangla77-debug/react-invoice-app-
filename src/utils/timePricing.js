// Time-based pricing utility for lune machine usage
// Pricing based on duration ranges instead of button types

export const TIME_PRICING_TIERS = [
  { minMinutes: 5, maxMinutes: 7, price: 8 },
  { minMinutes: 7, maxMinutes: 9, price: 10 },
  { minMinutes: 9, maxMinutes: 11, price: 12 },
  { minMinutes: 11, maxMinutes: 13, price: 14 },
  { minMinutes: 13, maxMinutes: 15, price: 16 },
  { minMinutes: 15, maxMinutes: 17, price: 18 },
  { minMinutes: 17, maxMinutes: 19, price: 20 },
  { minMinutes: 19, maxMinutes: 21, price: 22 },
  { minMinutes: 21, maxMinutes: 23, price: 24 },
  { minMinutes: 23, maxMinutes: 25, price: 26 },
  { minMinutes: 25, maxMinutes: 27, price: 28 },
  { minMinutes: 27, maxMinutes: 30, price: 30 }
];

/**
 * Convert duration string to minutes
 * @param {string} duration - Duration in format "H:MM:SS" or "MM:SS"
 * @returns {number} - Duration in minutes
 */
export const parseDurationToMinutes = (duration) => {
  if (!duration || typeof duration !== 'string') return 0;
  
  const parts = duration.split(':');
  let minutes = 0;
  
  if (parts.length === 3) {
    // Format: H:MM:SS
    const hours = parseInt(parts[0]) || 0;
    const mins = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    minutes = (hours * 60) + mins + (seconds / 60);
  } else if (parts.length === 2) {
    // Format: MM:SS
    const mins = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    minutes = mins + (seconds / 60);
  }
  
  return Math.round(minutes * 100) / 100; // Round to 2 decimal places
};

/**
 * Get price based on duration in minutes
 * @param {number} minutes - Duration in minutes
 * @returns {number} - Price for the duration
 */
export const getPriceForDuration = (minutes) => {
  if (minutes < 5) return 0; // No charge for less than 5 minutes
  
  // Find the appropriate pricing tier
  const tier = TIME_PRICING_TIERS.find(tier => 
    minutes >= tier.minMinutes && minutes < tier.maxMinutes
  );
  
  if (tier) {
    return tier.price;
  }
  
  // For durations over 30 minutes, charge the maximum rate
  if (minutes >= 30) {
    return 30;
  }
  
  return 0;
};

/**
 * Get price tier description for a given duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Price tier description
 */
export const getPriceTierDescription = (minutes) => {
  if (minutes < 5) return "Under 5 mins (No charge)";
  
  const tier = TIME_PRICING_TIERS.find(tier => 
    minutes >= tier.minMinutes && minutes < tier.maxMinutes
  );
  
  if (tier) {
    return `${tier.minMinutes}-${tier.maxMinutes} mins ($${tier.price})`;
  }
  
  if (minutes >= 30) {
    return "30+ mins ($30)";
  }
  
  return "Unknown duration";
};

/**
 * Calculate total charge for a usage record
 * @param {Object} record - Usage record with duration
 * @returns {Object} - Record with calculated price information
 */
export const calculateUsageCharge = (record) => {
  const minutes = parseDurationToMinutes(record.Duration);
  const price = getPriceForDuration(minutes);
  const tierDescription = getPriceTierDescription(minutes);
  
  return {
    ...record,
    durationMinutes: minutes,
    charge: price,
    priceRange: tierDescription,
    formattedDuration: `${Math.floor(minutes)}:${String(Math.round((minutes % 1) * 60)).padStart(2, '0')}`
  };
};

/**
 * Process multiple usage records and calculate charges
 * @param {Array} records - Array of usage records
 * @returns {Object} - Processed records with statistics
 */
export const processUsageRecords = (records) => {
  if (!Array.isArray(records)) return { processedRecords: [], statistics: {} };
  
  const processedRecords = records.map(calculateUsageCharge);
  
  // Calculate statistics
  const statistics = {
    totalRecords: processedRecords.length,
    totalMinutes: processedRecords.reduce((sum, record) => sum + record.durationMinutes, 0),
    totalCharge: processedRecords.reduce((sum, record) => sum + record.charge, 0),
    averageDuration: processedRecords.length > 0 
      ? processedRecords.reduce((sum, record) => sum + record.durationMinutes, 0) / processedRecords.length 
      : 0,
    priceBreakdown: {}
  };
  
  // Calculate price tier breakdown
  TIME_PRICING_TIERS.forEach(tier => {
    const tierRecords = processedRecords.filter(record => 
      record.durationMinutes >= tier.minMinutes && record.durationMinutes < tier.maxMinutes
    );
    
    if (tierRecords.length > 0) {
      statistics.priceBreakdown[`${tier.minMinutes}-${tier.maxMinutes}mins`] = {
        count: tierRecords.length,
        totalMinutes: tierRecords.reduce((sum, record) => sum + record.durationMinutes, 0),
        totalCharge: tierRecords.reduce((sum, record) => sum + record.charge, 0),
        pricePerUnit: tier.price
      };
    }
  });
  
  return { processedRecords, statistics };
};

/**
 * Format minutes to readable duration string
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration (e.g., "12m 30s", "1h 5m")
 */
export const formatMinutesToDuration = (minutes) => {
  if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes % 1) * 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.floor(minutes % 60);
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
};

const timePricingUtils = {
  TIME_PRICING_TIERS,
  parseDurationToMinutes,
  getPriceForDuration,
  getPriceTierDescription,
  calculateUsageCharge,
  processUsageRecords,
  formatMinutesToDuration
};

export default timePricingUtils;
