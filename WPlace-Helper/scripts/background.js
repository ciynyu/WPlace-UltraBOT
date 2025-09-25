console.log("[WPlace-Helper] background.js loaded.");
const BACKEND_URLS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const ALARM_NAME = 'tokenRetryAlarm';
const CF_CLEARANCE_ALARM_NAME = 'cfClearanceRetryAlarm'; // Alarm for cf_clearance queue
const RETRY_INTERVAL_MINUTES = 0.01; // Retry after 0.6 seconds (0.01 minutes) for token queue
const CF_RETRY_INTERVAL_MINUTES = 0.5; // Retry cf_clearance every 30 seconds

async function sendTokenToBackend(tokenData) {
  const payload = JSON.stringify(tokenData);
  const headers = { 'Content-Type': 'application/json' };

  for (const baseUrl of BACKEND_URLS) {
    try {
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
      console.log("[WPlace-Helper] Token queue empty. Clearing token retry alarm.");
      chrome.alarms.clear(ALARM_NAME); // Stop token retry alarm if queue is empty
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

// Start or schedule token retry alarm
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

// New: Start or schedule cf_clearance retry alarm
function scheduleCfClearanceRetryAlarm() {
  chrome.alarms.get(CF_CLEARANCE_ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(CF_CLEARANCE_ALARM_NAME, { periodInMinutes: CF_RETRY_INTERVAL_MINUTES });
      console.log(`[WPlace-Helper] Cf_clearance retry alarm scheduled for every ${CF_RETRY_INTERVAL_MINUTES} minutes.`);
    } else {
      console.log("[WPlace-Helper] Cf_clearance retry alarm already scheduled.");
    }
  });
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log("[WPlace-Helper] Token alarm triggered, processing token queue.");
    processTokenQueue();
  } else if (alarm.name === CF_CLEARANCE_ALARM_NAME) {
    console.log("[WPlace-Helper] Cf_clearance alarm triggered, processing cf_clearance queue.");
    processCfClearanceQueue();
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'wplace_token_found' && msg.token) { // Removed check for msg.token because cfClearance might be the primary data
    const tokenData = {
      token: String(msg.token || '') || null, // Ensure token is string or null
      xpaw: msg.xpaw || null,
      fp: msg.xpaw || null,
      worldX: msg.worldX || null,
      worldY: msg.worldY || null,
      cfClearance: msg.cfClearance || null, // Add cfClearance
      userAgent: navigator.userAgent || null,
      timestamp: Date.now()
    };

    chrome.storage.local.get(['wplace_token', 'wplace_xpaw_token', 'wplace_world_x', 'wplace_world_y', 'wplace_cf_clearance', 'tokenQueue'], async (result) => {
      const currentToken = result.wplace_token;
      const currentxpaw = result.wplace_xpaw_token;
      const currentWorldX = result.wplace_world_x;
      const currentWorldY = result.wplace_world_y;
      const currentCfClearance = result.wplace_cf_clearance; // Get current cfClearance from storage

      // Only update storage and queue if the new token/cfClearance is different or coordinates changetokenData
      if (currentToken !== tokenData.token || currentxpaw !== tokenData.xpaw || currentWorldX !== String(tokenData.worldX) || currentWorldY !== String(tokenData.worldY) || currentCfClearance !== tokenData.cfClearance ) {
        const toStore = {};
        if (tokenData.token) toStore.wplace_token = tokenData.token;
        if (tokenData.xpaw) toStore.wplace_xpaw_token = msg.xpaw;
        if (tokenData.worldX) toStore.wplace_world_x = String(tokenData.worldX);
        if (tokenData.worldY) toStore.wplace_world_y = String(tokenData.worldY);
        if (tokenData.cfClearance) toStore.wplace_cf_clearance = tokenData.cfClearance; // Store cfClearance

        chrome.storage.local.set(toStore, () => {
          sendResponse({ ok: true });
        });

        // Add tokenData to queue
        let tokenQueue = result.tokenQueue || [];
        tokenQueue.push(tokenData);
        const sent = await sendTokenToBackend(tokenData);
        if (sent) {
          console.log("[WPlace-Helper] Token sent immediately.");
        } else {
          let tokenQueue = result.tokenQueue || [];
          tokenQueue.push(tokenData);
          chrome.storage.local.set({ tokenQueue }, () => {
            console.log("[WPlace-Helper] Token added to queue due to immediate send failure. Scheduling retry alarm.");
            scheduleTokenRetryAlarm(); // Ensure alarm is scheduled
          });
        }
      } else {
        console.log("[WPlace-Helper] Received same token/cfClearance, not updating storage or queue.");
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
  console.log("[WPlace-Helper] Service Worker installed or updated. Scheduling initial alarms.");
  scheduleTokenRetryAlarm();
  scheduleCfClearanceRetryAlarm(); // Schedule new alarm
  processTokenQueue();
  processCfClearanceQueue(); // Process new queue immediately
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[WPlace-Helper] Browser started. Scheduling alarms.");
  scheduleTokenRetryAlarm();
  scheduleCfClearanceRetryAlarm(); // Schedule new alarm
  processTokenQueue();
  processCfClearanceQueue(); // Process new queue immediately
});

// New: Process cf_clearance queue (separate from token queue)
async function processCfClearanceQueue() {
  chrome.storage.local.get(['cfClearanceQueue'], async (result) => {
    let cfClearanceQueue = result.cfClearanceQueue || [];
    if (cfClearanceQueue.length === 0) {
      console.log("[WPlace-Helper] Cf_clearance queue empty. Clearing cf_clearance retry alarm.");
      chrome.alarms.clear(CF_CLEARANCE_ALARM_NAME); // Stop alarm if queue is empty
      return;
    }

    console.log(`[WPlace-Helper] Processing cf_clearance queue (${cfClearanceQueue.length} items)...`);
    const sentSuccessfully = [];
    for (let i = 0; i < cfClearanceQueue.length; i++) {
      const cf = cfClearanceQueue[i];
      // Here, we send only cf_clearance to the backend /api/token endpoint
      // We need to fetch the current jToken from wplace.live cookies to associate it
      let jToken = null;
      try {
        const jCookie = await new Promise(resolve => {
          chrome.cookies.getAll({ domain: 'wplace.live', name: 'j' }, function(cks) {
            resolve(cks && cks[0] ? cks[0].value : null);
          });
        });
        if (jCookie) jToken = jCookie;
      } catch (e) {
        console.warn("[WPlace-Helper] Failed to get j cookie for cf_clearance:", e);
      }
      
      const tokenData = {
        token: jToken, // Associate with current jToken if available
        cfClearance: cf,
        userAgent: navigator.userAgent // Use navigator.userAgent of background script
      };
      const sent = await sendTokenToBackend(tokenData);
      if (sent) {
        sentSuccessfully.push(i);
      }
    }

    // Remove successfully sent cf_clearances from the queue (in reverse order)
    for (let i = sentSuccessfully.length - 1; i >= 0; i--) {
      cfClearanceQueue.splice(sentSuccessfully[i], 1);
    }

    chrome.storage.local.set({ cfClearanceQueue }, () => {
      console.log(`[WPlace-Helper] Cf_clearance queue updated. Remaining: ${cfClearanceQueue.length}`);
      if (cfClearanceQueue.length === 0) {
        chrome.alarms.clear(CF_CLEARANCE_ALARM_NAME);
      }
    });
  });
}

// Process queues immediately when script is loaded to catch any remaining items
processTokenQueue();
processCfClearanceQueue();
