# Muse AI Chat Assistant - Installation Guide

**Version:** 1.0.0-alpha
**For:** OnlyFans Agency Team Members

---

## Quick Start (5 minutes)

### Step 1: Download the Extension

Download the extension ZIP file from the link provided by your admin.

### Step 2: Extract the ZIP

1. Create a folder on your computer, e.g., `C:\Extensions\muse-ai\` (Windows) or `~/Extensions/muse-ai/` (Mac)
2. Extract all files from the ZIP into this folder
3. You should see these files:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `popup.html`
   - `popup.js`
   - `icons/` folder

### Step 3: Enable Developer Mode in Chrome

1. Open Chrome browser
2. Go to `chrome://extensions/` (type in address bar)
3. Turn ON **"Developer mode"** (toggle in top-right corner)

![Developer Mode](https://i.imgur.com/placeholder-dev-mode.png)

### Step 4: Load the Extension

1. Click **"Load unpacked"** button (appears after enabling Developer mode)
2. Navigate to the folder where you extracted the extension
3. Select the folder and click "Select Folder"
4. The extension should now appear in your extensions list

### Step 5: Verify Installation

1. You should see "Muse AI Chat Assistant" in your extensions
2. Pin it to toolbar: Click puzzle icon → Pin "Muse AI Chat Assistant"
3. The extension icon should appear in your toolbar

---

## Using the Extension

### On OnlyFans Chat Page

1. Log in to your OnlyFans creator account
2. Go to **Messages** section
3. Open any chat with a fan
4. When a **fan sends a message**, the extension automatically:
   - Detects the incoming message
   - Sends it to AI for response generation
   - Inserts the AI suggestion into the chat input field
5. **Review the AI response** and edit if needed
6. Click **Send** to send the message

### Popup Controls

Click the extension icon to open controls:

- **Enable/Disable** - Turn AI suggestions on/off
- **Status** - See if extension is connected
- **Message Count** - How many messages processed today

---

## Troubleshooting

### "Extension not working"

1. Make sure you're on `onlyfans.com/my/chats/*` page
2. Refresh the page after installing extension
3. Check if extension is enabled (not grayed out)

### "No AI response appearing"

1. Click extension icon → Check if "Enabled" is ON
2. Check your internet connection
3. Wait a few seconds - AI generation can take 3-10 seconds
4. Check Chrome DevTools console for errors:
   - Right-click → Inspect → Console tab
   - Look for `[Muse AI]` messages

### "AI response is empty or weird"

1. This can happen if the n8n server is overloaded
2. Try again in a few seconds
3. Report persistent issues to your admin

### Extension Disappeared

1. Go to `chrome://extensions/`
2. If "Muse AI Chat Assistant" shows "Errors", click "Errors" to see details
3. Try removing and re-adding the extension

---

## Important Notes

- **Human review required**: Always review AI suggestions before sending
- **Edit freely**: You can modify the AI response before sending
- **Manual send**: Extension does NOT auto-send - you always click Send
- **Privacy**: Messages are processed through secure servers, not stored long-term

---

## Technical Details

- **Manifest Version**: 3 (latest Chrome standard)
- **Permissions**: Only accesses `onlyfans.com` domain
- **No data collection**: Extension doesn't track your browsing history
- **Secure API**: All communication over HTTPS

---

## Support

If you have issues:
1. Take a screenshot of any error messages
2. Note what action caused the problem
3. Contact your agency admin

---

**Enjoy more efficient chatting!** 🚀
