# Ethan Shield
### Advanced Ad Blocker & Digital Footprint Protection
**Ethan Software** — v1.0.0

---

## Installation (Chrome / Edge / Brave)

1. Download and unzip the `ethan-shield` folder
2. Open your browser and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `ethan-shield` folder
6. The Ethan Shield icon will appear in your toolbar

---

## Features

### Ad Blocking
- Network-level blocking via Manifest V3 `declarativeNetRequest`
- 40+ ad network domains blocked (Google Ads, Criteo, Taboola, AppNexus, etc.)
- Zero performance overhead — blocking happens before requests reach the network

### Tracker Elimination
- 50+ analytics and tracking scripts blocked
- Covers: Google Analytics, Facebook Pixel, Hotjar, Segment, Mixpanel, Amplitude, and more
- Tracking pixels and beacon requests intercepted

### Cookie Management
- Auto-detects and clears known tracking cookies on page navigation
- Clears `_ga`, `_fbp`, `_hjid`, `mp_`, UTM cookies, and 20+ other patterns
- One-click nuke for all cookies on the current site
- Full browsing data wipe available

### Fingerprint Defense (JS-level)
- **Canvas noise**: Adds imperceptible pixel-level randomization to canvas reads to defeat `toDataURL` fingerprinting
- **Font masking**: Randomizes font availability checks
- **WebRTC blocking**: Strips ICE servers from RTCPeerConnection to prevent local IP leaks
- **Navigator normalization**: Standardizes `hardwareConcurrency`, `deviceMemory`, `platform`, `languages`
- **Battery API block**: Returns rejection promise
- **Audio fingerprint**: Intercepts AudioContext oscillator connections
- **Network info spoofing**: Returns static `effectiveType: 4g`

### Domain-level Fingerprint Blocking
- Blocks FingerprintJS, ThreatMetrix, Sift, MaxMind, and similar SaaS fingerprint services at the network level

---

## File Structure

```
ethan-shield/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker — blocking logic, stats, cookie clearing
├── content.js             # Injected script — JS-level fingerprint defense
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── rules/
│   ├── ads.json           # Ad network blocking rules (40 rules)
│   ├── trackers.json      # Tracker blocking rules (50 rules)
│   └── fingerprint.json   # Fingerprint service blocking rules (11 rules)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions Used

| Permission | Purpose |
|---|---|
| `declarativeNetRequest` | Block ads/trackers at network level |
| `declarativeNetRequestFeedback` | Count blocked requests for stats |
| `storage` | Save settings and stats |
| `tabs` | Read current tab URL for site-specific display |
| `scripting` | Inject fingerprint defense script |
| `webNavigation` | Trigger cookie clearing on page load |
| `cookies` | Read and remove tracking cookies |
| `browsingData` | Full data wipe action |

---

© 2024 Ethan Software. All rights reserved.
