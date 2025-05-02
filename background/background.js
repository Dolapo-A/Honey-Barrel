// Background script for Honey Barrel extension
// Handles API communication and bottle matching

// BAXUS API endpoint
const BAXUS_API_ENDPOINT = "https://services.baxus.co/api/search/listings";

// Cache for API responses to minimize redundant calls
const apiCache = new Map();
const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "PRODUCT_FOUND") {
		// Product data received from content script
		handleProductData(message.data, sender.tab.id);
		return false;
	} else if (message.action === "GET_COMPARISON_DATA") {
		// Request from popup for comparison data
		getComparisonDataForTab(message.tabId)
			.then((data) => {
				sendResponse(data);
			})
			.catch((error) => {
				console.error("Error getting comparison data:", error);
				sendResponse({ error: error.message });
			});
		return true; // Required for async sendResponse
	}
});

// Process product data from content script
async function handleProductData(productData, tabId) {
	try {
		if (!productData || !productData.name || !productData.price) {
			throw new Error("Incomplete product data");
		}

		// Store the product data for this tab
		await storeProductData(tabId, productData);

		// Search for matching products on BAXUS
		const baxusResults = await searchBaxusMarketplace(productData);

		if (!Array.isArray(baxusResults)) {
			throw new Error("Invalid API response format");
		}

		// Match and compare products
		const comparisonResults = matchAndCompareProducts(
			productData,
			baxusResults
		);

		// Store the comparison results
		await storeComparisonResults(tabId, comparisonResults);

		// Update the extension icon to indicate matches were found
		updateExtensionIcon(comparisonResults.length > 0);

		// Notify the tab that we have results
		chrome.tabs.sendMessage(tabId, {
			action: "COMPARISON_RESULTS_READY",
			hasMatches: comparisonResults.length > 0,
		});
	} catch (error) {
		console.error("Error handling product data:", error);
		// Store error state
		await storeComparisonResults(tabId, { error: error.message });
	}
}

// Store product data for a specific tab
async function storeProductData(tabId, productData) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [`product_${tabId}`]: productData }, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

// Store comparison results for a specific tab
async function storeComparisonResults(tabId, results) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({ [`comparison_${tabId}`]: results }, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

// Retrieve comparison data for a tab
async function getComparisonDataForTab(tabId) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(
			[`product_${tabId}`, `comparison_${tabId}`],
			(result) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve({
						product: result[`product_${tabId}`] || null,
						comparisons: result[`comparison_${tabId}`] || [],
					});
				}
			}
		);
	});
}

function testBackgroundScript() {
	// Simulate a message from content script with product data
	handleProductData(testProductData, 12345); // 12345 is a dummy tabId
}

// Test data that simulates scraped content
const testProductData = {
	name: "Caymus Cabernet Sauvignon Napa 50th Anniversary, 2022",
	price: 5.99,
	vintage: "2018",
	size: "750ml",
};

const mockBaxusResponse = {
	results: [
		{
			id: "bx123459",
			name: "Penelope Toasted Barrel Finish Straight Bourbon",
			vintage: "1970",
			size: "47ml",
			price: 30.0,
			seller: "Hiram Walker & Sons",
			condition: "Perfect",
			url: "https://www.baxus.co/asset/CEfGMsZAPNCaqEm7JmQoMvg6wwKnTs6FMyGxNmBuFaN",
			imageURL: "https://assets.baxus.co/599/599.jpg",
		},
		{
			id: "bx123456",
			name: "Caymus Cabernet Sauvignon Napa 50th Anniversary, 2022",
			vintage: "2022",
			size: "750ml",
			price: 60.0,
			seller: "Wine Collector NYC",
			condition: "Perfect",
			url: "https://baxus.co/listing/bx123456",
			imageURL: "https://assets.baxus.co/5967/5967.jpg",
		},
		{
			id: "bx123456",
			name: "Caymus Cabernet Sauvignon Napa 50th Anniversary",
			vintage: "2018",
			size: "750ml",
			price: 6.0,
			seller: "Wine Collector NYC",
			condition: "Perfect",
			url: "https://baxus.co/listing/bx123456",
			imageURL: "https://assets.baxus.co/5967/5967.jpg",
		},
		{
			id: "bx123456",
			name: "Caymus Cabernet Sauvignon Napa 50th Anniversary, 2022",
			vintage: "2018",
			size: "750ml",
			price: 51.0,
			seller: "Wine Collector NYC",
			condition: "Perfect",
			url: "https://baxus.co/listing/bx123456",
			imageURL: "https://assets.baxus.co/599/599.jpg",
		},
		{
			id: "bx123457",
			name: "Taylor Fladgate/Fonseca 1994 Gift Set, 1994",
			vintage: "1994",
			size: "1000ml",
			price: 7.99,
			seller: "Fine Wine Shop",
			condition: "Excellent",
			url: "https://baxus.co/listing/bx123457",
		},
		{
			id: "bx123458",
			name: "Château Lafite-Rothschild 2017",
			vintage: "2017",
			size: "750ml",
			price: 710.5,
			seller: "Premium Wines",
			condition: "Perfect",
			url: "https://baxus.co/listing/bx123458",
			imageURL: "https://assets.baxus.co/599/599.jpg",
		},
	],
};

