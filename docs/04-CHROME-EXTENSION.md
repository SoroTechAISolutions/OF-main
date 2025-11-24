# 04 - CHROME EXTENSION STRATEGY

**Last Updated:** November 24, 2025

## Critical Component

Chrome Extension is THE most critical and risky component of the entire platform. If this doesn't work, the whole project fails.

**Why it's critical:**
- OnlyFans has no official API
- We must scrape/inject via DOM manipulation
- OF may change their UI at any time
- OF may have anti-automation detection
- One wrong move = account ban

---

## Architecture

```
Chrome Extension Structure:

manifest.json           # Extension configuration (Manifest V3)
├── background.js       # Service worker (handles API calls)
├── content-script.js   # Injected into OF pages (DOM access)
├── popup/
│   ├── popup.html      # Extension UI
│   ├── popup.js        # Popup logic
│   └── popup.css       # Popup styling
└── utils/
    ├── scraper.js      # Message scraping logic
    ├── injector.js     # Message sending logic
    ├── api-client.js   # Backend API communication
    └── storage.js      # LocalStorage wrapper
```

---

## Phase 1: Read-Only Scraper (Week 1)

**Goal:** Reliably read messages from OF without getting detected

### Implementation Steps

1. **Inspect OF DOM Structure**
   - Open OF in Chrome DevTools
   - Identify message containers
   - Find unique CSS selectors
   - Document structure

2. **Build Scraper**
   ```javascript
   // Pseudo-code
   const scrapeMessages = () => {
     const messageElements = document.querySelectorAll('.message-container');
     return Array.from(messageElements).map(el => ({
       fanName: el.querySelector('.fan-name').textContent,
       message: el.querySelector('.message-text').textContent,
       timestamp: el.querySelector('.timestamp').textContent,
       isRead: el.classList.contains('read')
     }));
   };
   ```

3. **Watch for New Messages**
   ```javascript
   const observer = new MutationObserver((mutations) => {
     mutations.forEach(mutation => {
       if (mutation.addedNodes.length) {
         // New message detected
         const newMessages = scrapeMessages();
         sendToBackend(newMessages);
       }
     });
   });

   observer.observe(document.body, {
     childList: true,
     subtree: true
   });
   ```

4. **Send to Backend**
   ```javascript
   const sendToBackend = async (messages) => {
     try {
       const response = await fetch('http://localhost:3000/api/messages', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify(messages)
       });

       if (!response.ok) throw new Error('Failed to send');
       console.log('Messages sent to backend');
     } catch (error) {
       console.error('Error:', error);
       // Retry logic here
     }
   };
   ```

**Success Criteria:**
- ✅ Extension detects new messages in real-time
- ✅ Messages are correctly parsed (fan name, text, timestamp)
- ✅ Data is sent to Backend without errors
- ✅ No account warnings/bans after 24h of testing

---

## Phase 2: Message Injection (Week 7-8)

**Goal:** Send messages from Extension back to OF

**THIS IS HIGH RISK** - OF may detect automation here

### Anti-Detection Strategies

1. **Human-Like Typing**
   ```javascript
   const humanType = async (element, text) => {
     element.focus();

     for (let char of text) {
       // Random typing speed (50-150ms per character)
       const delay = 50 + Math.random() * 100;
       await sleep(delay);

       // Simulate keypress events
       element.value += char;
       element.dispatchEvent(new Event('input', { bubbles: true }));
     }
   };
   ```

2. **Random Delays**
   ```javascript
   const randomDelay = (min, max) => {
     return new Promise(resolve => {
       const delay = min + Math.random() * (max - min);
       setTimeout(resolve, delay);
     });
   };

   // Usage
   await humanType(inputElement, message);
   await randomDelay(500, 2000); // Wait before clicking send
   clickSendButton();
   ```

