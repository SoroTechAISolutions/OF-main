/**
 * Muse AI Chat Assistant - Background Service Worker
 * Handles communication between content script and popup
 */

// API Configuration
const CONFIG = {
  // Backend API (goes through our server, logs to DB)
  apiUrl: 'https://sorotech.ru/of-api/extension/generate',
  apiKey: 'muse-alpha-2025',
  // Direct n8n fallback
  webhookUrl: 'https://n8n.sorotech.ru/webhook/muse-chat',
  timeout: 30000 // 30 seconds
};

// State storage
let state = {
  enabled: true,
  lastMessage: null,
  activeTabId: null,
  messageLog: []
};

// Maximum messages to keep in log
const MAX_LOG_SIZE = 100;

/**
 * Log with prefix
 */
function log(message, data = null) {
  const prefix = '[Muse AI BG]';
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Save state to storage
 */
async function saveState() {
  try {
    await chrome.storage.local.set({ museState: state });
  } catch (err) {
    log('Error saving state:', err);
  }
}

/**
 * Load state from storage
 */
async function loadState() {
  try {
    const result = await chrome.storage.local.get(['museState']);
    if (result.museState) {
      state = { ...state, ...result.museState };
      log('State loaded');
    }
  } catch (err) {
    log('Error loading state:', err);
  }
}

/**
 * Add message to log
 */
function logMessage(message) {
  state.messageLog.unshift({
    ...message,
    receivedAt: new Date().toISOString()
  });

  // Keep log size manageable
  if (state.messageLog.length > MAX_LOG_SIZE) {
    state.messageLog = state.messageLog.slice(0, MAX_LOG_SIZE);
  }

  saveState();
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Message received:', message.type);

  switch (message.type) {
    case 'content_script_ready':
      state.activeTabId = sender.tab?.id;
      log(`Content script ready on tab ${state.activeTabId}`, message.data);
      sendResponse({ success: true, enabled: state.enabled });
      break;

    case 'new_fan_message':
      // This is the key event - a fan sent a message that needs AI response
      log('NEW FAN MESSAGE!', message.data);
      state.lastMessage = message.data;
      logMessage(message.data);

      // Generate AI response
      generateAIResponse(message.data, sender.tab?.id)
        .then(response => {
          log('AI Response generated:', response);
        })
        .catch(err => {
          log('AI Response error:', err.message);
        });

      sendResponse({ success: true, logged: true, processing: true });

      // Notify popup if open
      notifyPopup('new_message', message.data);
      break;

    case 'get_state':
      sendResponse({
        enabled: state.enabled,
        lastMessage: state.lastMessage,
        messageCount: state.messageLog.length
      });
      break;

    case 'toggle_enabled':
      state.enabled = message.enabled;
      saveState();
      log(`Extension ${state.enabled ? 'enabled' : 'disabled'}`);

      // Notify content script
      if (state.activeTabId) {
        chrome.tabs.sendMessage(state.activeTabId, {
          type: 'toggle_enabled',
          enabled: state.enabled
        }).catch(() => {});
      }

      sendResponse({ enabled: state.enabled });
      break;

    case 'get_message_log':
      sendResponse({ messages: state.messageLog });
      break;

    case 'clear_log':
      state.messageLog = [];
      saveState();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep channel open for async
});

/**
 * Notify popup of events
 */
async function notifyPopup(type, data) {
  try {
    await chrome.runtime.sendMessage({
      type: 'popup_notification',
      notificationType: type,
      data
    });
  } catch (err) {
    // Popup might not be open, that's ok
  }
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener((tab) => {
  // This won't fire if popup is defined, but keeping for reference
  log('Icon clicked on tab:', tab.id);
});

/**
 * Handle tab updates (for SPA navigation)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('onlyfans.com/my/chats')) {
    log('OnlyFans chat page loaded:', tab.url);
    state.activeTabId = tabId;
  }
});

/**
 * Initialize on install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  log(`Extension ${details.reason}:`, details);
  loadState();
});

/**
 * Initialize on startup
 */
chrome.runtime.onStartup.addListener(() => {
  log('Extension started');
  loadState();
});

/**
 * Generate AI response via Backend API (with DB logging)
 * Falls back to direct n8n if backend unavailable
 */
async function generateAIResponse(messageData, tabId) {
  if (!state.enabled) {
    log('Extension disabled, skipping AI response');
    return null;
  }

  try {
    log('Calling Backend API...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    // Try Backend API first
    let response;
    let aiText = '';

    try {
      response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Key': CONFIG.apiKey
        },
        body: JSON.stringify({
          fanMessage: messageData.text,
          fanName: messageData.userName || 'Fan'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        log('Backend API response:', data);
        if (data.success && data.data?.response) {
          aiText = data.data.response;
        }
      }
    } catch (backendErr) {
      log('Backend API failed, trying direct n8n:', backendErr.message);
    }

    // Fallback to direct n8n if backend failed
    if (!aiText) {
      log('Falling back to direct n8n webhook...');
      const n8nResponse = await fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatInput: messageData.text
        })
      });

      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.json();
        log('n8n response:', n8nData);
        aiText = n8nData.output || n8nData.text || n8nData.response || '';
      }
    }

    if (!aiText) {
      throw new Error('No AI response received');
    }

    // Send response to content script to insert into chat
    if (tabId && aiText) {
      chrome.tabs.sendMessage(tabId, {
        type: 'insert_ai_response',
        text: aiText
      }).catch(err => {
        log('Failed to send to content script:', err.message);
      });
    }

    return aiText;

  } catch (err) {
    if (err.name === 'AbortError') {
      log('Request timed out');
      throw new Error('Request timed out');
    }
    log('API error:', err.message);
    throw err;
  }
}

// Load state immediately
loadState();
log('Background service worker initialized');
