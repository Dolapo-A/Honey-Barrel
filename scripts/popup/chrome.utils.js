import { DEFAULTS } from "../constants.js";

/**
 * Communication utilities for Chrome extension messaging
 */
export default {
	/**
	 * Send message to content script with timeout
	 * @param {number} tabId - Chrome tab ID
	 * @param {Object} message - Message object
	 * @param {number} timeoutMs - Timeout in milliseconds
	 * @returns {Promise} Resolves with response or rejects with error
	 */
	sendMessageToTab(tabId, message, timeoutMs = DEFAULTS.TIMEOUT_MS) {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error("Content script communication timeout"));
			}, timeoutMs);

			chrome.tabs.sendMessage(tabId, message, (response) => {
				clearTimeout(timeoutId);

				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve(response);
				}
			});
		});
	},

	/**
	 * Send message to background script with timeout
	 * @param {Object} message - Message object
	 * @param {number} timeoutMs - Timeout in milliseconds
	 * @returns {Promise} Resolves with response or rejects with error
	 */
	sendMessageToBackground(message, timeoutMs = DEFAULTS.TIMEOUT_MS) {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error("Background script communication timeout"));
			}, timeoutMs);

			chrome.runtime.sendMessage(message, (response) => {
				clearTimeout(timeoutId);

				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve(response);
				}
			});
		});
	},

	/**
	 * Get the active tab
	 * @returns {Promise<chrome.tabs.Tab>} Resolves with active tab
	 */
	getActiveTab() {
		return new Promise((resolve, reject) => {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else if (!tabs || tabs.length === 0) {
					reject(new Error("No active tab found"));
				} else {
					resolve(tabs[0]);
				}
			});
		});
	},
};
