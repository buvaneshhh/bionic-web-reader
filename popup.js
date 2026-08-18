/**
 * Bionic Web Reader - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const fixationRange = document.getElementById('fixation-range');
  const fixationBadge = document.getElementById('fixation-badge');
  const saccadeModeSelect = document.getElementById('saccade-mode');
  const previewText = document.getElementById('preview-text');
  const btnToggle = document.getElementById('btn-toggle');
  const btnToggleText = document.getElementById('btn-toggle-text');
  const btnRevert = document.getElementById('btn-revert');

  const SAMPLE_SENTENCE = "Bionic reading guides your eyes through artificial fixation points. Your brain completes each word instantaneously with deeper comprehension.";

  let isActive = false;
  let currentRatio = 0.45;
  let currentSaccadeMode = 'all';
  let activeTabId = null;

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format preview text locally for instant visual feedback
   */
  function updatePreview() {
    const ratio = parseFloat(fixationRange.value) / 100;
    const mode = saccadeModeSelect.value;
    const words = SAMPLE_SENTENCE.split(' ');
    let wordCount = 0;

    const formatted = words.map((token) => {
      const match = token.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}'’-]+)([^\p{L}\p{N}]*)$/u);
      if (!match) return escapeHtml(token);

      wordCount++;
      let shouldBold = true;
      if (mode === 'alternating') {
        shouldBold = (wordCount % 2 === 1);
      } else if (mode === 'long-only') {
        shouldBold = match[2].length > 3;
      }

      if (!shouldBold) {
        return escapeHtml(token);
      }

      const core = match[2];
      const len = core.length;
      let boldCount;

      if (len === 1) boldCount = 1;
      else if (len === 2) boldCount = ratio >= 0.5 ? 2 : 1;
      else if (len === 3) boldCount = Math.max(1, Math.round(len * ratio));
      else boldCount = Math.max(1, Math.min(len, Math.ceil(len * ratio)));

      const bold = escapeHtml(core.slice(0, boldCount));
      const normal = escapeHtml(core.slice(boldCount));

      return `${escapeHtml(match[1])}<b>${bold}</b>${normal}${escapeHtml(match[3])}`;
    }).join(' ');

    previewText.innerHTML = formatted;
  }

  /**
   * Update UI State (Buttons, Status Pill)
   */
  function setUIState(active) {
    isActive = active;
    if (isActive) {
      statusPill.className = 'status-pill active';
      statusText.textContent = 'ON';
      btnToggleText.textContent = 'Turn Off';
      btnToggle.className = 'btn btn-primary active-mode';
    } else {
      statusPill.className = 'status-pill inactive';
      statusText.textContent = 'OFF';
      btnToggleText.textContent = 'Apply to Page';
      btnToggle.className = 'btn btn-primary';
    }
  }

  /**
   * Save user preferences to local storage
   */
  function savePreferences() {
    currentRatio = parseFloat(fixationRange.value) / 100;
    currentSaccadeMode = saccadeModeSelect.value;

    chrome.storage.local.set({
      bionicRatio: currentRatio,
      bionicSaccadeMode: currentSaccadeMode
    });
  }

  /**
   * Ensure content script is injected in the active tab
   */
  async function ensureScriptInjected(tabId) {
    try {
      return await chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' });
    } catch (_) {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content.css']
        });
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await new Promise((r) => setTimeout(r, 60));
        return await chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' });
      } catch (err) {
        console.debug('Cannot inject into this page:', err);
        return null;
      }
    }
  }

  /**
   * Initialize popup and query active tab
   */
  async function init() {
    // 1. Load preferences from chrome.storage
    const storage = await chrome.storage.local.get(['bionicRatio', 'bionicSaccadeMode']);
    if (storage.bionicRatio) {
      currentRatio = storage.bionicRatio;
      const percentage = Math.round(currentRatio * 100);
      fixationRange.value = percentage;
      fixationBadge.textContent = `${percentage}%`;
    }
    if (storage.bionicSaccadeMode) {
      currentSaccadeMode = storage.bionicSaccadeMode;
      saccadeModeSelect.value = currentSaccadeMode;
    }

    updatePreview();

    // 2. Query active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        activeTabId = tab.id;

        // Check if restricted browser page
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
          btnToggle.disabled = true;
          btnRevert.disabled = true;
          btnToggleText.textContent = 'Unavailable on System Tabs';
          return;
        }

        const status = await ensureScriptInjected(activeTabId);
        if (status) {
          setUIState(!!status.isActive);
          if (status.ratio) {
            currentRatio = status.ratio;
            const pct = Math.round(currentRatio * 100);
            fixationRange.value = pct;
            fixationBadge.textContent = `${pct}%`;
          }
          if (status.saccadeMode) {
            currentSaccadeMode = status.saccadeMode;
            saccadeModeSelect.value = currentSaccadeMode;
          }
          updatePreview();
        }
      }
    } catch (err) {
      console.debug('Tab query error:', err);
    }
  }

  // --- Event Listeners ---

  // Fixation Slider Change
  fixationRange.addEventListener('input', () => {
    const val = fixationRange.value;
    fixationBadge.textContent = `${val}%`;
    updatePreview();
    savePreferences();

    // If currently active on page, update real-time
    if (isActive && activeTabId) {
      chrome.tabs.sendMessage(activeTabId, {
        action: 'APPLY',
        ratio: parseFloat(val) / 100,
        saccadeMode: saccadeModeSelect.value
      }).catch(() => {});
    }
  });

  // Saccade Mode Change
  saccadeModeSelect.addEventListener('change', () => {
    updatePreview();
    savePreferences();

    if (isActive && activeTabId) {
      chrome.tabs.sendMessage(activeTabId, {
        action: 'APPLY',
        ratio: parseFloat(fixationRange.value) / 100,
        saccadeMode: saccadeModeSelect.value
      }).catch(() => {});
    }
  });

  // Primary Toggle / Apply Button
  btnToggle.addEventListener('click', async () => {
    if (!activeTabId) return;

    savePreferences();
    const targetAction = isActive ? 'REVERT' : 'APPLY';

    try {
      await ensureScriptInjected(activeTabId);
      const res = await chrome.tabs.sendMessage(activeTabId, {
        action: targetAction,
        ratio: currentRatio,
        saccadeMode: currentSaccadeMode
      });

      if (res) {
        setUIState(!!res.isActive);
      } else {
        setUIState(!isActive);
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  });

  // Revert / Reset Button
  btnRevert.addEventListener('click', async () => {
    if (!activeTabId) return;

    try {
      await ensureScriptInjected(activeTabId);
      await chrome.tabs.sendMessage(activeTabId, { action: 'REVERT' });
      setUIState(false);
    } catch (err) {
      console.error('Revert failed:', err);
    }
  });

  // Initialize
  await init();
});
