/**
 * Bionic Web Reader - Content Script
 * High-performance text parsing and guided fixation engine for webpages.
 */

(function () {
  // Prevent duplicate script execution
  if (window.__bionicWebReaderInitialized) {
    return;
  }
  window.__bionicWebReaderInitialized = true;

  // State
  let isActive = false;
  let currentRatio = 0.45; // 45% default
  let currentSaccadeMode = 'all'; // 'all', 'alternating', 'long-only'
  let observer = null;
  let wordIndexCounter = 0;

  // Tracking replaced nodes for instant 100% clean reversal
  // Array of { originalText: string, spanNode: HTMLElement, parentNode: Node, nextSibling: Node }
  const transformedRecords = [];

  // Tags to strictly ignore during tree walking
  const IGNORED_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
    'BUTTON', 'CODE', 'PRE', 'SVG', 'CANVAS', 'IFRAME', 'EMBED',
    'OBJECT', 'AUDIO', 'VIDEO', 'MATH', 'KBD', 'SAMP', 'VAR'
  ]);

  /**
   * Escape HTML special characters safely
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
   * Core Bionic formatting for a single word
   */
  function formatWord(word, ratio, shouldBold) {
    if (!shouldBold || !word || word.length === 0) {
      return escapeHtml(word);
    }

    // Match leading punctuation, core alphanumeric word, and trailing punctuation
    // Supports unicode letters and apostrophes (e.g., "don't", "l'arbre", "(hello!)")
    const match = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}'’-]+)([^\p{L}\p{N}]*)$/u);

    if (!match) {
      return escapeHtml(word);
    }

    const leadingPunct = escapeHtml(match[1]);
    const coreWord = match[2];
    const trailingPunct = escapeHtml(match[3]);

    const len = coreWord.length;
    let boldCount;

    if (len === 1) {
      boldCount = 1;
    } else if (len === 2) {
      boldCount = ratio >= 0.5 ? 2 : 1;
    } else if (len === 3) {
      boldCount = Math.max(1, Math.round(len * ratio));
    } else {
      boldCount = Math.max(1, Math.min(len, Math.ceil(len * ratio)));
    }

    const boldPart = escapeHtml(coreWord.slice(0, boldCount));
    const normalPart = escapeHtml(coreWord.slice(boldCount));

    return `${leadingPunct}<b class="bionic-bold">${boldPart}</b>${normalPart}${trailingPunct}`;
  }

  /**
   * Format a full text string with Bionic Reading rules
   */
  function transformText(text, ratio, saccadeMode) {
    // Split by whitespace while preserving whitespace tokens
    const tokens = text.split(/(\s+)/);
    let result = '';

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // If whitespace, append directly
      if (/^\s+$/.test(token) || token.length === 0) {
        result += token;
        continue;
      }

      wordIndexCounter++;
      let shouldBold = true;

      if (saccadeMode === 'alternating') {
        shouldBold = (wordIndexCounter % 2 === 1);
      } else if (saccadeMode === 'long-only') {
        // Strip non-alphanumeric to check true word length
        const cleanWord = token.replace(/[^\p{L}\p{N}]/gu, '');
        shouldBold = cleanWord.length > 3;
      }

      result += formatWord(token, ratio, shouldBold);
    }

    return result;
  }

  /**
   * Check if a DOM node should be processed
   */
  function isValidTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    if (!node.nodeValue || node.nodeValue.trim().length === 0) return false;

    const parent = node.parentElement;
    if (!parent) return false;

    // Check parent tag
    if (IGNORED_TAGS.has(parent.tagName)) return false;

    // Check if editable
    if (parent.isContentEditable || parent.getAttribute('contenteditable') === 'true') {
      return false;
    }

    // Check if already inside a bionic container
    if (parent.closest('.bionic-container, .bionic-bold, .bionic-word')) {
      return false;
    }

    // Check visibility
    if (parent.offsetParent === null && parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    }

    return true;
  }

  /**
   * Process a list of text nodes safely into bionic elements
   */
  function processTextNodes(textNodes, ratio, saccadeMode) {
    for (const textNode of textNodes) {
      if (!isValidTextNode(textNode)) continue;

      const originalText = textNode.nodeValue;
      const formattedHtml = transformText(originalText, ratio, saccadeMode);

      // Create wrapper span
      const span = document.createElement('span');
      span.className = 'bionic-container';
      span.innerHTML = formattedHtml;

      const parentNode = textNode.parentNode;
      if (!parentNode) continue;

      const nextSibling = textNode.nextSibling;

      // Record for reversal
      transformedRecords.push({
        originalText,
        spanNode: span,
        parentNode,
        nextSibling
      });

      // Replace in DOM
      parentNode.replaceChild(span, textNode);
    }
  }

  /**
   * Collect all eligible text nodes in a given root element
   */
  function collectTextNodes(root) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!isValidTextNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }

    return textNodes;
  }

  /**
   * Apply Bionic Reading to the entire webpage
   */
  function applyBionic(ratio = 0.45, saccadeMode = 'all') {
    // If already active, revert previous state cleanly first
    if (isActive) {
      revertBionic();
    }

    currentRatio = ratio;
    currentSaccadeMode = saccadeMode;
    wordIndexCounter = 0;

    const textNodes = collectTextNodes(document.body || document.documentElement);
    processTextNodes(textNodes, currentRatio, currentSaccadeMode);

    isActive = true;
    startObserver();
    notifyStatusChange();
  }

  /**
   * Revert all Bionic Reading modifications back to original text
   */
  function revertBionic() {
    stopObserver();

    // Restore each modified element in reverse order
    while (transformedRecords.length > 0) {
      const record = transformedRecords.pop();
      if (record.spanNode && record.spanNode.parentNode) {
        const textNode = document.createTextNode(record.originalText);
        record.spanNode.parentNode.replaceChild(textNode, record.spanNode);
      }
    }

    // Secondary cleanup: remove any leftover containers if any
    const leftovers = document.querySelectorAll('.bionic-container');
    leftovers.forEach((span) => {
      if (span.parentNode) {
        span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
      }
    });

    isActive = false;
    notifyStatusChange();
  }

  /**
   * Toggle Bionic Reading on / off
   */
  function toggleBionic(ratio = currentRatio, saccadeMode = currentSaccadeMode) {
    if (isActive) {
      revertBionic();
    } else {
      applyBionic(ratio, saccadeMode);
    }
  }

  /**
   * MutationObserver to handle dynamic content (infinite scroll on Medium, Twitter, Reddit, etc.)
   */
  let pendingNodes = [];
  let rafId = null;

  function handleMutations(mutations) {
    if (!isActive) return;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            // Ignore if added node is our own container
            if (addedNode.classList && addedNode.classList.contains('bionic-container')) {
              continue;
            }
            if (IGNORED_TAGS.has(addedNode.tagName)) {
              continue;
            }
            const nodes = collectTextNodes(addedNode);
            pendingNodes.push(...nodes);
          } else if (addedNode.nodeType === Node.TEXT_NODE) {
            if (isValidTextNode(addedNode)) {
              pendingNodes.push(addedNode);
            }
          }
        }
      }
    }

    if (pendingNodes.length > 0 && !rafId) {
      rafId = requestAnimationFrame(() => {
        if (isActive && pendingNodes.length > 0) {
          processTextNodes(pendingNodes, currentRatio, currentSaccadeMode);
          pendingNodes = [];
        }
        rafId = null;
      });
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingNodes = [];
  }

  /**
   * Notify background service worker of status change (for badge updates)
   */
  function notifyStatusChange() {
    try {
      chrome.runtime.sendMessage({
        action: 'STATUS_CHANGED',
        isActive,
        ratio: currentRatio,
        saccadeMode: currentSaccadeMode
      }).catch(() => {
        // Suppress errors when popup or background listener is not active
      });
    } catch (_) {}
  }

  /**
   * Message listener for popup and background commands
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'APPLY':
        applyBionic(request.ratio || currentRatio, request.saccadeMode || currentSaccadeMode);
        sendResponse({ success: true, isActive: true });
        break;

      case 'REVERT':
        revertBionic();
        sendResponse({ success: true, isActive: false });
        break;

      case 'TOGGLE':
        toggleBionic(request.ratio || currentRatio, request.saccadeMode || currentSaccadeMode);
        sendResponse({ success: true, isActive });
        break;

      case 'GET_STATUS':
        sendResponse({
          isActive,
          ratio: currentRatio,
          saccadeMode: currentSaccadeMode
        });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true; // Keep channel open for async response
  });

  // Load saved preferences from chrome.storage if available
  try {
    chrome.storage.local.get(['bionicRatio', 'bionicSaccadeMode', 'bionicAutoApply'], (result) => {
      if (result.bionicRatio) currentRatio = result.bionicRatio;
      if (result.bionicSaccadeMode) currentSaccadeMode = result.bionicSaccadeMode;
      if (result.bionicAutoApply) {
        applyBionic(currentRatio, currentSaccadeMode);
      }
    });
  } catch (_) {}

})();
