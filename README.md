# Bionic Web Reader (Chrome Extension - Manifest V3)

Accelerate reading speed, focus, and comprehension on articles, blogs, news feeds, and any website using guided **Bionic Reading** fixation anchors.

---

## 🚀 Key Features

- **⚡ Guided Bionic Fixation Algorithm**:
  - Automatically calculates fixation target per word based on your customizable ratio (30% to 75%, default: 45%).
  - Accurately respects leading and trailing punctuation (e.g. `"(cognitive)"` → `"(<b>cog</b>nitive)"`).
- **🎯 Saccade Rhythm Modes**:
  - **All Words**: Bold the beginning of every word for consistent fixation.
  - **Every 2nd Word (Alternating)**: Lighter saccade guide for experienced speed readers.
  - **Long Words Only (>3 chars)**: Highlights only content words while leaving stop words untouched.
- **🛡️ 100% Safe DOM Parsing**:
  - Uses `document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)` to touch only readable text nodes.
  - Strictly ignores `<script>`, `<style>`, `<code>`, `<pre>`, `<textarea>`, `<input>`, `<svg>`, `<canvas>`, and content-editable areas.
  - Caches original text nodes in memory for **instant, 100% clean reversal** without page reloads.
- **🔄 Dynamic Content & Infinite Scroll**:
  - Built-in `MutationObserver` automatically transforms newly loaded articles on Medium, Substack, Reddit, X/Twitter, and news sites.
  - Batched with `requestAnimationFrame` for zero UI stutter.
- **⌨️ Global Keyboard Shortcut**:
  - Press `Alt + B` (or `Option + B` on macOS) on any webpage to instantly toggle Bionic reading.
- **🎨 Sleek Popup UI**:
  - Live interactive preview card.
  - Real-time fixation slider with numeric badge.
  - Active status pill (`ON` / `OFF`) and toolbar badge synchronization.
  - Persists settings across browser sessions via `chrome.storage.local`.

---

## 📦 Installation Instructions

1. Open Google Chrome (or any Chromium-based browser like Brave, Edge, Opera).
2. Navigate to `chrome://extensions/` in your address bar.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select this folder:
   ```
   /home/buavnesh/project/bionic-reader-extension
   ```
6. The extension is now active! Pin it to your toolbar for quick access.

---

## ⌨️ Shortcuts & Controls

| Action | Shortcut / Control |
| :--- | :--- |
| **Toggle Bionic Reading** | `Alt + B` (Mac: `Option + B`) |
| **Adjust Fixation Ratio** | Popup Slider (30% - 75%) |
| **Change Saccade Rhythm** | Popup Dropdown |
| **Revert to Original** | "Original" Button in popup |

---

## 📁 File Structure

```
├── manifest.json       # Manifest V3 configuration & permissions
├── background.js       # Background service worker (shortcuts & badges)
├── content.js          # TreeWalker engine, Bionic algorithm & MutationObserver
├── content.css         # Styling for bionic bold fixation words
├── popup.html          # Extension popup markup with live preview
├── popup.css           # Modern popup design system & slider styles
├── popup.js            # UI controller & tab communication
└── icons/              # Extension icons (16x16, 48x48, 128x128)
```
