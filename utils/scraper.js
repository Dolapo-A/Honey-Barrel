// Utility functions for scraping different wine/whisky websites

// Collection of site-specific selectors for common elements
const siteSelectors = {
	"wine.com": {
		productName: "h1.product-name",
		price: "span.price",
		vintage: ".vintage-info",
		size: ".bottle-size",
	},
	"totalwine.com": {
		productName: ".product-name h1",
		price: ".price",
		vintage: ".product-year",
		size: ".product-size",
	},
	"caskers.com": {
		productName: "h1.product-single__title",
		price: ".product__price",
		vintage: ".product-single__meta .vintage",
		size: ".product-single__meta .size",
	},
	"reservebar.com": {
		productName: "h1.product-title",
		price: ".product-price",
		vintage: ".product-meta .vintage",
		size: ".product-meta .size",
	},
	"drizly.com": {
		productName: ".product-name h1",
		price: ".price-display",
		vintage: ".product-details-vintage",
		size: ".product-details-size",
	},
	// Add more sites as needed
};

// Common size patterns to look for
const sizePatterns = [
	/(\d+(\.\d+)?\s*[mM][lL])/, // milliliters (750 ml, 375ml)
	/(\d+(\.\d+)?\s*[lL])/, // liters (1L, 1.5L)
	/(\d+\s*[cC][lL])/, // centiliters (75cl, 70cl)
	/(\d+(\.\d+)?\s*[oO][zZ])/, // ounces (750 oz)
];

/**
 * Extract text content from an element using a selector
 * @param {string} selector - CSS selector
 * @param {boolean} trim - Whether to trim whitespace
 * @returns {string|null} - Text content or null if not found
 */
function extractElementText(selector, trim = true) {
	const element = document.querySelector(selector);
	if (!element) return null;

	const text = element.textContent;
	return trim ? text.trim() : text;
}

/**
 * Extract a numeric price from text
 * @param {string} text - Text containing price
 * @returns {number|null} - Extracted price or null if not found
 */
function extractPrice(text) {
	if (!text) return null;

	// Remove currency symbols and commas
	const cleanText = text.replace(/[^\d.]/g, "");
	const price = parseFloat(cleanText);

	return isNaN(price) ? null : price;
}

/**
 * Extract bottle size from text
 * @param {string} text - Text to search for size
 * @returns {string|null} - Standardized bottle size or null
 */
function extractBottleSizeFromText(text) {
	if (!text) return null;

	for (const pattern of sizePatterns) {
		const match = text.match(pattern);
		if (match && match[0]) {
			return standardizeBottleSize(match[0]);
		}
	}

	return null;
}

/**
 * Standardize bottle size format
 * @param {string} size - Original size text
 * @returns {string} - Standardized size
 */
function standardizeBottleSize(size) {
	if (!size) return null;

	// Convert to lowercase and remove spaces
	const sizeStr = size.toLowerCase().replace(/\s+/g, "");

	// Convert to ml for consistency
	if (sizeStr.includes("l") && !sizeStr.includes("ml")) {
		if (sizeStr.includes("cl")) {
			// Convert centiliters to milliliters
			const cl = parseFloat(sizeStr.replace("cl", ""));
			return `${cl * 10}ml`;
		} else {
			// Convert liters to milliliters
			const liters = parseFloat(sizeStr.replace("l", ""));
			return `${liters * 1000}ml`;
		}
	} else if (sizeStr.includes("oz")) {
		// Convert ounces to milliliters (1 oz ≈ 29.5735 ml)
		const oz = parseFloat(sizeStr.replace("oz", ""));
		return `${Math.round(oz * 29.5735)}ml`;
	}

	return sizeStr;
}

/**
 * Extract vintage year from text
 * @param {string} text - Text to search for vintage
 * @returns {string|null} - Extracted vintage or null
 */
function extractVintageFromText(text) {
	if (!text) return null;

	// Look for 4-digit year patterns
	const yearMatch = text.match(/\b(19|20)\d{2}\b/);
	return yearMatch ? yearMatch[0] : null;
}

/**
 * Get the domain from the current URL
 * @returns {string} - Domain name (e.g., "wine.com")
 */