3. **Mouse Movement Simulation**
   ```javascript
   const simulateMouseMove = (element) => {
     const rect = element.getBoundingClientRect();
     const x = rect.left + rect.width / 2;
     const y = rect.top + rect.height / 2;

     element.dispatchEvent(new MouseEvent('mouseover', {
       bubbles: true,
       clientX: x,
       clientY: y
     }));
   };
   ```

4. **Rate Limiting**
   ```javascript
   // Never send more than 1 message per 5 seconds
   let lastSendTime = 0;

   const sendMessage = async (text) => {
     const now = Date.now();
     const timeSinceLastSend = now - lastSendTime;

     if (timeSinceLastSend < 5000) {
       await sleep(5000 - timeSinceLastSend);
     }

     // Send message...
     lastSendTime = Date.now();
   };
   ```

### Implementation

```javascript
const injectMessage = async (messageText) => {
  try {
    // 1. Find input element
    const input = document.querySelector('[data-testid="message-input"]');
    if (!input) throw new Error('Input not found');

    // 2. Type message with human-like delays
    await humanType(input, messageText);

    // 3. Random pause (think time)
    await randomDelay(1000, 3000);

    // 4. Find and click send button
    const sendBtn = document.querySelector('[data-testid="send-button"]');
    if (!sendBtn) throw new Error('Send button not found');

    simulateMouseMove(sendBtn);
    await randomDelay(100, 300);

    sendBtn.click();

    // 5. Confirm delivery
    await sleep(1000);
    return { success: true };

  } catch (error) {
    console.error('Injection failed:', error);
    return { success: false, error: error.message };
  }
};
```

**Success Criteria:**
- ✅ Messages appear on OF exactly as if typed manually
- ✅ No account warnings after 48h of testing
- ✅ Delivery confirmation works
- ✅ Handles errors gracefully (retries)

---

## Fallback: Manual Bridge

If Chrome Extension proves too risky or unreliable:

**Manual Bridge Flow:**
1. Extension scrapes messages → sends to Backend ✅
2. Backend generates AI suggestions ✅
3. Dashboard shows suggestions ✅
4. Operator copies suggestion
5. **Operator manually pastes into OF** ← Manual step
6. Operator clicks send on OF

**Pros:**
- ✅ Zero risk of OF detection/ban
- ✅ Still provides value (AI suggestions, CRM, analytics)
- ✅ Faster than typing from scratch

**Cons:**
- ❌ Not fully automated
- ❌ Slower than one-click send
- ❌ Less impressive demo

**Decision Point:** Week 7
- If injection works reliably → keep it
- If too many issues → pivot to Manual Bridge

---

## Testing Strategy

### Phase 1: Controlled Testing (Week 1-2)
- Test on Allen's **test account** only
- Limit to 10 messages/day
- Monitor for any warnings
- Check OF email for notifications

### Phase 2: Extended Testing (Week 3-4)
- Increase to 50 messages/day
- Test on 2-3 models
- Monitor account health
- Document any issues

### Phase 3: Production Testing (Week 8-9)
- Full operator usage
- Monitor all accounts daily
- Have backup plan ready
- Quick rollback if issues

---

## Risk Mitigation

### Risk 1: OF Changes UI
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Use multiple fallback selectors
- Monitor for DOM structure changes
- Quick update process (update Extension, push to Chrome Store)
- Keep scraper logic modular and easy to update

### Risk 2: Account Bans
**Probability:** Low (if done carefully)
**Impact:** Critical

**Mitigation:**
- Strict rate limiting
- Human-like behavior
- Test on throwaway accounts first
- Have Manual Bridge fallback ready

### Risk 3: Extension Rejected by Chrome Store
**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Publish as "Developer Tool" category
- Clear privacy policy
- No obfuscated code
- Fallback: unpacked extension (loaded manually)

---

## Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "OF Manager",
  "version": "1.0.0",
  "description": "OnlyFans message management tool",

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "https://onlyfans.com/*",
    "http://localhost:3000/*"
  ],

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": ["https://onlyfans.com/*"],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

---

**Status:** Week 1 - Starting with read-only scraper
**Next Review:** November 27, 2025
