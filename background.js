// background.js
// Background service worker for Tab Session Manager extension.

// Set Chrome/Edge specific behavior to open the side panel when the toolbar action button is clicked
if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => {
      console.error("Error setting side panel behavior:", error);
    });
}

// Log confirmation when the extension is loaded or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Tab Session Manager extension installed/updated. Reason:", details.reason);
});
