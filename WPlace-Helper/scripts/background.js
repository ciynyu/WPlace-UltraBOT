console.log("[WPlace-Helper] background.js loaded.");
const BACKEND_URLS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const ALARM_NAME = 'tokenRetryAlarm';
const RETRY_INTERVAL_MINUTES = 0.1; // Thử lại sau 6 giây (0.1 phút)

async function sendTokenToBackend(tokenData) {
  const payload = JSON.stringify(tokenData);
  const headers = { 'Content-Type': 'application/json' };

  for (const baseUrl of BACKEND_URLS) {
    try {
      // Để tránh lỗi CORS chặn phản hồi khi backend chưa sẵn sàng,
      // vẫn sử dụng `no-cors` và không kiểm tra `response.ok` hay `status`.
      // Thành công được giả định nếu không có lỗi mạng.
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
      chrome.alarms.clear(ALARM_NAME); // Dừng alarm nếu queue rỗng
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

    // Xóa các token đã gửi thành công khỏi queue (theo thứ tự ngược lại để tránh sai index)
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

// Bắt đầu hoặc lên lịch alarm khi Service Worker khởi động
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

// Lắng nghe sự kiện alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log("[WPlace-Helper] Alarm triggered, processing token queue.");
    processTokenQueue();
  }
});

// Lắng nghe message từ content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'wplace_token_found' && msg.token) {
    const tokenData = { token: String(msg.token), worldX: msg.worldX || null, worldY: msg.worldY || null, userAgent: navigator.userAgent || null, timestamp: Date.now() };

    chrome.storage.local.get(['wplace_token', 'wplace_world_x', 'wplace_world_y', 'tokenQueue'], async (result) => {
      const currentToken = result.wplace_token;
      const currentWorldX = result.wplace_world_x;
      const currentWorldY = result.wplace_world_y;

      // Chỉ cập nhật storage và queue nếu token mới khác token hiện tại hoặc tọa độ thay đổi
      if (currentToken !== tokenData.token || currentWorldX !== String(tokenData.worldX) || currentWorldY !== String(tokenData.worldY)) {
        const toStore = { wplace_token: tokenData.token };
        if (tokenData.worldX) toStore.wplace_world_x = String(tokenData.worldX);
        if (tokenData.worldY) toStore.wplace_world_y = String(tokenData.worldY);
        
        chrome.storage.local.set(toStore, () => {
          sendResponse({ ok: true });
        });

        // Thêm token vào queue
        let tokenQueue = result.tokenQueue || [];
        tokenQueue.push(tokenData);
        chrome.storage.local.set({ tokenQueue }, () => {
          console.log("[WPlace-Helper] Token added to queue. Scheduling retry alarm.");
          scheduleTokenRetryAlarm(); // Đảm bảo alarm được lên lịch
        });
      } else {
        console.log("[WPlace-Helper] Received same token, not updating storage or queue.");
        sendResponse({ ok: true });
      }
    });
    return true;
  } else if (msg && msg.type === 'wplace_content_script_loaded') {
    // Khi content script được tải, chủ động kiểm tra queue
    console.log("[WPlace-Helper] Content script loaded message received. Processing token queue.");
    processTokenQueue();
  }
});

// Khi Service Worker được kích hoạt (ví dụ: khi browser khởi động hoặc extension được cài đặt/cập nhật)
chrome.runtime.onInstalled.addListener(() => {
  console.log("[WPlace-Helper] Service Worker installed or updated. Scheduling initial token retry alarm.");
  scheduleTokenRetryAlarm();
  processTokenQueue(); // Xử lý queue ngay lập tức khi cài đặt/cập nhật
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[WPlace-Helper] Browser started. Scheduling token retry alarm.");
  scheduleTokenRetryAlarm();
  processTokenQueue(); // Xử lý queue ngay lập tức khi browser khởi động
});

// Xử lý queue ngay khi script được tải để bắt kịp mọi token còn sót lại
processTokenQueue();
