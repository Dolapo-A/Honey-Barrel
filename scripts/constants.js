// Shared constants across the extension

/** UI States */
export const UI_STATE = {
	LOADING: "loading",
	NO_PRODUCT: "no-product",
	NO_MATCHES: "no-matches",
	MATCHES_FOUND: "matches-found",
	ERROR: "error",
};

/** Default values */
export const DEFAULTS = {
	IMAGE_PLACEHOLDER: "https://assets.baxus.co/599/599.jpg",
	MARKETPLACE_URL: "https://www.baxus.co/?sortBy=priority%3Adesc",
	TIMEOUT_MS: 3000,
};

/** API endpoints */
export const API = {
	BAXUS_SEARCH: "https://services.baxus.co/api/search/listings",
};