// Search BAXUS marketplace for matching products
async function searchBaxusMarketplace(productData) {
	const USE_MOCK_DATA = true;

	if (USE_MOCK_DATA) {
		console.log("Using mock data for testing");
		return mockBaxusResponse.results;
	}

	// Create a search query based on the product data
	const searchQuery = createSearchQuery(productData);

	// Check cache first
	const cacheKey = JSON.stringify(searchQuery);
	const cachedResult = apiCache.get(cacheKey);
	if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
		return cachedResult.data;
	}

	// Convert search query to URL parameters
	const queryParams = new URLSearchParams();
	queryParams.append("from", "0");
	queryParams.append("size", "20");
	queryParams.append("listed", "true");

	// Add search query parameters
	if (searchQuery.query) {
		queryParams.append("q", searchQuery.query);
	}

	// Add any filters as query parameters
	if (searchQuery.filters) {
		Object.entries(searchQuery.filters).forEach(([key, value]) => {
			queryParams.append(key, value);
		});
	}

	// Make API request
	try {
		const response = await fetch(
			`${BAXUS_API_ENDPOINT}?${queryParams.toString()}`,
			{
				method: "GET",
				headers: {
					Accept: "application/json",
				},
			}
		);

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data = await response.json();

		// Cache the result
		apiCache.set(cacheKey, {
			timestamp: Date.now(),
			data: data.results || [],
		});

		return data.results || [];
	} catch (error) {
		console.error("Error searching BAXUS marketplace:", error);
		return [];
	}
}

// Create search query from product data
function createSearchQuery(productData) {
	// Extract the brand and product name
	const nameParts = productData.name.split(" ");
	const brand = nameParts[0]; // Simple assumption that first word is the brand

	// Create a query that's not too specific but still relevant
	return {
		query: productData.name.toLowerCase(),
		filters: {
			// Add filters based on available data
			...(productData.vintage && { vintage: productData.vintage }),
			...(productData.size && { bottle_size: productData.size }),
		},
	};
}

// Match and compare products
function matchAndCompareProducts(sourceProduct, baxusResults) {
	// If no BAXUS results, return empty array
	if (!baxusResults || baxusResults.length === 0) {
		return [];
	}

	// Score each BAXUS result for similarity
	const scoredResults = baxusResults.map((baxusProduct) => {
		const similarityScore = calculateSimilarityScore(
			sourceProduct,
			baxusProduct
		);
		return {
			...baxusProduct,
			similarityScore,
			priceDifference: sourceProduct.price - baxusProduct.price,
			percentageSavings:
				((sourceProduct.price - baxusProduct.price) / sourceProduct.price) *
				100,
		};
	});

	// Filter for high enough similarity and sort by savings
	return scoredResults
		.filter((result) => result.similarityScore >= 0.7) // Only keep good matches
		.sort((a, b) => b.percentageSavings - a.percentageSavings);
}

// Calculate similarity score between source product and BAXUS product
function calculateSimilarityScore(sourceProduct, baxusProduct) {
	let score = 0;

	// Name similarity (using simple substring match for now)
	// In a real implementation, you'd use a more sophisticated algorithm like Levenshtein distance
	const sourceName = sourceProduct.name.toLowerCase();
	const baxusName = baxusProduct.name.toLowerCase();

	if (sourceName === baxusName) {
		score += 0.5;
	} else if (sourceName.includes(baxusName) || baxusName.includes(sourceName)) {
		score += 0.3;
	}

	// Vintage match
	if (
		sourceProduct.vintage &&
		baxusProduct.vintage &&
		sourceProduct.vintage === baxusProduct.vintage
	) {
		score += 0.2;
	}

	// Size match
	if (
		sourceProduct.size &&
		baxusProduct.size &&
		normalizeSize(sourceProduct.size) === normalizeSize(baxusProduct.size)
	) {
		score += 0.3;
	}

	return score;
}

// Normalize bottle size for comparison
function normalizeSize(size) {
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

// Update the extension icon based on whether matches were found
function updateExtensionIcon(hasMatches) {
	const iconPath = hasMatches
		? {
				16: "../assets/icons/icon16_active.png",
				48: "../assets/icons/icon48_active.png",
				128: "../assets/icons/icon128_active.png",
		  }
		: {
				16: "../assets/icons/icon16.png",
				48: "../assets/icons/icon48.png",
				128: "../assets/icons/icon128.png",
		  };

	chrome.action.setIcon({ path: iconPath });
}

// Clear data when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
	chrome.storage.local.remove([`product_${tabId}`, `comparison_${tabId}`]);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Background script received message:", message);

	if (message.action === "PRODUCT_FOUND") {
		console.log("Product found:", message.data);
		// Process your data here
		sendResponse({ status: "received" });
		return true; // Keep the message channel open for the async response
	}
});

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
