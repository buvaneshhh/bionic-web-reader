/**
 * Bionic Web Reader - Background Service Worker
 * Manages global keyboard shortcuts (Alt+B) and browser action badge state.
 */

// Helper to update action badge
async function updateBadge(tabId, isActive) {
  try {
    if (isActive) {
      await chrome.action.setBadgeText({ tabId, text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' }); // Emerald Green
    } else {
      await chrome.action.setBadgeText({ tabId, text: '' });
    }
  } catch (error) {
    console.debug('Failed to update action badge:', error);
  }
}

// Ensure content script is injected before sending messages
async function ensureContentScriptInjected(tabId) {
  try {
    // Try sending a status ping
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' });
    return response;
  } catch (_) {
    // Inject scripts if not responding
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css']
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    // Brief delay to allow content script setup
    await new Promise((resolve) => setTimeout(resolve, 50));
    return await chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' });
  }
}

// Toggle Bionic Reader on active tab
async function toggleBionicOnActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  // Don't run on chrome:// or edge:// system pages
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
    return;
  }

  try {
    // Retrieve user preferences
    const storage = await chrome.storage.local.get(['bionicRatio', 'bionicSaccadeMode']);
    const ratio = storage.bionicRatio || 0.45;
    const saccadeMode = storage.bionicSaccadeMode || 'all';

    await ensureContentScriptInjected(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'TOGGLE',
      ratio,
      saccadeMode
    });

    if (response && typeof response.isActive === 'boolean') {
      await updateBadge(tab.id, response.isActive);
    }
  } catch (err) {
    console.error('Failed to toggle Bionic Reader on active tab:', err);
  }
}

// Listen for keyboard command shortcuts (Alt+B)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-bionic') {
    await toggleBionicOnActiveTab();
  }
});

// Listen for status updates from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'STATUS_CHANGED' && sender.tab && sender.tab.id) {
    updateBadge(sender.tab.id, message.isActive);
    sendResponse({ acknowledged: true });
    return true;
  }
});
