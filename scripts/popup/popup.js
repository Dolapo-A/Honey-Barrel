import UIController from './ui.controller.js';
import ChromeUtils from './chrome.utils.js';
import { UI_STATE } from '../constants.js';

/**
 * Main application controller
 */
const AppController = {
  /**
   * Initialize the popup
   */
  async init() {
    UIController.setActiveState(UI_STATE.LOADING);
    
    try {
      const activeTab = await ChromeUtils.getActiveTab();
      await this.loadComparisonData(activeTab.id);
    } catch (error) {
      console.error("Popup initialization error:", error);
      UIController.showError(`Error initializing: ${error.message}`);
    }
  },
  
  /**
   * Load and display comparison data
   * @param {number} tabId - Chrome tab ID
   */
  async loadComparisonData(tabId) {
    try {
      // First check if content script has found a product
      const productCheck = await ChromeUtils.sendMessageToTab(
        tabId, 
        { action: "CHECK_FOR_PRODUCT" }
      );
      
      console.log("Product check response:", productCheck);
      
      if (!productCheck || !productCheck.productFound) {
        UIController.setActiveState(UI_STATE.NO_PRODUCT);
        return;
      }
      
      // Get comparison data from background script
      const data = await ChromeUtils.sendMessageToBackground({
        action: "GET_COMPARISON_DATA", 
        tabId: tabId
      });
      
      this.updateUI(data);
    } catch (error) {
      console.error("Failed to load comparison data:", error);
      
      // If we can't communicate with content script, assume no product found
      if (error.message.includes("communication") || 
          error.message.includes("timeout")) {
        UIController.setActiveState(UI_STATE.NO_PRODUCT);
      } else {
        UIController.showError(`Error loading data: ${error.message}`);
      }
    }
  },
  
  /**
   * Update UI with comparison data
   * @param {Object} data - Comparison data
   */
  updateUI(data) {
    if (!data) {
      UIController.setActiveState(UI_STATE.ERROR);
      return;
    }
    
    if (data.error) {
      UIController.showError(`Error: ${data.error}`);
      return;
    }
    
    const { product, comparisons } = data;
    
    if (!product) {
      UIController.setActiveState(UI_STATE.NO_PRODUCT);
      return;
    }
    
    if (!comparisons || comparisons.length === 0) {
      // Product found but no matches
      UIController.renderProductDetails("no-matches-product", product);
      UIController.setActiveState(UI_STATE.NO_MATCHES);
      return;
    }
    
    // Product found with matches
    UIController.renderProductDetails("matches-product", product);
    UIController.renderComparisonResults(comparisons); 
    UIController.setActiveState(UI_STATE.MATCHES_FOUND);
  }
};

// =============================================
// Event Listeners
// =============================================

// Initialize when popup is opened
document.addEventListener("DOMContentLoaded", () => {
  AppController.init();
});

// Set up retry button
document.getElementById("retry-button").addEventListener("click", () => {
  AppController.init();
});

// Optional: Set up any additional UI interactions
document.querySelectorAll('.expandable-section').forEach(section => {
  section.querySelector('.section-header').addEventListener('click', () => {
    section.classList.toggle('expanded');
  });
});