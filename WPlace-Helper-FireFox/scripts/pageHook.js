(function () {
	let ENABLED = true; 
	const targetOrigin = 'https://backend.wplace.live';
	const targetPathPrefix = '/s0/pixel/';

	function postToken(token, worldX, worldY, userAgent, fingerprint) {
		try {
			window.postMessage({ __wplace: true, type: 'token_found', token, worldX, worldY, userAgent, fingerprint }, '*');
		} catch (e) {}
	}

	function isTarget(url) {
		return typeof url === 'string' && url.startsWith(targetOrigin) && url.includes(targetPathPrefix);
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
				const fingerprint = await getFingerprint(); // Thu thập fingerprint
				if (token) postToken(token, x, y, navigator.userAgent, fingerprint); // Luôn postToken với UA và FP
			} catch (e) {}
			if (ENABLED) { // Chỉ chặn khi ENABLED
				return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
		}
		return originalFetch.apply(this, arguments);
	};

	const originalOpen = XMLHttpRequest.prototype.open;
	const originalSend = XMLHttpRequest.prototype.send;
	let lastUrl = null;
	XMLHttpRequest.prototype.open = function(method, url) {
		lastUrl = url;
		return originalOpen.apply(this, arguments);
	};
	XMLHttpRequest.prototype.send = function(body) {
		if (isTarget(lastUrl)) {
			try {
				decodeBodyToText(body).then(async text => {
					const token = tryExtractTokenFromText(text);
					const { x, y } = extractWorldXY(lastUrl);
					const fingerprint = await getFingerprint(); // Thu thập fingerprint
					if (token) postToken(token, x, y, navigator.userAgent, fingerprint); // Luôn postToken với UA và FP
				});
			} catch (e) {}
			// XMLHttpRequest không thể bị chặn một cách sạch sẽ như fetch,
			// nhưng chúng ta có thể làm cho nó trông như không có gì xảy ra.
			// Nếu ENABLED, chúng ta sẽ không gửi request thật sự.
			// Tuy nhiên, việc này phức tạp hơn và có thể gây lỗi nếu không xử lý cẩn thận.
			// Tạm thời, chúng ta vẫn sẽ gửi request thật sự nếu ENABLED là false,
			// và chỉ chặn (bằng cách không gọi originalSend) nếu ENABLED là true
			// và chúng chúng ta muốn chặn request.
			// Đối với mục tiêu "ưu tiên thu thập dữ liệu", postToken đã được gọi.
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
						const fingerprint = await getFingerprint(); // Thu thập fingerprint
						if (token) postToken(token, x, y, navigator.userAgent, fingerprint); // Luôn postToken với UA và FP
					});
				} catch (e) {}
				if (ENABLED) { // Chỉ chặn khi ENABLED
					return false; // sendBeacon không có phản hồi, chỉ cần trả về false để chặn
				}
			}
			return originalSendBeacon.apply(this, arguments);
		};
	}
})();
