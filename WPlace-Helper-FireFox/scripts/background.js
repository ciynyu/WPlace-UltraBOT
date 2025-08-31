console.log("[WPlace-Helper] background.js loaded.");
const BACKEND_URLS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const ALARM_NAME = 'tokenRetryAlarm';
const RETRY_INTERVAL_MINUTES = 0.1; // Retry after 6 seconds (0.1 minutes)

async function sendTokenToBackend(tokenData) {
  const payload = JSON.stringify(tokenData);
  const headers = { 'Content-Type': 'application/json' };

  for (const baseUrl of BACKEND_URLS) {
    try {
      // To avoid CORS errors blocking responses when the backend is not ready,
      // still use `no-cors` and do not check `response.ok` or `status`.
      // Success is assumed if there are no network errors.
      const response = await fetch(`${baseUrl}/api/token`, {
        method: 'POST',
        headers,
        body: payload,
        mode: 'no-cors',
      });
      console.log(`[WPlace-Helper] Successfully attempted to send token to ${baseUrl}`);
      return true;
    } catch (e) {
      console.warn(`[WPlace-Helper] Failed to send token to ${baseUrl}:`, e);
    }
  }
  return false;
}

async function processTokenQueue() {
  chrome.storage.local.get(['tokenQueue'], async (result) => {
    let tokenQueue = result.tokenQueue || [];
    if (tokenQueue.length === 0) {
      console.log("[WPlace-Helper] Token queue empty. Clearing alarm.");
      chrome.alarms.clear(ALARM_NAME); // Stop alarm if queue is empty
      return;
    }

    console.log(`[WPlace-Helper] Processing token queue (${tokenQueue.length} items)...`);
    const sentSuccessfully = [];
    for (let i = 0; i < tokenQueue.length; i++) {
      const tokenData = tokenQueue[i];
      const sent = await sendTokenToBackend(tokenData);
      if (sent) {
        sentSuccessfully.push(i);
      }
    }

    // Remove successfully sent tokens from the queue (in reverse order to avoid index errors)
    for (let i = sentSuccessfully.length - 1; i >= 0; i--) {
      tokenQueue.splice(sentSuccessfully[i], 1);
    }

    chrome.storage.local.set({ tokenQueue }, () => {
      console.log(`[WPlace-Helper] Token queue updated. Remaining: ${tokenQueue.length}`);
      if (tokenQueue.length === 0) {
        chrome.alarms.clear(ALARM_NAME);
      }
    });
  });
}

// Start or schedule alarm when Service Worker starts
function scheduleTokenRetryAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: RETRY_INTERVAL_MINUTES });
      console.log(`[WPlace-Helper] Token retry alarm scheduled for every ${RETRY_INTERVAL_MINUTES} minutes.`);
    } else {
      console.log("[WPlace-Helper] Token retry alarm already scheduled.");
    }
  });
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log("[WPlace-Helper] Alarm triggered, processing token queue.");
    processTokenQueue();
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'wplace_token_found' && msg.token) {
    const tokenData = { token: String(msg.token), worldX: msg.worldX || null, worldY: msg.worldY || null, userAgent: navigator.userAgent || null, timestamp: Date.now() };

    chrome.storage.local.get(['wplace_token', 'wplace_world_x', 'wplace_world_y', 'tokenQueue'], async (result) => {
      const currentToken = result.wplace_token;
      const currentWorldX = result.wplace_world_x;
      const currentWorldY = result.wplace_world_y;

      // Only update storage and queue if the new token is different from the current token or coordinates change
      if (currentToken !== tokenData.token || currentWorldX !== String(tokenData.worldX) || currentWorldY !== String(tokenData.worldY)) {
        const toStore = { wplace_token: tokenData.token };
        if (tokenData.worldX) toStore.wplace_world_x = String(tokenData.worldX);
        if (tokenData.worldY) toStore.wplace_world_y = String(tokenData.worldY);
        
        chrome.storage.local.set(toStore, () => {
          sendResponse({ ok: true });
        });

        // Add token to queue
        let tokenQueue = result.tokenQueue || [];
        tokenQueue.push(tokenData);
        chrome.storage.local.set({ tokenQueue }, () => {
          console.log("[WPlace-Helper] Token added to queue. Scheduling retry alarm.");
          scheduleTokenRetryAlarm(); // Ensure alarm is scheduled
        });
      } else {
        console.log("[WPlace-Helper] Received same token, not updating storage or queue.");
        sendResponse({ ok: true });
      }
    });
    return true;
  } else if (msg && msg.type === 'wplace_content_script_loaded') {
    // When content script is loaded, proactively check the queue
    console.log("[WPlace-Helper] Content script loaded message received. Processing token queue.");
    processTokenQueue();
  }
});

// When Service Worker is activated (e.g., when browser starts or extension is installed/updated)
chrome.runtime.onInstalled.addListener(() => {
  console.log("[WPlace-Helper] Service Worker installed or updated. Scheduling initial token retry alarm.");
  scheduleTokenRetryAlarm();
  processTokenQueue(); // Process queue immediately on install/update
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[WPlace-Helper] Browser started. Scheduling token retry alarm.");
  scheduleTokenRetryAlarm();
  processTokenQueue(); // Process queue immediately on browser startup
});

// Process queue immediately when script is loaded to catch any remaining tokens
processTokenQueue();
