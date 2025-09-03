console.log("[WPlace-Helper-Firefox] background.js loaded.");
const BACKEND_URLS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const ALARM_NAME = 'tokenRetryAlarm';
const CF_CLEARANCE_ALARM_NAME = 'cfClearanceRetryAlarm'; // Alarm for cf_clearance queue
const RETRY_INTERVAL_MINUTES = 0.05; // Retry after 3 seconds (0.05 minutes) for token queue
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
      console.log(`[WPlace-Helper-Firefox] Successfully attempted to send token to ${baseUrl}`);
      return true;
    } catch (e) {
      console.warn(`[WPlace-Helper-Firefox] Failed to send token to ${baseUrl}:`, e);
    }
  }
  return false;
}

async function processTokenQueue() {
  browser.storage.local.get(['tokenQueue'], async (result) => {
    let tokenQueue = result.tokenQueue || [];
    if (tokenQueue.length === 0) {
      console.log("[WPlace-Helper-Firefox] Token queue empty. Clearing token retry alarm.");
      browser.alarms.clear(ALARM_NAME); // Stop token retry alarm if queue is empty
      return;
    }

    console.log(`[WPlace-Helper-Firefox] Processing token queue (${tokenQueue.length} items)...`);
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

    browser.storage.local.set({ tokenQueue }, () => {
      console.log(`[WPlace-Helper-Firefox] Token queue updated. Remaining: ${tokenQueue.length}`);
      if (tokenQueue.length === 0) {
        browser.alarms.clear(ALARM_NAME);
      }
    });
  });
}

// Start or schedule token retry alarm
function scheduleTokenRetryAlarm() {
  browser.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      browser.alarms.create(ALARM_NAME, { periodInMinutes: RETRY_INTERVAL_MINUTES });
      console.log(`[WPlace-Helper-Firefox] Token retry alarm scheduled for every ${RETRY_INTERVAL_MINUTES} minutes.`);
    } else {
      console.log("[WPlace-Helper-Firefox] Token retry alarm already scheduled.");
    }
  });
}

// New: Start or schedule cf_clearance retry alarm
function scheduleCfClearanceRetryAlarm() {
  browser.alarms.get(CF_CLEARANCE_ALARM_NAME, (alarm) => {
    if (!alarm) {
      browser.alarms.create(CF_CLEARANCE_ALARM_NAME, { periodInMinutes: CF_RETRY_INTERVAL_MINUTES });
      console.log(`[WPlace-Helper-Firefox] Cf_clearance retry alarm scheduled for every ${CF_RETRY_INTERVAL_MINUTES} minutes.`);
    } else {
      console.log("[WPlace-Helper-Firefox] Cf_clearance retry alarm already scheduled.");
    }
  });
}

// Listen for alarm events
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log("[WPlace-Helper-Firefox] Token alarm triggered, processing token queue.");
    processTokenQueue();
  } else if (alarm.name === CF_CLEARANCE_ALARM_NAME) {
    console.log("[WPlace-Helper-Firefox] Cf_clearance alarm triggered, processing cf_clearance queue.");
    processCfClearanceQueue();
  }
});

