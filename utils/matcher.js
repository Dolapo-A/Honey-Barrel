// Utility functions for matching products between retailer sites and BAXUS

// Common wine/spirit brands for more accurate brand extraction
const KNOWN_BRANDS = [
  "Macallan", "Glenfiddich", "Glenlivet", "Johnnie Walker", "Jack Daniel", 
  "Hennessy", "Rémy Martin", "Dom Pérignon", "Veuve Clicquot", "Moët", 
  "Chateau", "Château", "Domaine", "Louis Roederer", "Krug", "Bulleit",
  "Lagavulin", "Laphroaig", "Ardbeg", "Buffalo Trace", "Pappy Van Winkle"
  // Add more common brands as needed
];

/**
 * Calculate string similarity using optimized method
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0-1 (1 being identical)
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Convert to lowercase for comparison
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Use exact match for short strings
  if (s1 === s2) return 1;
  
  // Quick check: if one string contains the other completely
  if (s1.includes(s2) || s2.includes(s1)) {
    const longerLength = Math.max(s1.length, s2.length);
    const shorterLength = Math.min(s1.length, s2.length);
    return shorterLength / longerLength;
  }
  
  // For longer strings, use word-based comparison for better performance
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Count matching words
  let matchingWords = 0;
  const shorterWordList = words1.length <= words2.length ? words1 : words2;
  const longerWordList = words1.length > words2.length ? words1 : words2;
  
  for (const word of shorterWordList) {
    if (longerWordList.includes(word)) {
      matchingWords++;
    }
  }
  
  // Calculate similarity based on matching words
  const maxWordCount = Math.max(words1.length, words2.length);
  return matchingWords / maxWordCount;
}

/**
 * Extract brand from product name using pattern recognition
 * @param {string} productName - Full product name
 * @returns {string} - Extracted brand name
 */
