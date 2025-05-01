/**
 * Shared utility functions
 */

/**
 * Format price as currency
 * @param {number} price - Price value
 * @returns {string} Formatted price
 */
export function formatPrice(price) {
    return (price !== undefined && price !== null)
      ? `$${parseFloat(price).toFixed(2)}`
      : "Price not available";
  }
  
  /**
   * Normalize bottle size for comparison
   * @param {string} size - Bottle size string
   * @returns {string} Normalized size value
   */
  export function normalizeSize(size) {
    if (!size) return "";
  
    // Convert to lowercase and remove spaces
    let normalized = size.toLowerCase().replace(/\s+/g, "");
  
    // Convert to ml for consistency
    if (normalized.includes("l") && !normalized.includes("ml")) {
      const liters = parseFloat(normalized.replace("l", ""));
      normalized = `${liters * 1000}ml`;
    }
  
    // Remove non-numeric characters for comparison
    return normalized.replace(/[^0-9]/g, "");
  }