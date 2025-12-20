/**
 * Muse AI Chat Assistant - Popup Script
 */

// State
let currentState = {
  enabled: true,
  connected: false,
  chatPartner: null,
  messageCount: 0,
  lastMessage: null
};

/**
 * Get DOM elements
 */
const contentEl = document.getElementById('content');

/**
 * Check if current tab is OnlyFans chat
 */
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Check if tab is on OnlyFans chat page
 */
function isOnlyFansChat(url) {
  return url && url.includes('onlyfans.com/my/chats');
}

/**
 * Send message to content script
 */
async function sendToContent(type, data = {}) {
  const tab = await getCurrentTab();
  if (!tab?.id) return null;

  try {
    return await chrome.tabs.sendMessage(tab.id, { type, ...data });
  } catch (err) {
    console.log('Content script not responding:', err);
    return null;
  }
}

/**
 * Send message to background
 */
async function sendToBackground(type, data = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, ...data });
  } catch (err) {
    console.log('Background not responding:', err);
    return null;
  }
}

/**
 * Render not on OnlyFans state
 */
function renderNotOnOF() {
  contentEl.innerHTML = `
    <div class="not-on-of">
      <div class="not-on-of-icon">💬</div>
      <div class="not-on-of-text">
        Open OnlyFans chats to start monitoring messages.<br><br>
        Go to: <strong>onlyfans.com/my/chats</strong>
      </div>
    </div>
  `;
}

/**
 * Render main UI
 */
function renderMainUI() {
  const statusClass = currentState.connected ? 'connected' : 'disconnected';
  const statusText = currentState.connected ? 'Connected' : 'Not connected';

  const lastMsgHtml = currentState.lastMessage
    ? `
      <div class="message-preview-text">${escapeHtml(truncate(currentState.lastMessage.text, 100))}</div>
      <div class="message-preview-meta">
        From: ${escapeHtml(currentState.lastMessage.chatPartner || 'Unknown')}
      </div>
    `
    : `<div class="message-preview-empty">No fan messages yet</div>`;

  contentEl.innerHTML = `
    <div class="status-card">
      <div class="status-row">
        <span class="status-label">Status</span>
        <span class="status-value ${statusClass}">${statusText}</span>
      </div>
      <div class="status-row">
        <span class="status-label">Chat with</span>
        <span class="status-value">${escapeHtml(currentState.chatPartner || 'N/A')}</span>
      </div>
    </div>

    <div class="toggle-container">
      <span class="toggle-label">Monitoring</span>
      <label class="toggle">
        <input type="checkbox" id="enableToggle" ${currentState.enabled ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="stats">
      <div class="stat-box">
        <div class="stat-number" id="msgCount">${currentState.messageCount}</div>
        <div class="stat-label">Messages logged</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">0</div>
        <div class="stat-label">AI suggestions</div>
      </div>
    </div>

    <div class="message-preview">
      <div class="message-preview-header">Last fan message</div>
      ${lastMsgHtml}
    </div>
  `;

  // Attach event listeners
  document.getElementById('enableToggle')?.addEventListener('change', handleToggle);
}

/**
 * Handle enable/disable toggle
 */
async function handleToggle(e) {
  const enabled = e.target.checked;
  currentState.enabled = enabled;

  // Notify background and content script
  await sendToBackground('toggle_enabled', { enabled });
  await sendToContent('toggle_enabled', { enabled });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLen) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

/**
 * Fetch current state from content script and background
 */
async function fetchState() {
  // Get state from background
  const bgState = await sendToBackground('get_state');
  if (bgState) {
    currentState.enabled = bgState.enabled;
    currentState.lastMessage = bgState.lastMessage;
    currentState.messageCount = bgState.messageCount || 0;
  }

  // Get state from content script
  const csState = await sendToContent('get_status');
  if (csState) {
    currentState.connected = true;
    currentState.chatPartner = csState.chatPartner;
    if (csState.messageCount) {
      currentState.messageCount = Math.max(currentState.messageCount, csState.messageCount);
    }
  } else {
    currentState.connected = false;
    currentState.chatPartner = null;
  }
}

/**
 * Initialize popup
 */
async function init() {
  const tab = await getCurrentTab();

  if (!isOnlyFansChat(tab?.url)) {
    renderNotOnOF();
    return;
  }

  // Fetch and render state
  await fetchState();
  renderMainUI();

  // Set up periodic refresh
  setInterval(async () => {
    await fetchState();
    // Update just the dynamic elements without full re-render
    const msgCountEl = document.getElementById('msgCount');
    if (msgCountEl) {
      msgCountEl.textContent = currentState.messageCount;
    }
  }, 2000);
}

/**
 * Listen for updates from background
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'popup_notification') {
    if (message.notificationType === 'new_message') {
      currentState.lastMessage = message.data;
      currentState.messageCount++;
      renderMainUI();
    }
  }
  sendResponse({ received: true });
});

// Start
init();