// Listen for messages from content script
browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'wplace_token_found') { // Removed check for msg.token because cfClearance might be the primary data
    const tokenData = {
      token: String(msg.token || '') || null, // Ensure token is string or null
      worldX: msg.worldX || null,
      worldY: msg.worldY || null,
      cfClearance: msg.cfClearance || null, // Add cfClearance
      userAgent: navigator.userAgent || null,
      timestamp: Date.now()
    };

    browser.storage.local.get(['wplace_token', 'wplace_world_x', 'wplace_world_y', 'wplace_cf_clearance', 'tokenQueue'], async (result) => {
      const currentToken = result.wplace_token;
      const currentWorldX = result.wplace_world_x;
      const currentWorldY = result.wplace_world_y;
      const currentCfClearance = result.wplace_cf_clearance; // Get current cfClearance from storage
      let tokenQueue = result.tokenQueue || [];

      // If the queue is empty, try to send immediately
      if (tokenQueue.length === 0) {
        console.log("[WPlace-Helper-Firefox] Token queue is empty. Attempting to send token immediately.");
        const sentImmediately = await sendTokenToBackend(tokenData);
        if (sentImmediately) {
          console.log("[WPlace-Helper-Firefox] Token sent immediately and successfully.");
          // Only update storage if the token is new or coordinates changed
          if (currentToken !== tokenData.token || currentWorldX !== String(tokenData.worldX) || currentWorldY !== String(tokenData.worldY) || currentCfClearance !== tokenData.cfClearance) {
            const toStore = {};
            if (tokenData.token) toStore.wplace_token = tokenData.token;
            if (tokenData.worldX) toStore.wplace_world_x = String(tokenData.worldX);
            if (tokenData.worldY) toStore.wplace_world_y = String(tokenData.worldY);
            if (tokenData.cfClearance) toStore.wplace_cf_clearance = tokenData.cfClearance;
            browser.storage.local.set(toStore);
          }
          sendResponse({ ok: true });
          return; // Exit as token was sent
        } else {
          console.log("[WPlace-Helper-Firefox] Immediate token send failed. Adding to queue.");
        }
      }

      // If not sent immediately, or if queue was not empty, proceed with queue logic
      if (currentToken !== tokenData.token || currentWorldX !== String(tokenData.worldX) || currentWorldY !== String(tokenData.worldY) || currentCfClearance !== tokenData.cfClearance) {
        const toStore = {};
        if (tokenData.token) toStore.wplace_token = tokenData.token;
        if (tokenData.worldX) toStore.wplace_world_x = String(tokenData.worldX);
        if (tokenData.worldY) toStore.wplace_world_y = String(tokenData.worldY);
        if (tokenData.cfClearance) toStore.wplace_cf_clearance = tokenData.cfClearance;

        browser.storage.local.set(toStore, () => {
          sendResponse({ ok: true });
        });

        // Add tokenData to queue
        tokenQueue.push(tokenData);
        browser.storage.local.set({ tokenQueue }, () => {
          console.log("[WPlace-Helper-Firefox] Token added to queue. Scheduling retry alarm.");
          scheduleTokenRetryAlarm(); // Ensure alarm is scheduled
        });
      } else {
        console.log("[WPlace-Helper-Firefox] Received same token/cfClearance, not updating storage or queue.");
        sendResponse({ ok: true });
      }
    });
    return true;
  } else if (msg && msg.type === 'wplace_content_script_loaded') {
    // When content script is loaded, proactively check the queue
    console.log("[WPlace-Helper-Firefox] Content script loaded message received. Processing token queue.");
    processTokenQueue();
  }
});

// When Service Worker is activated (e.g., when browser starts or extension is installed/updated)
browser.runtime.onInstalled.addListener(() => {
  console.log("[WPlace-Helper-Firefox] Service Worker installed or updated. Scheduling initial alarms.");
  scheduleTokenRetryAlarm();
  scheduleCfClearanceRetryAlarm(); // Schedule new alarm
  processTokenQueue();
  processCfClearanceQueue(); // Process new queue immediately
});

browser.runtime.onStartup.addListener(() => {
  console.log("[WPlace-Helper-Firefox] Browser started. Scheduling alarms.");
  scheduleTokenRetryAlarm();
  scheduleCfClearanceRetryAlarm(); // Schedule new alarm
  processTokenQueue();
  processCfClearanceQueue(); // Process new queue immediately
});

// New: Process cf_clearance queue (separate from token queue)
async function processCfClearanceQueue() {
  browser.storage.local.get(['cfClearanceQueue'], async (result) => {
    let cfClearanceQueue = result.cfClearanceQueue || [];
    if (cfClearanceQueue.length === 0) {
      console.log("[WPlace-Helper-Firefox] Cf_clearance queue empty. Clearing cf_clearance retry alarm.");
      browser.alarms.clear(CF_CLEARANCE_ALARM_NAME); // Stop alarm if queue is empty
      return;
    }

    console.log(`[WPlace-Helper-Firefox] Processing cf_clearance queue (${cfClearanceQueue.length} items)...`);
    const sentSuccessfully = [];
    for (let i = 0; i < cfClearanceQueue.length; i++) {
      const cf = cfClearanceQueue[i];
      // Here, we send only cf_clearance to the backend /api/token endpoint
      // We need to fetch the current jToken from wplace.live cookies to associate it
      let jToken = null;
      try {
        const jCookie = await browser.cookies.getAll({ domain: 'wplace.live', name: 'j' });
        if (jCookie && jCookie[0]) jToken = jCookie[0].value;
      } catch (e) {
        console.warn("[WPlace-Helper-Firefox] Failed to get j cookie for cf_clearance:", e);
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

    browser.storage.local.set({ cfClearanceQueue }, () => {
      console.log(`[WPlace-Helper-Firefox] Cf_clearance queue updated. Remaining: ${cfClearanceQueue.length}`);
      if (cfClearanceQueue.length === 0) {
        browser.alarms.clear(CF_CLEARANCE_ALARM_NAME);
      }
    });
  });
}

// Process queues immediately when script is loaded to catch any remaining items
processTokenQueue();
processCfClearanceQueue();
