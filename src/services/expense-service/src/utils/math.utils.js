/**
 * Math Utilities
 * 
 * Utility functions for mathematical operations used in expense calculations.
 * Primarily focused on handling financial calculations with precision.
 */

/**
 * Round a number to a specified number of decimal places
 * @param {number} value - Value to round
 * @param {number} [decimalPlaces=2] - Number of decimal places
 * @returns {number} Rounded number
 */
function roundToDecimalPlaces(value, decimalPlaces = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Value must be a number');
  }
  
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Round a number to two decimal places (common for currency)
 * @param {number} value - Value to round
 * @returns {number} Rounded number
 */
function roundToTwoDecimals(value) {
  return roundToDecimalPlaces(value, 2);
}

/**
 * Format a number as currency according to locale
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - ISO currency code (e.g., 'USD', 'EUR')
 * @param {string} [locale='en-US'] - Locale for formatting
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currencyCode, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

/**
 * Calculate the sum of an array of numbers
 * @param {Array<number>} values - Array of numeric values
 * @returns {number} Sum of values
 */
function sum(values) {
  if (!Array.isArray(values)) {
    throw new Error('Values must be an array');
  }
  
  return values.reduce((total, value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('All values must be numbers');
    }
    return total + value;
  }, 0);
}

/**
 * Calculate the average of an array of numbers
 * @param {Array<number>} values - Array of numeric values
 * @returns {number} Average of values
 */
function average(values) {
  if (!values.length) {
    return 0;
  }
  
  return sum(values) / values.length;
}

/**
 * Distribute a remainder amount across an array of numbers
 * This is useful for handling rounding errors in expense splits
 * @param {Array<number>} values - Array of numeric values to adjust
 * @param {number} remainder - Remainder amount to distribute
 * @param {number} [precision=2] - Decimal precision for results
 * @returns {Array<number>} Adjusted values with remainder distributed
 */
function distributeRemainder(values, remainder, precision = 2) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Values must be a non-empty array');
  }
  
  if (typeof remainder !== 'number' || isNaN(remainder)) {
    throw new Error('Remainder must be a number');
  }
  
  // Round remainder to specified precision to avoid floating point issues
  remainder = roundToDecimalPlaces(remainder, precision);
  
  // No need to distribute if remainder is effectively zero
  if (Math.abs(remainder) < Math.pow(10, -precision)) {
    return [...values];
  }
  
  // Create a copy of the values array
  const result = [...values];
  
  // Determine step size (positive or negative)
  const step = Math.pow(10, -precision) * Math.sign(remainder);
  
  // Number of adjustments needed
  const adjustmentsNeeded = Math.round(Math.abs(remainder) * Math.pow(10, precision));
  
  // Sort indices by value (smallest or largest first, depending on remainder sign)
  const sortedIndices = result
    .map((value, index) => ({ value, index }))
    .sort((a, b) => remainder > 0 ? a.value - b.value : b.value - a.value)
    .map(item => item.index);
  
  // Apply adjustments
  for (let i = 0; i < adjustmentsNeeded && i < result.length; i++) {
    const index = sortedIndices[i % sortedIndices.length];
    result[index] = roundToDecimalPlaces(result[index] + step, precision);
  }
  
  return result;
}

/**
 * Check if two numbers are equal within a tolerance
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} [tolerance=0.001] - Tolerance for equality
 * @returns {boolean} Whether the numbers are equal within tolerance
 */
function isApproximatelyEqual(a, b, tolerance = 0.001) {
  return Math.abs(a - b) < tolerance;
}

module.exports = {
  roundToDecimalPlaces,
  roundToTwoDecimals,
  formatCurrency,
  sum,
  average,
  distributeRemainder,
  isApproximatelyEqual
}; 