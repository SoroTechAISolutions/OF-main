/**
 * Muse AI Chat Assistant - Content Script
 * Reads messages from OnlyFans chat page
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // DOM Selectors (from OF DOM research + GitHub projects analysis)
    // See: /root/OF/docs/onlyfans-dom-research.md
    // See: /root/OF/research/GITHUB-PROJECTS-ANALYSIS.md
    selectors: {
      // Main containers
      messagesContainer: '.b-chat__messages-wrapper',
      messagesScrollContainer: '.b-chat__messages',

      // Individual message elements
      // .b-chat__item-message = single message container
      // .b-chat__message = message content wrapper inside item
      messageItem: '.b-chat__item-message',
      messageWrapper: '.b-chat__message',

      // Direction detection (m-from-me class on .b-chat__message)
      outgoingMessage: '.b-chat__message.m-from-me',
      incomingMessage: '.b-chat__message:not(.m-from-me)',

      // Message content
      messageBody: '.b-chat__message__body',

      // Input area (TipTap/ProseMirror editor)
      inputField: '[contenteditable].tiptap.ProseMirror',
      textEditor: '.b-text-editor',
      sendButton: '.b-chat__btn-submit',

      // Chat list (left panel)
      chatList: '.b-chats__list-dialogues',
      chatItem: 'a.b-chats__item__link',

      // User info - with fallbacks (from PatchFlick analysis)
      userNameSelectors: [
        '.b-chat__header .g-user-name',
        '.b-chat-header__name',
        'h1.g-page-title span.g-user-name',
        '.g-user-name',
        '.chat-header .username',
        '[data-username]',
        '.user-info .name'
      ],
      userAvatar: '.g-avatar',
      onlineStatus: '.online',

      // Media types (confirmed by PatchFlick)
      hasMedia: '.m-has-media',
      photoMessage: '.m-photo',
      videoMessage: '.m-video',
      audioMessage: '.m-audio',
      gifMessage: '.post_gif',

      // PPV content
      ppvMessage: '.m-purchase',
      unpaidPPV: '.m-not-paid-yet',

      // Carousel/slider
      swiperContainer: '.swiper-container',

      // Post elements (for future use)
      postContainer: '.b-post',
      postDate: '.b-post__date'
    },
    // Polling interval for new messages (ms)
    pollInterval: 2000,
    // Extension enabled state
    enabled: true
  };

  // State
  let lastMessageCount = 0;
  let observerActive = false;
  let pollTimer = null;

  /**
   * Log with prefix for easy filtering
   */
  function log(message, data = null) {
    const prefix = '[Muse AI]';
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Extract text content from a message element
   * Message structure: .b-chat__item-message > .b-chat__message > .b-chat__message__body
   */
  function getMessageText(messageEl) {
    // First try to get .b-chat__message__body within this message
    const bodyEl = messageEl.querySelector(CONFIG.selectors.messageBody);
    if (bodyEl) {
      return bodyEl.textContent.trim();
    }

    // Fallback: get text from message wrapper
    const wrapperEl = messageEl.querySelector(CONFIG.selectors.messageWrapper);
    if (wrapperEl) {
      return wrapperEl.textContent.trim();
    }

    return '';
  }

  /**
   * Check if message is from the creator (outgoing)
   * The m-from-me class is on .b-chat__message element (wrapper), not on .b-chat__item-message (container)
   */
  function isOutgoingMessage(messageEl) {
    // If messageEl is the item-message container, look inside for the wrapper
    const wrapper = messageEl.querySelector(CONFIG.selectors.messageWrapper) || messageEl;
    return wrapper.classList.contains('m-from-me');
  }

  /**
   * Get message timestamp from title attribute
   */
  function getMessageTimestamp(messageEl) {
    const timeEl = messageEl.querySelector('[title]');
    return timeEl ? timeEl.getAttribute('title') : null;
  }

  /**
   * Parse a single message element into structured data
   */
  function parseMessage(messageEl, index) {
    const isOutgoing = isOutgoingMessage(messageEl);
    const text = getMessageText(messageEl);
    const timestamp = getMessageTimestamp(messageEl);

    // Check for media/PPV classes - these might be on item-message or message wrapper
    const wrapper = messageEl.querySelector(CONFIG.selectors.messageWrapper) || messageEl;
    const hasMedia = messageEl.classList.contains('m-has-media') ||
                     wrapper.classList.contains('m-has-media') ||
                     messageEl.querySelector(CONFIG.selectors.hasMedia) !== null;

    const isPPV = messageEl.classList.contains('m-purchase') ||
                  wrapper.classList.contains('m-purchase') ||
                  messageEl.querySelector(CONFIG.selectors.ppvMessage) !== null;

    const isUnpaid = messageEl.querySelector(CONFIG.selectors.unpaidPPV) !== null;

    return {
      index,
      type: isOutgoing ? 'outgoing' : 'incoming',
      direction: isOutgoing ? 'creator_to_fan' : 'fan_to_creator',
      text,
      timestamp,
      hasMedia,
      isPPV,
      isUnpaidPPV: isPPV && isUnpaid,
      element: messageEl
    };
  }

  /**
   * Get all messages from current chat
   */
  function getAllMessages() {
    const container = document.querySelector(CONFIG.selectors.messagesContainer);
    if (!container) {
      log('Messages container not found');
      return [];
    }

    const messageEls = container.querySelectorAll(CONFIG.selectors.messageItem);
    const messages = Array.from(messageEls).map((el, i) => parseMessage(el, i));

    return messages;
  }

  /**
   * Get only incoming messages (from fans - need AI response)
   */
  function getIncomingMessages() {
    const container = document.querySelector(CONFIG.selectors.messagesContainer);
    if (!container) return [];

    const incomingEls = container.querySelectorAll(CONFIG.selectors.incomingMessage);
    return Array.from(incomingEls).map((el, i) => parseMessage(el, i));
  }

  /**
   * Get the last incoming message (most recent fan message)
   */
  function getLastIncomingMessage() {
    const incoming = getIncomingMessages();
    return incoming.length > 0 ? incoming[incoming.length - 1] : null;
  }

  /**
   * Get current chat partner name using fallback selectors
   * Pattern from PatchFlick/onlyfans-downloader-extension
   */
  function getChatPartnerName() {
    // Try each selector in order until one works
    for (const selector of CONFIG.selectors.userNameSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return 'Unknown';
  }

  /**
   * Extract chat/user ID from URL
   * Pattern: /my/chats/chat/{userId}
   * Source: jfrazier-eth/of
   */
  function extractChatUserId() {
    const pattern = /my\/chats\/chat\/(\d+)/;
    const match = window.location.href.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Set value on React-controlled input elements
   * Required for TipTap/ProseMirror editor used by OF
   * Source: jfrazier-eth/of
   */
  function setNativeValue(element, value) {
    const { set: valueSetter } = Object.getOwnPropertyDescriptor(element, "value") || {};
    const prototype = Object.getPrototypeOf(element);
    const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, "value") || {};

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      throw new Error("The given element does not have a value setter");
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /**
   * Insert text into the chat input field
   * Handles TipTap/ProseMirror contenteditable
   */
  function insertTextIntoInput(text) {
    const inputField = document.querySelector(CONFIG.selectors.inputField);
    if (!inputField) {
      log('Input field not found');
      return false;
    }

    // For contenteditable (TipTap)
    if (inputField.getAttribute('contenteditable') === 'true') {
      inputField.innerHTML = `<p>${text}</p>`;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // For regular input/textarea
    try {
      setNativeValue(inputField, text);
      return true;
    } catch (e) {
      log('Failed to set input value:', e.message);
      return false;
    }
  }

  /**
   * Check for new messages and report them
   */
  function checkForNewMessages() {
    if (!CONFIG.enabled) return;

    const messages = getAllMessages();
    const currentCount = messages.length;

    if (currentCount > lastMessageCount) {
      const newMessages = messages.slice(lastMessageCount);
      log(`New messages detected: ${newMessages.length}`);

      newMessages.forEach(msg => {
        if (msg.type === 'incoming') {
          log('NEW FAN MESSAGE (needs AI response):', {
            text: msg.text,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia
          });

          // Send to background script
          sendToBackground('new_fan_message', {
            text: msg.text,
            timestamp: msg.timestamp,
            chatPartner: getChatPartnerName(),
            chatUserId: extractChatUserId(),
            hasMedia: msg.hasMedia,
            isPPV: msg.isPPV
          });
        } else {
          log('New outgoing message:', msg.text.substring(0, 50) + '...');
        }
      });

      lastMessageCount = currentCount;
    }
  }

  /**
   * Send message to background script
   */
  function sendToBackground(type, data) {
    chrome.runtime.sendMessage({
      type,
      data,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }).catch(err => {
      // Background might not be ready, that's ok
      log('Could not send to background:', err.message);
    });
  }

  /**
   * Set up MutationObserver for real-time message detection
   */
  function setupObserver() {
    const container = document.querySelector(CONFIG.selectors.messagesContainer);
    if (!container) {
      log('Cannot setup observer - container not found');
      return false;
    }

    if (observerActive) {
      log('Observer already active');
      return true;
    }

    const observer = new MutationObserver((mutations) => {
      let hasNewMessages = false;

      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          hasNewMessages = true;
        }
      });

      if (hasNewMessages) {
        // Small delay to let DOM settle
        setTimeout(checkForNewMessages, 100);
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    observerActive = true;
    log('MutationObserver active');
    return true;
  }

  /**
   * Start polling for messages (fallback if observer fails)
   */
  function startPolling() {
    if (pollTimer) return;

    pollTimer = setInterval(() => {
      if (CONFIG.enabled) {
        checkForNewMessages();
      }
    }, CONFIG.pollInterval);

    log(`Polling started (${CONFIG.pollInterval}ms interval)`);
  }

  /**
   * Stop polling
   */
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      log('Polling stopped');
    }
  }

  /**
   * Initialize the content script
   */
  function init() {
    log('Initializing on ' + window.location.href);

    // Check if we're on a chat page
    if (!window.location.href.includes('/my/chats/')) {
      log('Not on chat page, waiting...');
      return;
    }

    // Wait for chat to load
    const waitForChat = setInterval(() => {
      const container = document.querySelector(CONFIG.selectors.messagesContainer);
      if (container) {
        clearInterval(waitForChat);

        // Initial message scan
        const messages = getAllMessages();
        lastMessageCount = messages.length;
        log(`Found ${messages.length} existing messages`);

        // Log summary
        const incoming = messages.filter(m => m.type === 'incoming');
        const outgoing = messages.filter(m => m.type === 'outgoing');
        log(`Messages breakdown: ${incoming.length} from fan, ${outgoing.length} from creator`);

        // Setup real-time detection
        if (!setupObserver()) {
          log('Observer failed, using polling fallback');
          startPolling();
        }

        // Send ready message to background
        sendToBackground('content_script_ready', {
          chatPartner: getChatPartnerName(),
          messageCount: messages.length
        });

        log('Ready! Monitoring for new messages...');
      }
    }, 500);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(waitForChat);
    }, 30000);
  }

  /**
   * Listen for messages from popup/background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received message:', message);

    switch (message.type) {
      case 'get_status':
        sendResponse({
          enabled: CONFIG.enabled,
          messageCount: lastMessageCount,
          chatPartner: getChatPartnerName(),
          url: window.location.href
        });
        break;

      case 'toggle_enabled':
        CONFIG.enabled = message.enabled;
        log(`Extension ${CONFIG.enabled ? 'enabled' : 'disabled'}`);
        sendResponse({ enabled: CONFIG.enabled });
        break;

      case 'get_messages':
        const messages = getAllMessages();
        sendResponse({ messages: messages.map(m => ({...m, element: undefined})) });
        break;

      case 'get_last_incoming':
        const lastMsg = getLastIncomingMessage();
        sendResponse({ message: lastMsg ? {...lastMsg, element: undefined} : null });
        break;

      case 'insert_text':
        // Insert AI-generated response into input field
        const success = insertTextIntoInput(message.text);
        sendResponse({ success, text: message.text });
        break;

      case 'insert_ai_response':
        // Insert AI response from background script
        log('Inserting AI response:', message.text.substring(0, 50) + '...');
        const inserted = insertTextIntoInput(message.text);
        if (inserted) {
          log('AI response inserted successfully');
        } else {
          log('Failed to insert AI response');
        }
        sendResponse({ success: inserted });
        break;

      case 'get_chat_info':
        // Get current chat context
        sendResponse({
          chatUserId: extractChatUserId(),
          chatPartner: getChatPartnerName(),
          messageCount: lastMessageCount,
          url: window.location.href
        });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }

    return true; // Keep channel open for async response
  });

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init on SPA navigation (Vue.js router)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      log('URL changed, re-initializing...');
      lastMessageCount = 0;
      observerActive = false;
      stopPolling();
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