function getCurrentDomain() {
	const hostname = window.location.hostname;
	const parts = hostname.split(".");
	return parts.length >= 2
		? `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
		: hostname;
}

/**
 * Check if the current page is a product page based on URL patterns
 * @param {string} url - URL to check
 * @returns {boolean} - True if it's a product page
 */
function isProductPage(url) {
	// Common product page patterns
	const productPagePatterns = [
		/\/product\//i,
		/\/p\/\d+/i,
		/\/item\//i,
		/\/spirits\/[\w-]+\/\d+/i,
		/\/wine\/[\w-]+\/\d+/i,
		/\/whisky\/[\w-]+\//i,
	];

	return productPagePatterns.some((pattern) => pattern.test(url));
}

/**
 * Clean and normalize product name
 * @param {string} name - Product name
 * @param {string|null} vintage - Vintage to remove from name
 * @returns {string} - Cleaned name
 */
function cleanProductName(name, vintage) {
	if (!name) return "";

	// Replace multiple spaces with a single space
	let cleanName = name.replace(/\s+/g, " ").trim();

	// Remove vintage from name if it's separately identified
	if (vintage) {
		cleanName = cleanName.replace(vintage, "").trim();
	}

	// Remove common suffixes
	cleanName = cleanName
		.replace(
			/\b(whisky|whiskey|bourbon|scotch|wine|red wine|white wine)\b$/i,
			""
		)
		.trim();

	return cleanName;
}

// Site-specific scraping configurations
const scraperConfigs = {
	"wine.com": {
		name: () => {
			const nameElement = document.querySelector("h1.product-name");
			return nameElement ? cleanProductName(nameElement.textContent) : null;
		},
		price: () => {
			const priceElement = document.querySelector("span.price");
			return priceElement ? extractPrice(priceElement.textContent) : null;
		},
		image: () => {
			const imgElement = document.querySelector(".product-image img");
			return imgElement ? imgElement.src : null;
		},
		vintage: () => {
			const vintageElement = document.querySelector(".vintage-info");
			return vintageElement
				? extractVintageFromText(vintageElement.textContent)
				: null;
		},
		size: () => {
			const sizeElement = document.querySelector(".bottle-size");
			return sizeElement
				? extractBottleSizeFromText(sizeElement.textContent)
				: null;
		},
	},
	"totalwine.com": {
		name: () => {
			const nameElement = document.querySelector('[class^="productTitle__"]');
			return nameElement ? cleanProductName(nameElement.textContent) : null;
		},
		price: () => {
			const priceElement = document.querySelector(
				'[class^="mixSixPriceTxt__"], [class^="ProductPricestyled__Price-"], [class^="priceTxt__"]'
			);
			return priceElement ? extractPrice(priceElement.textContent) : null;
		},
		image: () => {
			const imgElement = document.querySelector(
				'[class^="ProductImagestyled__Img-"]'
			);
			return imgElement ? imgElement.src : null;
		},
		vintage: () => {
			// Extract vintage from product title if available
			const nameElement = document.querySelector('[class^="productTitle__"]');
			if (nameElement) {
				const vintage = extractVintageFromText(nameElement.textContent);
				return vintage;
			}
			return null;
		},
		size: () => {
			const sizeElement = document.querySelector(
				'[class^="productSubTitle__"]'
			);
			return sizeElement
				? extractBottleSizeFromText(sizeElement.textContent)
				: null;
		},
		source: () => {
			const hostname = window.location.hostname.replace("www.", "");

			return hostname;
		},
	},
	"caskers.com": {
		name: () => {
			const nameElement = document.querySelector("h1.product-single__title");
			return nameElement ? cleanProductName(nameElement.textContent) : null;
		},
		price: () => {
			const priceElement = document.querySelector(".product__price");
			return priceElement ? extractPrice(priceElement.textContent) : null;
		},
		image: () => {
			const imgElement = document.querySelector(".product-single__media img");
			return imgElement ? imgElement.src : null;
		},
		vintage: () => {
			const vintageElement = document.querySelector(
				".product-single__meta .vintage"
			);
			return vintageElement
				? extractVintageFromText(vintageElement.textContent)
				: null;
		},
		size: () => {
			const sizeElement = document.querySelector(".product-single__meta .size");
			return sizeElement
				? extractBottleSizeFromText(sizeElement.textContent)
				: null;
		},
	},
	"reservebar.com": {
		name: () => {
			const nameElement = document.querySelector("h1.product-title");
			return nameElement ? cleanProductName(nameElement.textContent) : null;
		},
		price: () => {
			const priceElement = document.querySelector(".product-price");
			return priceElement ? extractPrice(priceElement.textContent) : null;
		},
		image: () => {
			const imgElement = document.querySelector(".product-image img");
			return imgElement ? imgElement.src : null;
		},
		vintage: () => {
			const vintageElement = document.querySelector(".product-meta .vintage");
			return vintageElement
				? extractVintageFromText(vintageElement.textContent)
				: null;
		},
		size: () => {
			const sizeElement = document.querySelector(".product-meta .size");
			return sizeElement
				? extractBottleSizeFromText(sizeElement.textContent)
				: null;
		},
	},
	"drizly.com": {
		name: () => {
			const nameElement = document.querySelector(".product-name h1");
			return nameElement ? cleanProductName(nameElement.textContent) : null;
		},
		price: () => {
			const priceElement = document.querySelector(".price-display");
			return priceElement ? extractPrice(priceElement.textContent) : null;
		},
		image: () => {
			const imgElement = document.querySelector(".product-image img");
			return imgElement ? imgElement.src : null;
		},
		vintage: () => {
			const vintageElement = document.querySelector(".product-details-vintage");
			return vintageElement
				? extractVintageFromText(vintageElement.textContent)
				: null;
		},
		size: () => {
			const sizeElement = document.querySelector(".product-details-size");
			return sizeElement
				? extractBottleSizeFromText(sizeElement.textContent)
				: null;
		},
	},
};

// Export all utilities and scraperConfigs to global scope
window.ScraperUtils = {
	siteSelectors,
	extractElementText,
	extractPrice,
	extractBottleSizeFromText,
	standardizeBottleSize,
	extractVintageFromText,
	getCurrentDomain,
	isProductPage,
	cleanProductName,
	scraperConfigs, // Include scraperConfigs in the global namespace
};
