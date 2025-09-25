 
console.log("[WPlace-Helper] content.js loaded.");

(function injectPageHook() {
	try {
		const s = document.createElement('script');
		s.src = chrome.runtime.getURL('scripts/pageHook.js');
		s.async = false;
		(document.documentElement || document.head).appendChild(s);
		// Send initial toggle states to pageHook.js immediately after injection
		chrome.storage.local.get(['wplace_enabled', 'wplace_mock_paint_enabled'], function(result) {
			window.postMessage({ __wplace: true, type: 'toggle', enabled: !!result.wplace_enabled }, '*');
			window.postMessage({ __wplace: true, type: 'toggle_mock_paint', enabled: !!result.wplace_mock_paint_enabled }, '*');
		});
	} catch (e) { console.error("[WPlace-Helper] Failed to inject pageHook.js:", e); }
})();

window.addEventListener('message', function(ev) {
	if (!ev || !ev.data) return;
	const msg = ev.data;
	if (msg && msg.__wplace && msg.type === 'token_found' && msg.token) {
		try {
			chrome.runtime.sendMessage({
				type: 'wplace_token_found',
				token: msg.token || null,
				xpaw: msg.xpaw || null,
	               fp: msg.fp || null,
				worldX: msg.worldX || null,
				worldY: msg.worldY || null,
				//cfClearance: msg.cfClearance || null // Pass cfClearance if present
			});
		} catch (e) { console.error("[WPlace-Helper] Error sending token to background script:", e); }
	}
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	   if (msg.type === 'update_toggle_state') {
	       if (msg.hasOwnProperty('wplace_enabled')) {
	           try { window.postMessage({ __wplace: true, type: 'toggle', enabled: !!msg.wplace_enabled }, '*'); } catch (e) { console.error("[WPlace-Helper] Error toggling WPlace enabled state:", e); }
	       }
	       if (msg.hasOwnProperty('wplace_mock_paint_enabled')) {
	           try { window.postMessage({ __wplace: true, type: 'toggle_mock_paint', enabled: !!msg.wplace_mock_paint_enabled }, '*'); } catch (e) { console.error("[WPlace-Helper] Error toggling mock paint enabled state:", e); }
	       }
	   }
});
	
(function syncToggle() {
		let wplaceEnabled = true;
	   let mockPaintEnabled = false; // New state for mock paint toggle
		function syncEnabledToPage() {
			try { window.postMessage({ __wplace: true, type: 'toggle', enabled: !!wplaceEnabled }, '*'); } catch (e) { console.error("[WPlace-Helper] Error syncing enabled state to page:", e); }
		}
	   function syncMockPaintEnabledToPage() {
	       try { window.postMessage({ __wplace: true, type: 'toggle_mock_paint', enabled: !!mockPaintEnabled }, '*'); } catch (e) { console.error("[WPlace-Helper] Error syncing mock paint enabled state to page:", e); }
	   }
		try {
			chrome.storage.local.get(['wplace_enabled', 'wplace_mock_paint_enabled'], function(result) {
				if (result && typeof result.wplace_enabled === 'boolean') {
					wplaceEnabled = result.wplace_enabled;
				}
	           if (result && typeof result.wplace_mock_paint_enabled === 'boolean') {
	               mockPaintEnabled = result.wplace_mock_paint_enabled;
	           }
				syncEnabledToPage();
	           syncMockPaintEnabledToPage();
			});
			chrome.storage.onChanged.addListener(function(changes, area) {
				if (area === 'local' && changes) {
	               if (Object.prototype.hasOwnProperty.call(changes, 'wplace_enabled')) {
					    wplaceEnabled = !!changes.wplace_enabled.newValue;
					    syncEnabledToPage();
	               }
	               if (Object.prototype.hasOwnProperty.call(changes, 'wplace_mock_paint_enabled')) {
	                   mockPaintEnabled = !!changes.wplace_mock_paint_enabled.newValue;
	                   syncMockPaintEnabledToPage();
	               }
				}
			});
		} catch (e) { console.error("[WPlace-Helper] Error in syncToggle function:", e); }
	})();
	
// Send message to background script when content script is loaded
try {
		chrome.runtime.sendMessage({ type: 'wplace_content_script_loaded' });
} catch (e) {
		console.warn("[WPlace-Helper] Failed to send 'content_script_loaded' message:", e);
}
