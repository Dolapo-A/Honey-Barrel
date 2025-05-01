console.log("Honey Barrel content script loaded", window.location.href);

// Wait for the ScraperUtils to be loaded
function checkScraperUtils() {
	console.log("Checking for ScraperUtils...", !!window.ScraperUtils);

	if (window.ScraperUtils && window.ScraperUtils.scraperConfigs) {
		console.log("ScraperUtils found, running scraper");
		runScraper();
	} else {
		// If not available yet, wait a bit and try again
		console.log("ScraperUtils not found, retrying in 100ms");
		setTimeout(checkScraperUtils, 100);
	}
}

function runScraper() {
	const { scraperConfigs, isProductPage } = window.ScraperUtils;
	const hostname = window.location.hostname.replace("www.", "");

	console.log("Current hostname:", hostname);
	console.log("Current URL:", window.location.href);
	console.log("Is this a product page?", isProductPage(window.location.href));

	// Only proceed if this appears to be a product page
	if (!isProductPage(window.location.href)) {
		console.log("This doesn't appear to be a product page, not scraping");
		return;
	}

	try {
		const config = scraperConfigs[hostname];
		if (config) {
			console.log("Found config for site:", hostname);

			// Attempt to scrape each field and log the result
			let name, price, image, vintage, size, source;

			try {
				source = config.source();
				console.log("Scraped source:", source);
			} catch (e) {
				console.error("Error scraping source:", e);
			}

			try {
				name = config.name();
				console.log("Scraped name:", name);
			} catch (e) {
				console.error("Error scraping name:", e);
			}

			try {
				price = config.price();
				console.log("Scraped price:", price);
			} catch (e) {
				console.error("Error scraping price:", e);
			}

			try {
				image = config.image();
				console.log("Scraped image:", image);
			} catch (e) {
				console.error("Error scraping image:", e);
			}

			try {
				vintage = config.vintage?.();
				console.log("Scraped vintage:", vintage);
			} catch (e) {
				console.error("Error scraping vintage:", e);
			}

			try {
				size = config.size?.();
				console.log("Scraped size:", size);
			} catch (e) {
				console.error("Error scraping size:", e);
			}

			const scrapedBottle = { source, name, price, image, vintage, size };
			console.log("Final scraped data:", scrapedBottle);

			// Validate we have at least name and price
			if (scrapedBottle.name && scrapedBottle.price) {
				console.log("Sending complete product data to background");
				chrome.runtime.sendMessage(
					{
						action: "PRODUCT_FOUND",
						data: scrapedBottle,
					},
					(response) => {
						console.log("Background script response:", response);
					}
				);
			} else {
				console.warn("Incomplete product data found - Missing:", {
					name: !scrapedBottle.name,
					price: !scrapedBottle.price,
				});
			}
		} else {
			console.warn("Site not supported yet:", hostname);
		}
	} catch (error) {
		console.error("Error scraping product data:", error);
	} // Add this at the end of your content.js file

	// Listen for messages from popup
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		console.log("Content script received message:", message);

		if (message.action === "CHECK_FOR_PRODUCT") {
			// Check if we have scraped product data
			const { scraperConfigs, isProductPage } = window.ScraperUtils;
			const hostname = window.location.hostname.replace("www.", "");

			// Only respond with true if this appears to be a product page
			if (isProductPage(window.location.href)) {
				const config = scraperConfigs[hostname];
				if (config) {
					// Try to get the product name and price to confirm it's a product
					const name = config.name();
					const price = config.price();

					// Send response back to popup
					sendResponse({
						productFound: !!(name && price),
						productData: { name, price },
					});
					return true; // Keep message channel open for async response
				}
			}

			// No product found
			sendResponse({ productFound: false });
			return true;
		}
	});
}

// Start the process
checkScraperUtils();