function extractBrandFromName(productName) {
  if (!productName) return '';
  
  const name = productName.trim();
  
  // Check for known brands first
  for (const brand of KNOWN_BRANDS) {
    if (name.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  // Pattern-based extraction
  // Look for patterns like "Brand Name 12 Year", "Brand-Name Reserve", etc.
  
  // 1. Try to identify brand name before year or age statement
  const yearMatch = name.match(/^(.*?)\s+(?:\d{1,2}\s+(?:Year|Yr|Y(?:ea)?r?s?|Old|Aged))/i);
  if (yearMatch && yearMatch[1]) {
    return yearMatch[1].trim();
  }
  
  // 2. Look for brand before common descriptors
  const descriptorMatch = name.match(/^(.*?)\s+(?:Reserve|Special|Single|Double|Triple|Limited|Edition|Cask|Barrel|Whisky|Scotch|Bourbon)/i);
  if (descriptorMatch && descriptorMatch[1]) {
    return descriptorMatch[1].trim();
  }
  
  // 3. Use first two words as a fallback (more reliable than one word)
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`;
  }
  
  // Final fallback to first word only
  return words[0] || '';
}

/**
 * Enhanced bottle size normalization
 * @param {string} size - Bottle size string
 * @returns {string} - Normalized size in milliliters
 */
function normalizeSizes(size) {
  if (!size) return '';
  
  // Convert to lowercase and remove extra spaces
  const normalized = size.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Match standard formats with regex
  const mlMatch = normalized.match(/(\d+(?:\.\d+)?)\s*ml/i);
  const clMatch = normalized.match(/(\d+(?:\.\d+)?)\s*cl/i);
  const literMatch = normalized.match(/(\d+(?:\.\d+)?)\s*l(?:iter)?s?/i);
  const ozMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz/i);
  
  // Common standard sizes (for exact matching)
  const standardSizes = {
    'fifth': '750', // Standard wine bottle (fifth of a gallon)
    'split': '187', // Split/piccolo (champagne)
    'half': '375', // Demi/half bottle
    'magnum': '1500', // Magnum (double bottle)
    'double magnum': '3000', // Double magnum
    'jeroboam': '4500', // Jeroboam (4-6 bottles)
    'imperial': '6000', // Imperial (8 bottles)
    'standard': '750' // Standard wine bottle
  };
  
  // Check if the size string contains any standard size names
  for (const [name, value] of Object.entries(standardSizes)) {
    if (normalized.includes(name)) {
      return value;
    }
  }
  
  // Convert to ml for numeric values
  if (mlMatch) {
    // Already in ml
    return `${parseFloat(mlMatch[1])}`;
  } else if (clMatch) {
    // Convert centiliters to milliliters
    return `${parseFloat(clMatch[1]) * 10}`;
  } else if (literMatch) {
    // Convert liters to milliliters
    return `${parseFloat(literMatch[1]) * 1000}`;
  } else if (ozMatch) {
    // Convert fluid ounces to milliliters (1 fl oz ≈ 29.5735 ml)
    return `${Math.round(parseFloat(ozMatch[1]) * 29.5735)}`;
  }
  
  // Handle special cases for common wine bottle sizes
  if (normalized.includes('750') || normalized.match(/75\s*cl/)) {
    return '750';
  } else if (normalized.includes('700') || normalized.match(/70\s*cl/)) {
    return '700'; // Common for spirits
  }
  
  // Return original if no conversion possible
  return normalized;
}

/**
 * Calculate match confidence score between source product and BAXUS product
 * @param {Object} sourceProduct - Product from retail site
 * @param {Object} baxusProduct - Product from BAXUS marketplace
 * @returns {number} - Confidence score between 0-1
 */
function calculateMatchConfidence(sourceProduct, baxusProduct) {
  if (!sourceProduct || !baxusProduct) {
    return 0;
  }
  
  let score = 0;
  let totalWeight = 0;
  
  // Name similarity (highest weight)
  const nameWeight = 0.5;
  totalWeight += nameWeight;
  
  const nameSimScore = calculateStringSimilarity(
    sourceProduct.name,
    baxusProduct.name
  );
  score += nameWeight * nameSimScore;
  
  // Brand match (more sophisticated extraction)
  const brandWeight = 0.15;
  totalWeight += brandWeight;
  
  const sourceBrand = extractBrandFromName(sourceProduct.name);
  const baxusBrand = extractBrandFromName(baxusProduct.name);
  
  const brandSimScore = calculateStringSimilarity(sourceBrand, baxusBrand);
  score += brandWeight * brandSimScore;
  
  // Vintage match
  if (sourceProduct.vintage && baxusProduct.vintage) {
    const vintageWeight = 0.2;
    totalWeight += vintageWeight;
    
    // Allow for off-by-one vintage errors (common in wine databases)
    const vintageSourceNum = parseInt(sourceProduct.vintage, 10);
    const vintageBaxusNum = parseInt(baxusProduct.vintage, 10);
    
    if (!isNaN(vintageSourceNum) && !isNaN(vintageBaxusNum)) {
      const vintageMatch = vintageSourceNum === vintageBaxusNum;
      const closeVintage = Math.abs(vintageSourceNum - vintageBaxusNum) === 1;
      
      score += vintageWeight * (vintageMatch ? 1 : (closeVintage ? 0.7 : 0));
    }
  }
  
  // Size match - using enhanced normalizer
  if (sourceProduct.size && baxusProduct.size) {
    const sizeWeight = 0.15;
    totalWeight += sizeWeight;
    
    const normalizedSourceSize = normalizeSizes(sourceProduct.size);
    const normalizedBaxusSize = normalizeSizes(baxusProduct.size);
    
    // Perfect match is best, but close sizes are considered
    if (normalizedSourceSize && normalizedBaxusSize) {
      const sizeSourceNum = parseInt(normalizedSourceSize, 10);
      const sizeBaxusNum = parseInt(normalizedBaxusSize, 10);
      
      if (!isNaN(sizeSourceNum) && !isNaN(sizeBaxusNum)) {
        const sizeMatch = sizeSourceNum === sizeBaxusNum;
        // Within 5% size difference still gets partial score
        const closeSize = Math.abs(sizeSourceNum - sizeBaxusNum) / sizeBaxusNum < 0.05;
        
        score += sizeWeight * (sizeMatch ? 1 : (closeSize ? 0.8 : 0));
      }
    }
  }
  
  // Normalize the score based on weights that were actually used
  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Find best matches for a product in BAXUS results with configurable threshold
 * @param {Object} sourceProduct - Product from retail site
 * @param {Array} baxusResults - List of products from BAXUS
 * @param {Object} options - Configuration options
 * @param {number} options.confidenceThreshold - Minimum confidence score (default: 0.7)
 * @param {number} options.maxResults - Maximum number of results to return (default: 5)
 * @returns {Array} - Sorted list of matching products with confidence scores
 */
function findBestMatches(sourceProduct, baxusResults, options = {}) {
  if (!sourceProduct || !baxusResults || !Array.isArray(baxusResults)) {
    return [];
  }
  
  const {
    confidenceThreshold = 0.7,
    maxResults = 5
  } = options;
  
  // Calculate confidence scores for each result
  const scoredResults = baxusResults.map(baxusProduct => {
    const confidence = calculateMatchConfidence(sourceProduct, baxusProduct);
    
    // Calculate price difference and savings if prices are available
    let priceDifference = 0;
    let percentageSavings = 0;
    
    if (sourceProduct.price && baxusProduct.price) {
      priceDifference = sourceProduct.price - baxusProduct.price;
      percentageSavings = sourceProduct.price > 0 
        ? ((sourceProduct.price - baxusProduct.price) / sourceProduct.price) * 100
        : 0;
    }
    
    return {
      ...baxusProduct,
      confidence,
      priceDifference,
      percentageSavings
    };
  });
  
  // Filter by confidence threshold and sort by confidence and savings
  return scoredResults
    .filter(result => result.confidence >= confidenceThreshold)
    .sort((a, b) => {
      // First sort by confidence (higher is better)
      if (Math.abs(b.confidence - a.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      // Then by savings (higher savings is better)
      return b.percentageSavings - a.percentageSavings;
    })
    .slice(0, maxResults); // Limit number of results
}

// Create a namespace for the matcher utilities
const MatcherUtils = {
  calculateStringSimilarity,
  extractBrandFromName,
  calculateMatchConfidence,
  normalizeSizes,
  findBestMatches
};

// Export to window only if in browser context
if (typeof window !== 'undefined') {
  window.MatcherUtils = MatcherUtils;
}

// Support module exports for testing and modular use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatcherUtils;
}