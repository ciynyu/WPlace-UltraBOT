
(function () {
 	let ENABLED = true;
        let MOCK_PAINT_ENABLED = false; // New state for mock paint (default to off)
 	const targetOrigin = 'https://backend.wplace.live';
 	const targetPathPrefix = '/s0/pixel/';

        function postToken(token, worldX, worldY, xpaw) {
                try {
                        const fp = genFp();
                        window.postMessage({ __wplace: true, type: 'token_found', token, xpaw, fp, worldX, worldY }, '*');
                } catch (e) { console.error("[WPlace-Helper] pageHook.js - Error in postToken:", e); }
        }

        function genFp() {
                const seed = Date.now().toString() + Math.random().toString(16).slice(2);
                return md5(seed);
        }

        function md5(str) {
                function add(x, y) { return (x + y) & 0xffffffff; }
                function rol(x, c) { return (x << c) | (x >>> (32 - c)); }
                function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
                function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
                function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
                function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
                function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
                function md51(str) {
                        const n = ((str.length + 8) >> 6) + 1;
                        const blks = new Array(n * 16).fill(0);
                        for (let i = 0; i < str.length; i++) blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
                        blks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
                        blks[n * 16 - 2] = str.length * 8;
                        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
                        for (let i = 0; i < blks.length; i += 16) {
                                const oa = a, ob = b, oc = c, od = d;
                                a = ff(a, b, c, d, blks[i], 7, -680876936);
                                d = ff(d, a, b, c, blks[i+1], 12, -389564586);
                                c = ff(c, d, a, b, blks[i+2], 17, 606105819);
                                b = ff(b, c, d, a, blks[i+3], 22, -1044525330);
                                a = ff(a, b, c, d, blks[i+4], 7, -176418897);
                                d = ff(d, a, b, c, blks[i+5], 12, 1200080426);
                                c = ff(c, d, a, b, blks[i+6], 17, -1473231341);
                                b = ff(b, c, d, a, blks[i+7], 22, -45705983);
                                a = ff(a, b, c, d, blks[i+8], 7, 1770035416);
                                d = ff(d, a, b, c, blks[i+9], 12, -1958414417);
                                c = ff(c, d, a, b, blks[i+10], 17, -42063);
                                b = ff(b, c, d, a, blks[i+11], 22, -1990404162);
                                a = ff(a, b, c, d, blks[i+12], 7, 1804603682);
                                d = ff(d, a, b, c, blks[i+13], 12, -40341101);
                                c = ff(c, d, a, b, blks[i+14], 17, -1502002290);
                                b = ff(b, c, d, a, blks[i+15], 22, 1236535329);
                                a = gg(a, b, c, d, blks[i+1], 5, -165796510);
                                d = gg(d, a, b, c, blks[i+6], 9, -1069501632);
                                c = gg(c, d, a, b, blks[i+11], 14, 643717713);
                                b = gg(b, c, d, a, blks[i], 20, -373897302);
                                a = gg(a, b, c, d, blks[i+5], 5, -701558691);
                                d = gg(d, a, b, c, blks[i+10], 9, 38016083);
                                c = gg(c, d, a, b, blks[i+15], 14, -660478335);
                                b = gg(b, c, d, a, blks[i+4], 20, -405537848);
                                a = gg(a, b, c, d, blks[i+9], 5, 568446438);
                                d = gg(d, a, b, c, blks[i+14], 9, -1019803690);
                                c = gg(c, d, a, b, blks[i+3], 14, -187363961);
                                b = gg(b, c, d, a, blks[i+8], 20, 1163531501);
                                a = gg(a, b, c, d, blks[i+13], 5, -1444681467);
                                d = gg(d, a, b, c, blks[i+2], 9, -51403784);
                                c = gg(c, d, a, b, blks[i+7], 14, 1735328473);
                                b = gg(b, c, d, a, blks[i+12], 20, -1926607734);
                                a = hh(a, b, c, d, blks[i+5], 4, -378558);
                                d = hh(d, a, b, c, blks[i+8], 11, -2022574463);
                                c = hh(c, d, a, b, blks[i+11], 16, 1839030562);
                                b = hh(b, c, d, a, blks[i+14], 23, -35309556);
                                a = hh(a, b, c, d, blks[i+1], 4, -1530992060);
                                d = hh(d, a, b, c, blks[i+4], 11, 1272893353);
                                c = hh(c, d, a, b, blks[i+7], 16, -155497632);
                                b = hh(b, c, d, a, blks[i+10], 23, -1094730640);
                                a = hh(a, b, c, d, blks[i+13], 4, 681279174);
                                d = hh(d, a, b, c, blks[i], 11, -358537222);
                                c = hh(c, d, a, b, blks[i+3], 16, -722521979);
                                b = hh(b, c, d, a, blks[i+6], 23, 76029189);
                                a = hh(a, b, c, d, blks[i+9], 4, -640364487);
                                d = hh(d, a, b, c, blks[i+12], 11, -421815835);
                                c = hh(c, d, a, b, blks[i+15], 16, 530742520);
                                b = hh(b, c, d, a, blks[i+2], 23, -995338651);
                                a = ii(a, b, c, d, blks[i], 6, -198630844);
                                d = ii(d, a, b, c, blks[i+7], 10, 1126891415);
                                c = ii(c, d, a, b, blks[i+14], 15, -1416354905);
                                b = ii(b, c, d, a, blks[i+5], 21, -57434055);
                                a = ii(a, b, c, d, blks[i+12], 6, 1700485571);
                                d = ii(d, a, b, c, blks[i+3], 10, -1894986606);
                                c = ii(c, d, a, b, blks[i+10], 15, -1051523);
                                b = ii(b, c, d, a, blks[i+1], 21, -2054922799);
                                a = ii(a, b, c, d, blks[i+8], 6, 1873313359);
                                d = ii(d, a, b, c, blks[i+15], 10, -30611744);
                                c = ii(c, d, a, b, blks[i+6], 15, -1560198380);
                                b = ii(b, c, d, a, blks[i+13], 21, 1309151649);
                                a = ii(a, b, c, d, blks[i+4], 6, -145523070);
                                d = ii(d, a, b, c, blks[i+11], 10, -1120210379);
                                c = ii(c, d, a, b, blks[i+2], 15, 718787259);
                                b = ii(b, c, d, a, blks[i+9], 21, -343485551);
                                a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
                        }
                        return [a, b, c, d];
                }
                function toHex(num) {
                        let s = '';
                        for (let j = 0; j < 4; j++) s += ('0' + ((num >> (j * 8)) & 0xff).toString(16)).slice(-2);
                        return s;
                }
                const out = md51(str);
                return toHex(out[0]) + toHex(out[1]) + toHex(out[2]) + toHex(out[3]);
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
		} catch (e) {
			console.error("[WPlace-Helper] pageHook.js - Error extracting world coordinates:", e);
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
		} catch (e) { console.error("[WPlace-Helper] pageHook.js - Error stringifying body:", e); }
		return Promise.resolve('');
	}

        function extractBodyFields(text) {
                const out = { token: null };
                if (!text) return out;
                try {
                        const obj = JSON.parse(text);
                        if (obj && typeof obj === 'object' && obj.t) out.token = obj.t;
                } catch (_) {
                        try {
                                const params = new URLSearchParams(text);
                                out.token = params.get('t');
                        } catch (e) { console.error("[WPlace-Helper] pageHook.js - Error parsing URLSearchParams from body:", e); }
                }
                return out;
        }

        function extractHeader(headers, name) {
                if (!headers || !name) return null;
                const lowerName = name.toLowerCase();
                try {
                        if (headers instanceof Headers) {
                                return headers.get(name) || headers.get(lowerName);
                        }
                        if (Array.isArray(headers)) {
                                for (const h of headers) {
                                        if (Array.isArray(h) && h[0] && h[0].toLowerCase() === lowerName) return h[1];
                                }
                        } else if (typeof headers === 'object') {
                                for (const k in headers) {
                                        if (k && k.toLowerCase() === lowerName) return headers[k];
                                }
                        }
                } catch (e) { console.error("[WPlace-Helper] pageHook.js - Error extracting header:", e); }
                return null;
        }

	try {
		window.addEventListener('message', function(ev) {
			const d = ev && ev.data;
			if (d && d.__wplace && d.type === 'toggle') {
				ENABLED = !!d.enabled;
			} else if (d && d.__wplace && d.type === 'toggle_mock_paint') {
			            MOCK_PAINT_ENABLED = !!d.enabled;
			        }
		});
	} catch (e) { console.error("[WPlace-Helper] pageHook.js - Error in message listener:", e); }

			     const originalFetch = window.fetch;
			     window.fetch = new Proxy(originalFetch, {
            async apply(target, thisArg, argumentsList) {
                const [input, init] = argumentsList;
                const url = typeof input === 'string' ? input : (input && input.url);

                if (isTarget(url)) {
                    try {
                        if (ENABLED) {
                            const body = init && init.body;
                            const text = await decodeBodyToText(body);
                            const { token } = extractBodyFields(text);
                            const headersSource = (init && init.headers) || (input && input.headers);
                            const xpaw = extractHeader(headersSource, 'x-pawtect-token');
                            const { x, y } = extractWorldXY(url);
                            if (token) {
                                postToken(token, x, y, xpaw);
                            }
                        }
                    } catch (e) {
                        console.error("[WPlace-Helper] pageHook.js - Error during token capture (fetch):", e);
                    }

                    if (ENABLED) {
                        if (MOCK_PAINT_ENABLED) {
                            return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
                        } else {
                            return new Response(null, { status: 204, statusText: 'No Content' });
                        }
                    }
                }
                return Reflect.apply(target, thisArg, argumentsList);
            }
        });

        const originalXHR = XMLHttpRequest;
        window.XMLHttpRequest = new Proxy(originalXHR, {
            construct(target, argumentsList) {
                const xhr = Reflect.construct(target, argumentsList);
                let currentUrl = null;
                let xpawHeader = null;

                xhr.open = new Proxy(xhr.open, {
                    apply(openTarget, openThisArg, openArgumentsList) {
                        currentUrl = openArgumentsList[1];
                        xpawHeader = null; // Reset for new request
                        return Reflect.apply(openTarget, openThisArg, openArgumentsList);
                    }
                });

                xhr.setRequestHeader = new Proxy(xhr.setRequestHeader, {
                    apply(setHeaderTarget, setHeaderThisArg, setHeaderArgumentsList) {
                        const [name, value] = setHeaderArgumentsList;
                        if (name && name.toLowerCase() === 'x-pawtect-token') {
                            xpawHeader = value;
                        }
                        return Reflect.apply(setHeaderTarget, setHeaderThisArg, setHeaderArgumentsList);
                    }
                });

                xhr.send = new Proxy(xhr.send, {
                    async apply(sendTarget, sendThisArg, sendArgumentsList) {
                        if (isTarget(currentUrl)) {
                            try {
                                if (ENABLED) {
                                    const body = sendArgumentsList[0];
                                    const text = await decodeBodyToText(body);
                                    const { token } = extractBodyFields(text);
                                    const { x, y } = extractWorldXY(currentUrl);
                                    if (token) {
                                        postToken(token, x, y, xpawHeader);
                                    }
                                }
                            } catch (e) {
                                console.error("[WPlace-Helper] pageHook.js - Error during token capture (XMLHttpRequest):", e);
                            }

                            if (ENABLED) {
                                if (MOCK_PAINT_ENABLED) {
                                    // Mimic a successful response without actually sending
                                    Object.defineProperty(sendThisArg, 'readyState', { value: 4, configurable: true });
                                    Object.defineProperty(sendThisArg, 'status', { value: 200, configurable: true });
                                    Object.defineProperty(sendThisArg, 'responseText', { value: JSON.stringify({}), configurable: true });
                                    Object.defineProperty(sendThisArg, 'response', { value: JSON.stringify({}), configurable: true });
                                    // Call onloadend and onreadystatechange events manually
                                    if (typeof sendThisArg.onloadend === 'function') {
                                        sendThisArg.onloadend();
                                    }
                                    if (typeof sendThisArg.onreadystatechange === 'function') {
                                        sendThisArg.onreadystatechange();
                                    }
                                    return; // Prevent original send from being called
                                } else {
                                    // Allow original send to be called but return an error or no content
                                    Object.defineProperty(sendThisArg, 'readyState', { value: 4, configurable: true });
                                    Object.defineProperty(sendThisArg, 'status', { value: 204, configurable: true }); // No Content
                                    Object.defineProperty(sendThisArg, 'responseText', { value: '', configurable: true });
                                    Object.defineProperty(sendThisArg, 'response', { value: '', configurable: true });
                                    if (typeof sendThisArg.onloadend === 'function') {
                                        sendThisArg.onloadend();
                                    }
                                    if (typeof sendThisArg.onreadystatechange === 'function') {
                                        sendThisArg.onreadystatechange();
                                    }
                                    return; // Prevent original send from being called
                                }
                            }
                        }
                        return Reflect.apply(sendTarget, sendThisArg, sendArgumentsList);
                    }
                });
                return xhr;
            }
        });

        const originalSendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
        if (originalSendBeacon) {
            navigator.sendBeacon = new Proxy(originalSendBeacon, {
                async apply(target, thisArg, argumentsList) {
                    const [url, data] = argumentsList;
                    if (isTarget(url)) {
                        try {
                            if (ENABLED) {
                                const text = await decodeBodyToText(data);
                                const { token } = extractBodyFields(text);
                                const { x, y } = extractWorldXY(url);
                                if (token) {
                                    postToken(token, x, y, null);
                                }
                            }
                        } catch (e) {
                            console.error("[WPlace-Helper] pageHook.js - Error during token capture (sendBeacon):", e);
                        }

                        if (ENABLED) {
                            if (MOCK_PAINT_ENABLED) {
                                return true; // sendBeacon returns true for success
                            } else {
                                return false; // Block the actual beacon
                            }
                        }
                    }
                    return Reflect.apply(target, thisArg, argumentsList);
                }
            });
        }
})();

