import { UI_STATE, DEFAULTS } from "../constants.js";
import { formatPrice } from "../shared/utils.js";

/**
 * UI Controller - manages state and view updates
 */
export default {
	/**
	 * Set the active UI state
	 * @param {string} state - State from UI_STATE
	 */
	setActiveState(state) {
		Object.values(UI_STATE).forEach((s) => {
			document.getElementById(s).classList.remove("active");
		});
		document.getElementById(state).classList.add("active");
	},

	/**
	 * Show error message
	 * @param {string} message - Error message to display
	 */
	showError(message) {
		document.querySelector("#error p").textContent = message;
		this.setActiveState(UI_STATE.ERROR);
	},

	/**
	 * Render product details section
	 * @param {string} containerId - Element ID of the container
	 * @param {Product} product - Product data
	 */
	renderProductDetails(containerId, product) {
		const container = document.getElementById(containerId);
		if (!container) return;

		const imageElement = container.querySelector(".scraped-product-image");
		if (imageElement) {
			imageElement.src = product.image || DEFAULTS.IMAGE_PLACEHOLDER;
		}

		const safeSetText = (selector, value) => {
			const element = container.querySelector(selector);
			if (element) {
				element.textContent = value || "N/A";
			}
		};

		safeSetText(".scraped-product-name", product.name || "Unknown Product");
		safeSetText(".scraped-product-vintage", product.vintage);
		safeSetText(".scraped-product-price", formatPrice(product.price));
		safeSetText(".scraped-product-size", product.size);

		// // Set image
		// container.querySelector(".scraped-product-image").src =
		// 	product.image || DEFAULTS.IMAGE_PLACEHOLDER;

		// // Set text content
		// container.querySelector(".scraped-product-name").textContent =
		// 	product.name || "Unknown Product";
		// container.querySelector(".scraped-product-vintage").textContent =
		// 	product.vintage || "N/A";
		// container.querySelector(".scraped-product-price").textContent = formatPrice(
		// 	product.price
		// );
		// container.querySelector(".scraped-product-size").textContent =
		// 	product.size || "N/A";
		// container.querySelector(".scraped-product-source").textContent = product.source || "Unknown Source";
	},

	/**
	 * Render comparison results
	 * @param {ComparisonItem[]} comparisons - Array of comparison items
	 */
	renderComparisonResults(comparisons) {
		const resultsContainer = document.getElementById("comparison-results");
		resultsContainer.innerHTML = ""; // Clear previous results

		if (comparisons.length === 1) {
			resultsContainer.classList.add("single-product");
		} else {
			resultsContainer.classList.remove("single-product");
		}

		const totalItems = comparisons.length;

		comparisons.forEach((item) => {
			const itemElement = document.createElement("div");
			// itemElement.className = "comparison-item";
			itemElement.innerHTML = this.createComparisonItemHTML(item, totalItems);
			resultsContainer.appendChild(itemElement);
		});
	},

	/**
	 * Create HTML for a comparison item
	 * @param {ComparisonItem} item - Comparison item data
	 * @param{totalItems} totalItems
	 * @returns {string} HTML string
	 *
	 */
	createComparisonItemHTML(item, totalItems) {
		// Ensure item has valid properties or provide defaults
		const name = item.name || "Unknown Product";
		const price = item.price || 0;
		const priceDifference = item.priceDifference || 0;
		const percentageSavings = item.percentageSavings || 0;
		const imageURL = item.imageURL || DEFAULTS.IMAGE_PLACEHOLDER;
		const size = item.size || "N/A";
		const url = item.url || DEFAULTS.MARKETPLACE_URL;

		// Create savings element if there are savings
		const savingsHTML =
			percentageSavings > 0
				? `<div class="savings">
				 Save <span class="savings-price">${formatPrice(
						Math.abs(priceDifference)
					)}</span>
				
			   </div>`
				: `<div class="no-savings">Same price as original</div>`;

		const percentageSavingsBadge =
			percentageSavings > 0
				? `<div class="discount-badge-container">
				<svg class="badge-background"  width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M9.91571 6.28673L11.9081 2.35051L16.0673 3.41818L19.0457 0.525761L22.824 3.27469L27.1984 1.23484L29.2461 5.62608L33.833 5.82613L34.1297 10.0315L38.1988 11.9765L37.0092 16.2067L40.1039 19.2743L37.3728 23.0538L39.3565 27.3079L34.982 29.3477L34.5952 33.8718L30.465 34.2941L28.6094 38.1666L24.3134 37.1627L21.335 40.0551L17.6208 37.4434L13.2463 39.4833L11.2626 35.2292L6.74848 34.8282L6.38779 30.4857L2.38266 28.6778L3.50825 24.3105L0.409134 21.4119L3.1359 17.8015L1.08823 13.4102L5.46271 11.3704L5.78553 6.70908L9.91571 6.28673Z" fill="#EB4648"/>
				</svg>
				<div class="badge-percent">${Math.abs(percentageSavings).toFixed(0)}% off</div>
			</div>`
				: ``;

		const containerClass = totalItems > 1 ? "baxus-product" : "scraped-product";

		const details = totalItems > 1 ? "" : "details";
		return `
		<div class="${containerClass} details-column">
			<div class="${details}">
				${percentageSavingsBadge}
				<div class="scraped-product-image-container baxus-product-image-container">
					<img
						class="scraped-product-image baxus-product-image"
						src="${imageURL}"
						alt="${name} image"
						loading="lazy"
					/>
				</div>
				<div class="scraped-product-details baxus-product-details">
					<p class="scraped-product-price baxus-product-price">${formatPrice(price)}</p>
					<p class="scraped-product-name baxus-product-name">${name}</p>
					<p class="scraped-product-size baxus-product-size">${size}</p>
					${savingsHTML}
				</div>
			</div>
			<a href="${url}" 
			target="_blank" 
			class="view-button"
			rel="noopener">View on BAXUS
			</a>
		</div>
		 `;
	},
};
