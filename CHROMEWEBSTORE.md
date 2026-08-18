# Chrome Web Store Listing: Bionic Web Reader

## Store Metadata

- **Extension Name**: Bionic Web Reader
- **Summary**: Accelerate your reading speed and comprehension on articles, news, and websites with guided Bionic Reading.
- **Category**: Productivity / Accessibility
- **Version**: 1.0.0
- **Default Language**: English

---

## Detailed Description

Accelerate your reading flow and stay laser-focused with Bionic Web Reader.

Bionic Web Reader guides your eyes through artificial fixation points by strategically bolding the initial letters of each word. Your brain recognizes the word fragments and completes the rest effortlessly, dramatically reducing cognitive fatigue and increasing reading speed on articles, blog posts, documentation, and news feeds.

### Key Highlights

- **Customizable Fixation Strength**: Adjust bolding intensity from 30% to 75% to suit your personal reading pace.
- **Multiple Saccade Rhythms**:
  - *All Words*: Continuous fixation guidance for maximum speed.
  - *Every 2nd Word*: Alternating rhythm for natural optical movement.
  - *Long Words Only*: Keeps small words light while highlighting key terms.
- **Safe & Non-Destructive**: Uses standard DOM TreeWalker to alter only readable text without interfering with web applications or layout.
- **Instant Reversion**: Restore original text cleanly with a single click.
- **Infinite Scroll Support**: Automatically adapts to dynamic page loading on Medium, Substack, Reddit, and news sites.
- **Global Keyboard Shortcut**: Press `Alt + B` (`Option + B` on macOS) to instantly toggle Bionic reading.
- **100% Client-Side & Private**: No analytics, no tracking, zero external network requests.

---

## Permissions Justification

| Permission | Purpose |
| :--- | :--- |
| `activeTab` | Required to apply Bionic formatting to the text content of the tab the user is actively reading. |
| `scripting` | Required to dynamically inject content scripts and CSS on-demand when the user activates the extension. |
| `storage` | Required to save user preferences (fixation strength slider percentage and saccade rhythm mode). |

---

## Privacy & Data Use Disclosure

- **Single Purpose**: Apply client-side typography formatting to enhance text readability.
- **Data Collection**: No personal data, browsing history, or user data is collected or transmitted.
- **Offline / Local**: All text processing is executed entirely within the local browser context.
