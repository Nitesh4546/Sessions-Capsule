<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="SessionCapsule Logo">
</p>

# SessionCapsule (Tab Session Manager)

SessionCapsule is a simple, flat, monochromatic Chrome Extension that allows you to capture, organize, and restore your active window tab sessions directly from the browser sidebar.

## Features

- **Sidebar Integration**: Opens instantly via Chrome's Side Panel API when clicking the toolbar action icon.
- **Save Current Window**: Save all active tabs in the current window with a single click. Default names are generated using the `Session-YYYY-MM-DD-HH-MM` format, or you can supply a custom name.
- **Easy Restore**: Click the restore icon on any saved session card to reopen all tabs in that session instantly, or expand the card details to click and launch individual links.
- **Persistent Storage**: Session data and settings are stored locally on your machine via `chrome.storage.local`.
- **FIFO Session Limits**: Set a limit on the maximum number of sessions saved. The extension automatically discards the oldest session (FIFO) once the limit is exceeded.
- **Monochromatic Styling**: Features a clean, distraction-free flat monochromatic design (pure black and white styling, no gradients, no glassmorphism).
- **Light & Dark Theme Control**:
  - Automatically matches browser/system theme preferences by default.
  - Can be manually overridden inside Settings to stay strictly in **Light Mode** or **Dark Mode**.

## Preview

<p align="center">
  <img src=".img/preview1.png" width="320" alt="SessionCapsule Light Mode Preview">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src=".img/preview2.png" width="320" alt="SessionCapsule Dark Mode Preview">
</p>

## Project Structure

```text
├── manifest.json          # Chrome Extension Manifest v3 config
├── background.js          # Service worker setting side panel click behavior
├── sidebar.html           # Main Sidebar UI structure
├── sidebar.js             # Client-side extension controller logic
├── sidebar.css            # Monochromatic UI styling & theme overrides
├── icons/                 # Extension toolbar and brand icons
└── .img/                  # Extension preview screenshots
```

## How to Install (Unpacked Developer Mode)

1. Clone or download this repository to your local machine.
  ```text
      git clone https://github.com/Nitesh4546/Sessions-Capsule.git
  ```
2. Open Google Chrome (or any Chromium-based browser like Brave, Edge, Opera).
3. Navigate to `chrome://extensions/` by typing it in the address bar.
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click the **Load unpacked** button in the top-left corner.
6. Select the folder containing this extension's files (where `manifest.json` is located).
7. Pin the extension to your toolbar, click the icon, and start capturing tab sessions!
