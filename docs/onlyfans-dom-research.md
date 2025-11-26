# OnlyFans DOM Structure Research

**Date:** November 26, 2025
**Source:** Live research via VNC + Playwright

## Technology Stack

- **Frontend Framework:** Vue.js (data-v-* attributes)
- **Text Editor:** TipTap (ProseMirror-based)
- **Slider:** Swiper.js
- **CSS:** BEM methodology (b-*, m-*, g-* prefixes)

## Chat Page Structure

### URL Pattern
```
/my/chats/                    - Messages list
/my/chats/chat/{user_id}/     - Individual chat
```

### Main Containers

| Selector | Description |
|----------|-------------|
| `.b-chats` | Main chat container |
| `.b-chats__conversations` | Left panel - chat list |
| `.b-chats__conversations-list` | Chat list wrapper |
| `.b-chats__list-dialogues` | Dialogues container |
| `.b-chats__conversations-content` | Right panel - chat content |

### Chat List (Left Panel)

| Selector | Description |
|----------|-------------|
| `.b-chats__item` | Single chat item |
| `a.b-chats__item__link` | Clickable chat link |
| `.b-available-users__item` | User item in chat list |

### Chat Window (Right Panel)

| Selector | Description |
|----------|-------------|
| `.b-chat__messages` | Messages scroll container |
| `.b-chats__scrollbar.b-chat__messages` | Full selector for messages |
| `.b-chat__messages-wrapper` | Messages wrapper |
| `.b-chat__item-message` | Single message container |
| `.b-chat__message` | Message content wrapper |

### Message Types (CSS Modifiers)

| Class | Meaning |
|-------|---------|
| `.m-has-media` | Message contains media |
| `.m-photo` | Contains photo |
| `.m-text` | Contains text |
| `.m-purchase` | PPV/Paid content |
| `.m-not-paid-yet` | Unpaid PPV content |

### Message Input Area

| Selector | Description |
|----------|-------------|
| `.b-chat__btn-submit` | Send button |
| `.b-text-editor` | TipTap text editor |
| `.js-text-editor` | Text editor (JS hook) |
| `[contenteditable].tiptap.ProseMirror` | Actual input element |

### PPV (Pay-Per-View) Messages

| Selector | Description |
|----------|-------------|
| `.b-post-media-holder` | Media container |
| `.b-chat__message__media` | Media wrapper in message |
| `.switcher-media-content` | Media counter (1/2, etc) |

### User Avatar & Status

| Selector | Description |
|----------|-------------|
| `.g-avatar` | Avatar component |
| `.online` | Online status indicator |
| `.online_status_class` | Status class container |

### Header Elements

| Selector | Description |
|----------|-------------|
| `.b-chats__header` | Chat list header |
| `.b-chat__search-form` | Search in chats |
| `.l-header__menu__item.m-chats` | Messages menu item |

## Key JavaScript Hooks

```javascript
// Input field (TipTap/ProseMirror)
document.querySelector('[contenteditable].tiptap.ProseMirror')

// Send button
document.querySelector('.b-chat__btn-submit')

// All messages
document.querySelectorAll('.b-chat__item-message')

// Chat list items
document.querySelectorAll('a.b-chats__item__link')

// PPV unlock buttons
document.querySelectorAll('[class*=unlock]')
```

## Important Notes

1. **Vue.js Reactivity:** DOM changes happen reactively, need to wait for updates
2. **Virtual Scrolling:** Chat list uses virtual scrolling for performance
3. **CDN Images:** Media served from `cdn2.onlyfans.com` with signed URLs
4. **Timestamps:** Messages have `title` attributes with full datetime

## Extension Integration Points

### For Auto-Reply Feature:
1. Listen for new messages in `.b-chat__messages-wrapper`
2. Get message text from `.b-chat__message__body`
3. Focus on `[contenteditable].tiptap.ProseMirror`
4. Insert text and trigger input event
5. Click `.b-chat__btn-submit`

### For PPV Detection:
1. Check for `.m-purchase.m-not-paid-yet` class
2. Extract price from button text
3. Monitor for unlock events

### For Chat Monitoring:
1. Watch `.b-chats__list-dialogues` for new chats
2. Get unread count from notification badges
3. Extract user info from `.b-available-users__item`
