# ChatGPT Keyboard Scroll

A small Manifest V3 Chrome extension that restores Page Up, Page Down, Home, End, Space, and Shift+Space scrolling in ChatGPT conversations.

## Download and install

1. Download `ChatGPT-Keyboard-Scroll-v1.0.3.zip` from the repository's `dist` folder.
2. Extract it into a folder named `ChatGPT-Keyboard-Scroll`. The extracted folder must contain `manifest.json` and `content.js` directly.
3. Open Chrome at `chrome://extensions`.
4. Enable **Developer mode** in the upper-right corner.
5. Click **Load unpacked** and select the extracted folder.
6. Confirm **ChatGPT Keyboard Scroll** appears on the Extensions page.
7. Open or reload [ChatGPT](https://chatgpt.com), click the conversation area, and test Page Up, Page Down, Home, End, Space, and Shift+Space.
8. Confirm typing still works in the message composer.

Chrome requires the **Load unpacked** step for a locally distributed extension. The ZIP is a convenient download package; it does not run an installer or silently install the extension.

## Behavior

Page Up and Page Down move about 90% of the visible conversation height. Space moves down; Shift+Space moves up. Home goes to the oldest loaded message, and End returns to the newest. Repeated Home presses may load earlier history in ChatGPT.

The extension leaves keys alone when focus is in an editor or interactive control and when Ctrl, Alt, or Meta is held. If it cannot identify a conversation scroll container, it does nothing.

## Privacy and permissions

The manifest has no `permissions` or `host_permissions` entry. Its two content-script match patterns are the only site access, limited to `https://chatgpt.com/*` and `https://chat.openai.com/*`. The content script needs that access to handle keyboard events on those pages.

The extension uses no AI services or models at runtime. It does not read chat text, make network requests, use Chrome storage, run background services, load external code, collect analytics, or send telemetry. It checks only element structure and scroll geometry. Diagnostic logs remain in the local browser console and contain key names and scroll measurements, not chat content. Set `DEBUG = false` in `content.js` to silence them, then reload the extension and page.

## AI usage note

This extension and its documentation were developed with assistance from OpenAI Codex. The extension itself does not connect to or use an AI service when installed.

## Update, removal, and troubleshooting

After changing local files, click **Reload** on the extension card in `chrome://extensions`, then refresh ChatGPT. For a new ZIP version, extract it over the installed files and do the same.

To remove the extension, open `chrome://extensions`, click **Remove** on its card, and delete the extracted folder if no longer needed.

If scrolling does not work, check the browser console for `[ChatGPT Keyboard Scroll] Ready (1.0.3)` and key diagnostics. Confirm the extension's Site Access is restricted to ChatGPT only. If ChatGPT changes its DOM, update only the scroll-container detection logic; no broader permissions are needed.

## License

[MIT](LICENSE).
