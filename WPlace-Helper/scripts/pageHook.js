console.log("[WPlace-Helper] pageHook.js loaded.");

(function () {
	let ENABLED = true; // Enable blocking feature by default
	const targetOrigin = 'https://backend.wplace.live';
	const targetPathPrefix = '/s0/pixel/';
	const cloudflareChallengePrefix = 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/';

	function postToken(token, worldX, worldY, userAgent, fingerprint, cfClearance = null) {
		try {
			window.postMessage({ __wplace: true, type: 'token_found', token, worldX, worldY, userAgent, fingerprint, cfClearance }, '*');
		} catch (e) {}
	}

	function isTarget(url) {
		return typeof url === 'string' && url.startsWith(targetOrigin) && url.includes(targetPathPrefix);
	}

	function isCloudflareChallenge(url) {
		return typeof url === 'string' && url.startsWith(cloudflareChallengePrefix);
	}

	function extractCfClearanceFromUrl(url) {
		try {
			// Extract the part after the last colon and before any query parameters or hash
			const parts = url.split(':');
			if (parts.length > 1) {
				const lastPart = parts[parts.length - 1];
				const clearance = lastPart.split('?')[0].split('#')[0];
				return clearance;
			}
		} catch (e) {
			console.error("Error extracting cf_clearance:", e);
		}
		return null;
	}

	function extractWorldXY(url) {
		try {
			if (!isTarget(url)) return { x: null, y: null };
			const idx = url.indexOf(targetPathPrefix);
			if (idx === -1) return { x: null, y: null };
			const rest = url.slice(idx + targetPathPrefix.length);
			// Expect formats like "1188/767" possibly followed by query/hash
			const m = rest.match(/^(\d+)\/(\d+)/);
			if (!m) return { x: null, y: null };
			return { x: m[1], y: m[2] };
		} catch (_) {
			return { x: null, y: null };
		}
	}

	function decodeBodyToText(body) {
		if (!body) return Promise.resolve('');
		if (typeof body === 'string') return Promise.resolve(body);
		if (body instanceof Blob) return body.text();
		if (body instanceof URLSearchParams) return Promise.resolve(body.toString());
		try {
			if (body && typeof body === 'object') return Promise.resolve(JSON.stringify(body));
		} catch (e) {}
		return Promise.resolve('');
	}

	function tryExtractTokenFromText(text) {
		if (!text) return null;
		try {
			const obj = JSON.parse(text);
			if (obj && obj.t) return obj.t;
		} catch (_) {}
		try {
			const params = new URLSearchParams(text);
			const t = params.get('t');
			if (t) return t;
		} catch (_) {}
		return null;
	}

	// Function to collect fingerprint components using FingerprintJS
	async function getFingerprint() {
		try {
			// Ensure FingerprintJS is loaded globally (should be handled by content.js injecting fingerprint.js)
			if (typeof FingerprintJS === 'undefined') {
				console.warn("FingerprintJS is not loaded. Returning dummy fingerprint.");
				return { error: "FingerprintJS not loaded" };
			}
			const fp = await FingerprintJS.load();
			const result = await fp.get();
			return result.components;
		} catch (e) {
			console.error("Error collecting fingerprint:", e);
			return { error: e.message };
		}
	}

	try {
		window.addEventListener('message', function(ev) {
			const d = ev && ev.data;
			if (d && d.__wplace && d.type === 'toggle') {
				ENABLED = !!d.enabled;
			}
		});
	} catch (e) {}

	const originalFetch = window.fetch;
	window.fetch = async function(input, init) {
		const url = typeof input === 'string' ? input : (input && input.url);
		
		if (isTarget(url)) {
			try {
				const body = init && init.body;
				const text = await decodeBodyToText(body);
				const token = tryExtractTokenFromText(text);
				const { x, y } = extractWorldXY(url);
				if (token) postToken(token, x, y, navigator.userAgent, null);
			} catch (e) {}
			if (ENABLED) { // Only block when ENABLED
				return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
		} else if (isCloudflareChallenge(url)) {
			try {
				const cfClearance = extractCfClearanceFromUrl(url);
				// We don't have token, worldX, worldY here, so pass null for those.
				// userAgent and fingerprint are also not relevant for this specific capture.
				// Pass cfClearance to content script
				if (cfClearance) {
					console.log(`[WPlace-Helper] Cloudflare Challenge URL captured. CfClearance: ${cfClearance.substring(0, 20)}...`);
					postToken(null, null, null, null, null, cfClearance);
				}
			} catch (e) {
				console.error("[WPlace-Helper] Error processing Cloudflare challenge:", e);
			}
			// Do NOT block Cloudflare Challenge requests
		}
		return originalFetch.apply(this, arguments);
	};

	const originalOpen = XMLHttpRequest.prototype.open;
	const originalSend = XMLHttpRequest.prototype.send;
	let lastXhrUrl = null; // Renamed to avoid conflict with `lastUrl` in `window.fetch` if it were globally scoped
	XMLHttpRequest.prototype.open = function(method, url) {
		lastXhrUrl = url;
		return originalOpen.apply(this, arguments);
	};
	XMLHttpRequest.prototype.send = function(body) {
		if (isTarget(lastXhrUrl)) {
			try {
				decodeBodyToText(body).then(async text => {
					const token = tryExtractTokenFromText(text);
					const { x, y } = extractWorldXY(lastXhrUrl);
					if (token) postToken(token, x, y, navigator.userAgent, null);
				});
			} catch (e) {}
			// XMLHttpRequest cannot be cleanly blocked like fetch,
		// but we can make it look like nothing happened.
		// If ENABLED, we will not send the actual request.
		// However, this is more complex and can cause errors if not handled carefully.
		// For now, we will still send the actual request if ENABLED is false,
		// and only block (by not calling originalSend) if ENABLED is true
		// and we want to block the request.
		// For the "prioritize data collection" goal, postToken has already been called.
		} else if (isCloudflareChallenge(lastXhrUrl)) {
			try {
				const cfClearance = extractCfClearanceFromUrl(lastXhrUrl);
				if (cfClearance) {
					console.log(`[WPlace-Helper] Cloudflare Challenge XMLHttpRequest captured. CfClearance: ${cfClearance.substring(0, 20)}...`);
					postToken(null, null, null, null, null, cfClearance);
				}
			} catch (e) {
				console.error("[WPlace-Helper] Error processing Cloudflare challenge XMLHttpRequest:", e);
			}
			// Do NOT block Cloudflare Challenge requests
		}
		return originalSend.apply(this, arguments);
	};

	const originalSendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
	if (originalSendBeacon) {
		navigator.sendBeacon = function(url, data) {
			if (isTarget(url)) {
				try {
					decodeBodyToText(data).then(async text => {
						const token = tryExtractTokenFromText(text);
						const { x, y } = extractWorldXY(url);
						if (token) postToken(token, x, y, navigator.userAgent, null);
					});
				} catch (e) {}
				if (ENABLED) { // Only block when ENABLED
					return false; // sendBeacon has no response, just return false to block
				}
			} else if (isCloudflareChallenge(url)) {
				try {
					const cfClearance = extractCfClearanceFromUrl(url);
					if (cfClearance) {
						console.log(`[WPlace-Helper] Cloudflare Challenge SendBeacon captured. CfClearance: ${cfClearance.substring(0, 20)}...`);
						postToken(null, null, null, null, null, cfClearance);
					}
				} catch (e) {
					console.error("[WPlace-Helper] Error processing Cloudflare challenge SendBeacon:", e);
				}
				// Do NOT block Cloudflare Challenge requests
			}
			return originalSendBeacon.apply(this, arguments);
		};
	}
})();
