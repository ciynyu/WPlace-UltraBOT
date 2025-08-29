const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const url = require('url');
/*
const { Worker } = require('worker_threads');
*/
let axios; try { axios = require('axios'); } catch (e) { axios = null; }
let puppeteer; try { puppeteer = require('puppeteer-extra'); } catch (e) { puppeteer = null; } // Sử dụng puppeteer-extra
let stealth; try { stealth = require('puppeteer-extra-plugin-stealth'); } catch (e) { stealth = null; } // Thêm stealth plugin

const UserAgent = require('user-agents'); // Import user-agents
const { FingerprintGenerator } = require('fingerprint-generator'); // Import fingerprint-generator

// Hàm utility để phân tích User-Agent string
function parseUserAgent(uaString) {
    let browser = { name: 'unknown', version: 0 };
    let os = { name: 'unknown', version: 0 };

    if (!uaString) return { browser, os };

    // Detect OS
    if (uaString.includes('Windows NT 10.0')) {
        os = { name: 'windows', version: 10 };
    } else if (uaString.includes('Windows NT 6.3')) {
        os = { name: 'windows', version: 8.1 };
    } else if (uaString.includes('Windows NT 6.2')) {
        os = { name: 'windows', version: 8 };
    } else if (uaString.includes('Macintosh; Intel Mac OS X')) {
        const osVersionMatch = uaString.match(/Mac OS X (\d+)_(\d+)(?:_(\d+))?/);
        if (osVersionMatch) {
            os = { name: 'macos', version: parseFloat(`${osVersionMatch[1]}.${osVersionMatch[2]}`) };
        }
    } else if (uaString.includes('Linux')) {
        os = { name: 'linux', version: 0 }; // Không có phiên bản cụ thể dễ dàng từ UA Linux
    }

    // Detect Browser
    if (uaString.includes('Chrome') && !uaString.includes('Edge')) {
        const versionMatch = uaString.match(/Chrome\/(\d+)\./);
        if (versionMatch) browser = { name: 'chrome', version: parseInt(versionMatch[1], 10) };
    } else if (uaString.includes('Firefox')) {
        const versionMatch = uaString.match(/Firefox\/(\d+)\./);
        if (versionMatch) browser = { name: 'firefox', version: parseInt(versionMatch[1], 10) };
    } else if (uaString.includes('Edge')) {
        const versionMatch = uaString.match(/Edge\/(\d+)\./);
        if (versionMatch) browser = { name: 'edge', version: parseInt(versionMatch[1], 10) };
    }

    return { browser, os };
}


let DEBUG = true; // Mặc định bật debug
let DEBUG_MASK = !(process.env.DEBUG_MASK === '0' || process.env.DEBUG_MASK === 'false');
function enableDebug() { DEBUG = true; }
function enableDebugFull() { DEBUG = true; DEBUG_MASK = false; }
function maskToken(str) {
  if (!str) return '';
  const s = String(str);
  if (s.length <= 8) return '***';
  return s.slice(0, 4) + '…' + s.slice(-4);
}
function debugLog(type, ...args) { if (DEBUG) { try { console.log(`[debug][${(new Date()).toISOString()}] [${type}]`, ...args); } catch {} } }
module.exports.debugLog = debugLog; // Export debugLog

// Hàm tạo User-Agent và Fingerprint ngẫu nhiên và đồng bộ
function generateAntiDetectionParams() {
    try {
        const osOptions = [
            { name: 'Windows', minVersion: 10 }, // Windows 10 trở lên
            { name: 'Mac OS X', minVersion: 10.15 }, // macOS Catalina (10.15) trở lên
            { name: 'Linux' }
        ];
        const browserOptions = ['Chrome', 'Firefox', 'Edge'];

        // Tạo User-Agent
        const userAgentGenerator = new UserAgent({
            deviceCategory: 'desktop',
            os: osOptions,
            browser: browserOptions,
            // user-agents sẽ tự chọn phiên bản gần nhất nếu không chỉ định rõ
        });
        const newUserAgent = userAgentGenerator.toString();

        if (!newUserAgent) {
            debugLog('ERROR', 'Failed to generate User-Agent.');
            return null;
        }

        // Phân tích User-Agent để lấy thông tin cho Fingerprint Generator
        const parsedUAInfo = parseUserAgent(newUserAgent);

        // Kiểm tra xem parseUserAgent có trả về thông tin hợp lệ không
        if (!parsedUAInfo.browser.name || parsedUAInfo.browser.version === 0 || !parsedUAInfo.os.name) {
            debugLog('ERROR', 'Failed to parse User-Agent for fingerprint generation:', newUserAgent);
            return null;
        }

        // Xác định phiên bản trình duyệt và hệ điều hành cho fingerprint-generator
        // Đảm bảo không quá cũ và đồng bộ với User-Agent
        const browserConfig = {
            name: parsedUAInfo.browser.name,
            minVersion: Math.max(parsedUAInfo.browser.version - 2, 80), // Đảm bảo phiên bản không quá cũ (ví dụ: > 80)
            maxVersion: parsedUAInfo.browser.version
        };

        let osConfig;
        if (parsedUAInfo.os.name === 'windows') {
            osConfig = { name: 'windows', minVersion: parsedUAInfo.os.version, maxVersion: parsedUAInfo.os.version };
        } else if (parsedUAInfo.os.name === 'macos') {
            osConfig = { name: 'macos', minVersion: parsedUAInfo.os.version, maxVersion: parsedUAInfo.os.version };
        } else { // linux
            osConfig = { name: 'linux' }; // fingerprint-generator tự xử lý phiên bản Linux
        }

        const fingerprintGen = new FingerprintGenerator({
            browsers: [browserConfig],
            operatingSystems: [osConfig],
            devices: ['desktop'],
            // Các tham số khác có thể thêm để tạo fingerprint chi tiết hơn nếu cần
        });
        const { fingerprint: newFingerprint, headers: newHeaders } = fingerprintGen.getFingerprint({
            userAgent: newUserAgent // Sử dụng chính User-Agent đã tạo để đảm bảo đồng bộ
        });

        if (!newFingerprint) {
            debugLog('ERROR', 'Failed to generate Fingerprint.');
            return null;
        }

        return { userAgent: newUserAgent, fingerprint: newFingerprint, headers: newHeaders };
    } catch (e) {
        debugLog('CRITICAL', 'Exception during anti-detection params generation:', e.message);
        return null; // Trả về null nếu có lỗi
    }
}
function maskCookieHeader(cookieHeader) {
  if (!cookieHeader) return '';
  if (!DEBUG_MASK) return String(cookieHeader);
  let out = String(cookieHeader);
  out = out.replace(/cf_clearance=([^;]+)/i, (_, v) => `cf_clearance=${maskToken(v)}`);
  out = out.replace(/\bj=([^;]+)/i, (_, v) => `j=${maskToken(v)}`);
  return out;
}

const HTTPS_AGENT = new https.Agent({ secureProtocol: 'TLSv1_2_method' });
let axiosClient = null;
if (axios) {
  axiosClient = axios.create({ httpsAgent: HTTPS_AGENT, timeout: 15000, validateStatus: () => true });
  axiosClient.interceptors.request.use((config) => {
    try {
      const headers = { ...(config.headers || {}) };
      const cookieValue = headers.Cookie || headers.cookie || '';
      if (cookieValue) {
        const masked = maskCookieHeader(cookieValue);
        headers.Cookie = masked;
        headers.cookie = masked;
      }
      debugLog('OUTBOUND', 'HTTP GET', { url: config && config.url, headers });
    } catch {}
    return config;
  });
  axiosClient.interceptors.response.use((response) => {
    try {
      const data = response && response.data;
      let preview = '';
      if (typeof data === 'string') preview = data.slice(0, 300);
      else {
        try { preview = JSON.stringify(data).slice(0, 300); } catch { preview = String(data).slice(0, 300); }
      }
      debugLog('OUTBOUND_RESPONSE', 'HTTP GET response', {
        url: response && response.config && response.config.url,
        status: response && response.status,
        statusText: response && response.statusText,
        bodyPreview: preview
      });
    } catch {}
    return response;
  }, (error) => {
    try {
      if (error && error.response) {
        const data = error.response.data;
        let preview = '';
        if (typeof data === 'string') preview = data.slice(0, 300);
        else {
          try { preview = JSON.stringify(data).slice(0, 300); } catch { preview = String(data).slice(0, 300); }
        }
        debugLog('OUTBOUND_ERROR', 'HTTP GET error', {
          url: error.response && error.response.config && error.response.config.url,
          status: error.response && error.response.status,
          bodyPreview: preview
        });
      } else {
        debugLog('OUTBOUND_ERROR', 'HTTP GET network error', { message: error && error.message ? error.message : String(error) });
      }
    } catch {}
    return Promise.reject(error);
  });
}


let gotScrapingFn = null;
async function getGotScrapingFn() {
  if (gotScrapingFn) return gotScrapingFn;
  try {
    const mod = await import('got-scraping');
    gotScrapingFn = mod && (mod.gotScraping || (typeof mod.default === 'function' ? mod.default : null));
  } catch {}
  return gotScrapingFn;
}


const DB_DIR = path.resolve(process.cwd(), 'db');
const ACCOUNTS_FILE = path.join(DB_DIR, 'accounts.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');
const FAVORITES_FILE = path.join(DB_DIR, 'favorites.json');
/*
const { AccountManager, readJson: readJsonFromAM, writeJson: writeJsonFromAM, deactivateAccountByToken: deactivateByAM } = require('./accountManager.js');
const WorkerPool = require('./workerPool.js');
const accountManager = new AccountManager();
const workerPool = new WorkerPool(5, path.join(__dirname, 'worker.js'));
*/
function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}


// Original definitions for ACCOUNTS_FILE, readJson, writeJson, deactivateAccountByToken before refactor
/*




*/

//const { AccountManager, readJson, writeJson, deactivateAccountByToken } = require('./accountManager.js');
//const WorkerPool = require('./workerPool.js'); // Import WorkerPool

//const accountManager = new AccountManager();
//const workerPool = new WorkerPool(5, path.join(__dirname, 'worker.js')); // Initialize WorkerPool with 5 workers, pointing to worker.js

function ensureDb() {
  try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch {}
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    try { fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([], null, 2)); } catch {}
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ cf_clearance: '', worldX: null, worldY: null, updateIntervalMinutes: 5, enableAntiDetection: false }, null, 2)); } catch {}
  } else {
    // Migrate old settings.json to include updateIntervalMinutes and enableAntiDetection if missing
    try {
      const settings = readJson(SETTINGS_FILE, {});
      if (settings.updateIntervalMinutes == null) {
        settings.updateIntervalMinutes = 5; // Default value
        writeJson(SETTINGS_FILE, settings);
      }
      if (settings.enableAntiDetection == null) { // Add new setting for anti-detection toggle
        settings.enableAntiDetection = false; // Default to false
        writeJson(SETTINGS_FILE, settings);
      }
    } catch {}
  }

  if (!fs.existsSync(FAVORITES_FILE)) {
    try { fs.writeFileSync(FAVORITES_FILE, JSON.stringify([], null, 2)); } catch {}
  }
}

// Simple SSE hub for live events from extension → UI
const sseClients = new Set();
function sseBroadcast(eventName, payload) {
  try {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    sseClients.forEach((res) => {
      try {
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${data}\n\n`);
      } catch {}
    });
  } catch {}
}


// deactivateAccountByToken is now in accountManager.js
// Original deactivateAccountByToken function - kept for reference

function deactivateAccountByToken(jToken) {
  try {
    if (!jToken) return;
    const accounts = readJson(ACCOUNTS_FILE, []);
    const idx = accounts.findIndex(a => a && typeof a.token === 'string' && a.token === jToken);
    if (idx === -1) return;
    const current = accounts[idx] || {};
    const updated = { ...current, active: false };
    accounts[idx] = updated;
    writeJson(ACCOUNTS_FILE, accounts);
    console.log('[auto] account deactivated due to 500 when posting pixel:', current && current.name ? current.name : '(unknown)');
  } catch {}
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        try { req.socket.destroy(); } catch {}
        reject(new Error('Payload too large')); 
      }
    });
    req.on('end', () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}


async function requestMeLikePython(opts) {
  const cookieHeader = (opts && opts.cookie)
    ? String(opts.cookie)
    : `cf_clearance=${opts && opts.cf_clearance ? opts.cf_clearance : ''}; j=${opts && opts.j ? opts.j : ''}`;

  const gotScraping = await getGotScrapingFn();
  if (!gotScraping) {
    throw new Error('got-scraping is not available');
  }

  const options = {
    url: 'https://backend.wplace.live/me',
    headers: {
      'User-Agent': opts.userAgent || 'Mozilla/5.0', // Sử dụng userAgent từ opts
      'Cookie': cookieHeader
    },
    decompress: false,
    timeout: { request: 30000 },
    agent: { https: HTTPS_AGENT }
  };
  debugLog('OUTBOUND', 'HTTP GET begin', {
    host: 'backend.wplace.live',
    path: '/me',
    headers: { Cookie: maskCookieHeader(cookieHeader) }
  });

  const resp = await gotScraping(options);
  let bodyBuf = resp.rawBody || Buffer.from(String(resp.body || ''), 'utf8');
  const encoding = ((resp.headers && (resp.headers['content-encoding'] || resp.headers['Content-Encoding'])) || '').toLowerCase();
  if (encoding.includes('gzip')) {
    try { bodyBuf = zlib.gunzipSync(bodyBuf); } catch {}
  } else if (encoding.includes('deflate')) {
    try { bodyBuf = zlib.inflateRawSync(bodyBuf); } catch { try { bodyBuf = zlib.inflateSync(bodyBuf); } catch {} }
  }
  const status = resp.statusCode || 0;
  const reason = resp.statusMessage || '';
  if (!opts || !opts.silent) {
    console.log(`HTTP ${status} ${reason}`);
    try { console.log(bodyBuf.toString('utf8')); } catch { console.log(bodyBuf); }
  }
  debugLog('OUTBOUND_RESPONSE', 'HTTP GET end', { status, reason, bodyPreview: bodyBuf.toString('utf8').slice(0, 300) });
  return { status, reason, body: bodyBuf.toString('utf8') };
}


async function fetchMeAxios(cf_clearance, token, userAgent = 'Mozilla/5.0') {
  if (!axios) return null;
  const globalSettings = readJson(SETTINGS_FILE, {});
  const enableAntiDetection = globalSettings.enableAntiDetection || false;
  let currentAccountUserAgent = userAgent;

  // Lấy User-Agent đã lưu cho tài khoản nếu enableAntiDetection bật
  if (enableAntiDetection) {
    const accounts = readJson(ACCOUNTS_FILE, []);
    const acc = accounts.find(a => a && typeof a.token === 'string' && a.token === token);
    if (acc && acc.userAgent) {
      currentAccountUserAgent = acc.userAgent;
    }
  }
  /*
  if (enableAntiDetection) {
    const acc = accountManager.findAccountByToken(token);
    if (acc && acc.userAgent) {
      currentAccountUserAgent = acc.userAgent;
    }
  }
*/
  const headers = {
    'User-Agent': currentAccountUserAgent, // Sử dụng userAgent đã truyền vào hoặc từ tài khoản
    'Accept': 'application/json, text/plain, */*',
    'Cookie': `cf_clearance=${cf_clearance || ''}; j=${token || ''}`
  };
  debugLog('OUTBOUND', 'axios GET /me', { headers: { ...headers, Cookie: maskCookieHeader(headers.Cookie) } });
  const resp = await axiosClient.get('https://backend.wplace.live/me', { headers });
  if (!resp || resp.status !== 200) return null;
  const data = resp.data;
  if (data && typeof data === 'object') return data;
  try { return JSON.parse(String(data || '')); } catch { return null; }
}

async function fetchMe(cf_clearance, token, userAgent = 'Mozilla/5.0') {
  const globalSettings = readJson(SETTINGS_FILE, {});
  const enableAntiDetection = globalSettings.enableAntiDetection || false;
  let currentAccountUserAgent = userAgent;

  // Lấy User-Agent đã lưu cho tài khoản nếu enableAntiDetection bật
  if (enableAntiDetection) {
    const accounts = readJson(ACCOUNTS_FILE, []);
    const acc = accounts.find(a => a && typeof a.token === 'string' && a.token === token);
    if (acc && acc.userAgent) {
      currentAccountUserAgent = acc.userAgent;
      if (!currentAccountUserAgent || typeof currentAccountUserAgent !== 'string') {
        debugLog('WARNING', `Invalid User-Agent found for account ${acc.id}. Using default.`);
        currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
      }
    } else {
      debugLog('INFO', `Anti-detection enabled but no custom User-Agent for account ${acc ? acc.id : token}. Using default.`);
      currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default if anti-detection enabled but no custom UA
    }
  }
  /*
  if (enableAntiDetection) {
    const acc = accountManager.findAccountByToken(token);
    if (acc) {
      if (acc.userAgent) {
        currentAccountUserAgent = acc.userAgent;
        if (!currentAccountUserAgent || typeof currentAccountUserAgent !== 'string') {
          debugLog('WARNING', `Invalid User-Agent found for account ${acc.id}. Using default.`);
          currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
        }
      } else {
        debugLog('INFO', `Anti-detection enabled but no custom User-Agent for account ${acc.id}. Using default.`);
        currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default if anti-detection enabled but no custom UA
      }
    }
  }
  */
  debugLog('OUTBOUND', 'GET /me via got-scraping (requestMeLikePython)');
  const r = await requestMeLikePython({ cf_clearance, j: token, silent: true, userAgent: currentAccountUserAgent });
  if (!r || r.status !== 200 || !r.body) return null;
  try { return JSON.parse(r.body); } catch { return null; }
}

async function fetchMePuppeteer(cf_clearance, token, userAgent = 'Mozilla/5.0', fingerprint = null) {
  if (!puppeteer) return null;
  const globalSettings = readJson(SETTINGS_FILE, {});
  const enableAntiDetection = globalSettings.enableAntiDetection || false;
  let currentAccountUserAgent = userAgent;
  let currentAccountFingerprint = fingerprint;

  // Lấy User-Agent và Fingerprint đã lưu cho tài khoản nếu enableAntiDetection bật
/*  if (enableAntiDetection) {
    const acc = accountManager.findAccountByToken(token);
    if (acc) {
      if (acc.userAgent) {
        currentAccountUserAgent = acc.userAgent;
        if (!currentAccountUserAgent || typeof currentAccountUserAgent !== 'string') {
          debugLog('WARNING', `Invalid User-Agent found for account ${acc.id} in Puppeteer context. Using default.`);
          currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
        }
      } else {
        debugLog('INFO', `Anti-detection enabled but no custom User-Agent for account ${acc.id} in Puppeteer context. Using default.`);
        currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
      }
*/
  // Lấy User-Agent và Fingerprint đã lưu cho tài khoản nếu enableAntiDetection bật
  if (enableAntiDetection) {
    const accounts = readJson(ACCOUNTS_FILE, []);
    const acc = accounts.find(a => a && typeof a.token === 'string' && a.token === token);
    if (acc) {
      if (acc.userAgent) {
        currentAccountUserAgent = acc.userAgent;
        if (!currentAccountUserAgent || typeof currentAccountUserAgent !== 'string') {
          debugLog('WARNING', `Invalid User-Agent found for account ${acc.id} in Puppeteer context. Using default.`);
          currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
        }
      } else {
        debugLog('INFO', `Anti-detection enabled but no custom User-Agent for account ${acc.id} in Puppeteer context. Using default.`);
        currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
      }

      if (acc.fingerprint) {
        currentAccountFingerprint = acc.fingerprint;
        if (!currentAccountFingerprint || typeof currentAccountFingerprint !== 'object' || Object.keys(currentAccountFingerprint).length === 0) {
          debugLog('WARNING', `Invalid Fingerprint found for account ${acc.id} in Puppeteer context. Ignoring.`);
          currentAccountFingerprint = null; // Ignore invalid fingerprint
        }
      } else {
        debugLog('INFO', `Anti-detection enabled but no custom Fingerprint for account ${acc.id} in Puppeteer context. Ignoring.`);
        currentAccountFingerprint = null; // Ignore if anti-detection enabled but no custom FP
      }
    }
  }

  // Sử dụng stealth plugin với các tùy chỉnh từ fingerprint
  if (stealth) {
    puppeteer.use(stealth({
      // Hiện tại, stealth plugin tự động xử lý nhiều khía cạnh của fingerprinting.
      // Các thuộc tính cụ thể từ `currentAccountFingerprint` có thể được dùng để tinh chỉnh nếu cần
      // và nếu stealth plugin có các tùy chọn tương ứng (ví dụ: webgl, canvas)
    }));
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(currentAccountUserAgent); // Đặt User-Agent

    // Cố gắng mô phỏng fingerprint nếu có và hợp lệ
    if (currentAccountFingerprint) {
      // Đặt viewport nếu có screenResolution
      if (currentAccountFingerprint.screenResolution && currentAccountFingerprint.screenResolution.value) {
        await page.setViewport({
          width: currentAccountFingerprint.screenResolution.value.width,
          height: currentAccountFingerprint.screenResolution.value.height
        }).catch(e => debugLog('WARNING', `Could not set viewport: ${e.message}`));
      }

      // Mô phỏng các thuộc tính navigator khác (ví dụ: languages, platform, plugins)
      await page.evaluateOnNewDocument((fp) => {
        if (fp.languages && fp.languages.value) {
          Object.defineProperty(navigator, 'languages', {
            get: () => fp.languages.value,
          });
        }
        if (fp.platform && fp.platform.value) {
          Object.defineProperty(navigator, 'platform', {
            get: () => fp.platform.value,
          });
        }
        // Thêm các thuộc tính khác nếu cần (ví dụ: vendor, appVersion, deviceMemory, hardwareConcurrency)
        // Lưu ý: một số thuộc tính có thể được xử lý tốt hơn bởi stealth plugin
      }, currentAccountFingerprint);
    }
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      debugLog('OUTBOUND_PUPPETEER_REQUEST', `${request.method()} ${request.url()}`, {
        headers: {
          ...request.headers(),
          Cookie: maskCookieHeader(request.headers().cookie || request.headers().Cookie || '')
        },
        postData: request.postData()
      });
      request.continue();
    });
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const status = response.status();
        const headers = response.headers();
        let bodyPreview = '';
        try {
          const text = await response.text();
          bodyPreview = text.slice(0, 300);
        } catch (e) {
          bodyPreview = `Không thể đọc body: ${e.message}`;
        }
        debugLog('OUTBOUND_PUPPETEER_RESPONSE', `Response for ${response.request().method()} ${url}`, {
          status,
          headers,
          bodyPreview
        });
      } catch (e) {
        debugLog('OUTBOUND_PUPPETEER_RESPONSE_ERROR', `Error logging puppeteer response: ${e.message}`);
      }
    });

    const cookies = [];
    if (cf_clearance) cookies.push({ name: 'cf_clearance', value: String(cf_clearance), domain: 'backend.wplace.live', path: '/', httpOnly: false, secure: true });
    if (token) cookies.push({ name: 'j', value: String(token), domain: 'backend.wplace.live', path: '/', httpOnly: false, secure: true });
    if (cookies.length) await page.setCookie(...cookies);
    debugLog('OUTBOUND', 'puppeteer GET /me with cookies set');
    const res = await page.goto('https://backend.wplace.live/me', { waitUntil: 'networkidle2', timeout: 20000 });
    if (!res || res.status() !== 200) return null;
    const text = await page.evaluate(() => document.body && document.body.innerText || '');
    try { return JSON.parse(text); } catch { return null; }
  } finally {
    try { await browser.close(); } catch {}
  }
}

async function purchaseProduct(cf_clearance, token, productId, amount, userAgent = 'Mozilla/5.0') {
  const payload = JSON.stringify({ product: { id: productId, amount } });
  const globalSettings = readJson(SETTINGS_FILE, {});
  const enableAntiDetection = globalSettings.enableAntiDetection || false;
  let currentAccountUserAgent = userAgent;

  // Lấy User-Agent đã lưu cho tài khoản nếu enableAntiDetection bật
  if (enableAntiDetection) {
    const accounts = readJson(ACCOUNTS_FILE, []);
    const acc = accounts.find(a => a && typeof a.token === 'string' && a.token === token);
    if (acc && acc.userAgent) {
      currentAccountUserAgent = acc.userAgent;
    }
  }
/*  if (enableAntiDetection) {
    const acc = accountManager.findAccountByToken(token);
    if (acc && acc.userAgent) {
      currentAccountUserAgent = acc.userAgent;
    }
  }
*/
  try {
    const gotScraping = await getGotScrapingFn();
    if (gotScraping) {
      const r = await gotScraping({
        url: 'https://backend.wplace.live/purchase',
        method: 'POST',
        headers: {
          'User-Agent': currentAccountUserAgent, // Sử dụng userAgent đã truyền vào hoặc từ tài khoản
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://wplace.live',
          'Referer': 'https://wplace.live/',
          'Content-Type': 'application/json',
          'Cookie': `cf_clearance=${cf_clearance || ''}; j=${token || ''}`
        },
        body: payload,
        throwHttpErrors: false,
        decompress: true,
        agent: { https: HTTPS_AGENT },
        timeout: { request: 30000 }
      });
      const status = r && (r.statusCode || r.status) || 0;
      if (status === 200) {
        try {
          const data = typeof r.body === 'string' ? JSON.parse(r.body) : r.body;
          return data && data.success === true;
        } catch {}
      }
      return false;
    }
  } catch {}

  return new Promise((resolve) => {
    try {
      const options = {
        hostname: 'backend.wplace.live',
        path: '/purchase',
        method: 'POST',
        headers: {
          'User-Agent': currentAccountUserAgent, // Sử dụng userAgent đã truyền vào hoặc từ tài khoản
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://wplace.live',
          'Referer': 'https://wplace.live/',
          'Content-Type': 'application/json',
          'Cookie': `cf_clearance=${cf_clearance || ''}; j=${token || ''}`
        },
        agent: HTTPS_AGENT
      };
      const req = https.request(options, (resp) => {
        let buf = '';
        resp.on('data', (d) => { buf += d; });
        resp.on('end', () => {
          let ok = false;
          try {
            const data = JSON.parse(buf);
            ok = resp.statusCode === 200 && data && data.success === true;
          } catch {}
          resolve(ok);
        });
      });
      req.on('error', () => resolve(false));
      req.write(payload);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function startServer(port, host) {
  const server = http.createServer(async (req, res) => { // Thêm async ở đây
    const parsed = url.parse(req.url, true);
    ensureDb();
    // Endpoint mới để kiểm tra trạng thái của server
    if (parsed.pathname === '/api/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', debugMode: DEBUG, debugMask: DEBUG_MASK }));
      return;
    }

    let requestBody = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        requestBody = await readJsonBody(req);
        // Để không đọc lại body, đẩy lại vào req
        req.body = requestBody;
      } catch (e) {
        debugLog('INBOUND_ERROR', `Failed to parse request body for ${req.method} ${req.url}: ${e.message}`);
      }
    }

    debugLog('INBOUND', `${req.method} ${req.url}`, {
      headers: { ...req.headers },
      body: requestBody
    });

    // startAccountRefreshScheduler(); // Moved to main() to prevent multiple calls
    if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
      const htmlPath = path.resolve(process.cwd(), 'public', 'index.html');
      if (fs.existsSync(htmlPath)) {
        try {
          const html = fs.readFileSync(htmlPath);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(html);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('index.html okunamadı.');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('index.html bulunamadı.');
      }
      return;
    }
    if (parsed.pathname && /^\/tiles\/(.+?)\/(.+?)\.png$/.test(parsed.pathname)) {
      const m = parsed.pathname.match(/^\/tiles\/(.+?)\/(.+?)\.png$/);
      const area = m && m[1] ? m[1] : '';
      const no = m && m[2] ? m[2] : '';
      const remoteUrl = `https://backend.wplace.live/files/s0/tiles/${encodeURIComponent(area)}/${encodeURIComponent(no)}.png`;
      try {
        https.get(remoteUrl, { agent: HTTPS_AGENT, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/png,image/*;q=0.8,*/*;q=0.5' } }, (r) => {
          const status = r.statusCode || 0;
          if (status !== 200) {
            try { r.resume(); } catch {}
            res.writeHead(status === 404 ? 404 : 502, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Tile fetch failed');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
          r.pipe(res);
        }).on('error', () => {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Tile fetch error');
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Proxy error');
      }
      return;
    }
    // Server-Sent Events for live notifications
    if (parsed.pathname === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      try { res.write(': ok\n\n'); } catch {}
      sseClients.add(res);
      const ping = setInterval(() => { try { res.write('event: ping\ndata: {}\n\n'); } catch {} }, 15000);
      req.on('close', () => { try { clearInterval(ping); } catch {}; sseClients.delete(res); });
      return;
    }

    // CORS preflight for token endpoint
    if (parsed.pathname === '/api/token' && req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600'
      });
      res.end();
      return;
    }
    // Receive token captured by extension and notify connected UIs
    if (parsed.pathname === '/api/token' && req.method === 'POST') {
      const body = req.body; // Sử dụng body đã được đọc
      const token = body && typeof body.token === 'string' ? body.token : '';
      const worldX = (body && (typeof body.worldX === 'string' || typeof body.worldX === 'number')) ? body.worldX : null;
      const worldY = (body && (typeof body.worldY === 'string' || typeof body.worldY === 'number')) ? body.worldY : null;
      const userAgent = (body && typeof body.userAgent === 'string') ? body.userAgent : null;
      const fingerprint = (body && typeof body.fingerprint === 'object') ? body.fingerprint : null;
      // Lấy enableAntiDetection từ settings.json
      const globalSettings = readJson(SETTINGS_FILE, {});
      const enableAntiDetection = globalSettings.enableAntiDetection || false;

      if (!token) { res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ ok: false })); return; }
        try {
          // Lưu trữ userAgent và fingerprint vào settings.json nếu đó là token chính
          // (Chỉ áp dụng nếu đây là một token độc lập, không phải tài khoản)
          // Hiện tại, chúng ta lưu trữ UA và FP trên từng tài khoản
          const existingSettings = readJson(SETTINGS_FILE, { cf_clearance: '', worldX: null, worldY: null, userAgent: null, fingerprint: null });
          const mergedSettings = { ...existingSettings };
          if (worldX != null) mergedSettings.worldX = Number(worldX);
          if (worldY != null) mergedSettings.worldY = Number(worldY);
          // Không cập nhật userAgent và fingerprint ở đây nữa, chúng sẽ được lưu vào tài khoản
          writeJson(SETTINGS_FILE, mergedSettings);
        } catch {}
        sseBroadcast('token', { token, worldX, worldY, userAgent, fingerprint });
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      // Loại bỏ .catch() vì body đã được xử lý ở đầu hàm
      return;
    }

    // Favorites API
    if (parsed.pathname === '/api/favorites' && req.method === 'GET') {
      const favorites = readJson(FAVORITES_FILE, []);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(favorites));
      return;
    }
    if (parsed.pathname === '/api/favorites' && req.method === 'POST') {
      const body = req.body; // Sử dụng body đã được đọc
      try {
        const name = (body && typeof body.name === 'string') ? body.name : '';
        const modeRaw = (body && typeof body.mode === 'string') ? body.mode : '';
        const mode = (modeRaw === 'mosaic' || modeRaw === 'single') ? modeRaw : 'single';
        const coordsIn = Array.isArray(body && body.coords) ? body.coords : [];
          const coords = coordsIn.map((c) => ({ x: Number(c && c.x), y: Number(c && c.y) }))
            .filter((c) => Number.isFinite(c.x) && Number.isFinite(c.y));
          if (!coords.length) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'invalid coords' }));
            return;
          }
          const favs = readJson(FAVORITES_FILE, []);
          const sameLoc = (a, b) => a && b && a.mode === b.mode && JSON.stringify(a.coords) === JSON.stringify(b.coords);
          const incoming = { name, mode, coords };
          const idx = favs.findIndex((f) => sameLoc(f, incoming));
          let status = 200;
          if (idx >= 0) {
            // Update name if provided
            const current = favs[idx] || {};
            favs[idx] = { ...current, name: name || current.name || '' };
          } else {
            favs.push(incoming);
            status = 201;
          }
          writeJson(FAVORITES_FILE, favs);
          res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(incoming));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'failed to save' }));
        }
      // Loại bỏ .catch()
      return;
    }
    if (parsed.pathname === '/api/favorites' && req.method === 'DELETE') {
      const body = req.body; // Sử dụng body đã được đọc
      try {
        const modeRaw = (body && typeof body.mode === 'string') ? body.mode : '';
        const mode = (modeRaw === 'mosaic' || modeRaw === 'single') ? modeRaw : '';
        const coordsIn = Array.isArray(body && body.coords) ? body.coords : [];
          const coords = coordsIn.map((c) => ({ x: Number(c && c.x), y: Number(c && c.y) }))
            .filter((c) => Number.isFinite(c.x) && Number.isFinite(c.y));
          if (!mode || !coords.length) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'invalid payload' }));
            return;
          }
          const favs = readJson(FAVORITES_FILE, []);
          const sameLoc = (a, b) => a && b && a.mode === b.mode && JSON.stringify(a.coords) === JSON.stringify(b.coords);
          const target = { mode, coords };
          const next = favs.filter((f) => !sameLoc(f, target));
          writeJson(FAVORITES_FILE, next);
          res.writeHead(204);
          res.end();
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'failed to delete' }));
        }
      // Loại bỏ .catch()
      return;
    }
    // Update global settings
    // New endpoint for GET /api/settings
    if (parsed.pathname === '/api/settings' && req.method === 'GET') {
      const settings = readJson(SETTINGS_FILE, {});
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(settings));
      return;
    }
    if (parsed.pathname === '/api/settings/update-interval' && req.method === 'POST') {
      const body = req.body; // Sử dụng body đã được đọc
      const updateIntervalMinutes = Number(body && body.updateIntervalMinutes);
      if (!Number.isFinite(updateIntervalMinutes) || updateIntervalMinutes <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'invalid updateIntervalMinutes' }));
        return;
      }
        const settings = readJson(SETTINGS_FILE, {});
        settings.updateIntervalMinutes = updateIntervalMinutes;
        writeJson(SETTINGS_FILE, settings);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      // Loại bỏ .catch()
      return;
    }
    if (parsed.pathname && /^\/api\/pixel\/([^\/]+)\/([^\/]+)$/.test(parsed.pathname) && req.method === 'POST') {
      const m = parsed.pathname.match(/^\/api\/pixel\/([^\/]+)\/([^\/]+)$/);
      const area = m && m[1] ? m[1] : '';
      const no = m && m[2] ? m[2] : '';
      const body = req.body; // Sử dụng body đã được đọc
      try {
        const colors = Array.isArray(body && body.colors) ? body.colors : [];
        const coords = Array.isArray(body && body.coords) ? body.coords : [];
        const t = body && typeof body.t === 'string' ? body.t : '';
        const jToken = body && typeof body.j === 'string' ? body.j : '';
        if (!colors.length || !coords.length || !t || !jToken) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'invalid payload' }));
          return;
        }
          // Use cf_clearance stored on the specific account matching this token
          const accounts = readJson(ACCOUNTS_FILE, []);
          const acc = accounts.find(a => a && typeof a.token === 'string' && a.token === jToken);
          const cf = acc && typeof acc.cf_clearance === 'string' ? acc.cf_clearance : '';
          
          const globalSettings = readJson(SETTINGS_FILE, {});
          const enableAntiDetection = globalSettings.enableAntiDetection || false;
          let currentAccountUserAgent = 'Mozilla/5.0'; // Default
          if (enableAntiDetection) {
            if (acc && acc.userAgent) {
              currentAccountUserAgent = acc.userAgent;
              if (typeof currentAccountUserAgent !== 'string' || !currentAccountUserAgent) {
                debugLog('WARNING', `Invalid User-Agent found for pixel POST for account ${acc.id}. Using default.`);
                currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
              }
            } else {
              debugLog('INFO', `Anti-detection enabled but no custom User-Agent for pixel POST for account ${acc ? acc.id : 'unknown'}. Using default.`);
            }
          }

          if (!cf || cf.length < 30) {
            try { deactivateAccountByToken(jToken); } catch {}
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'cf_clearance missing for account' }));
            return;
          }
          const remotePath = `/s0/pixel/${encodeURIComponent(area)}/${encodeURIComponent(no)}`;
          const payload = JSON.stringify({ colors, coords, t });
          
          try {
            const gotScraping = await getGotScrapingFn();
            if (gotScraping) {
              debugLog('OUTBOUND', 'proxy pixel POST begin (got-scraping)', { path: remotePath });
              const r = await gotScraping({
                url: 'https://backend.wplace.live' + remotePath,
                method: 'POST',
                headers: {
                  'User-Agent': currentAccountUserAgent, // Sử dụng userAgent từ tài khoản
                  'Accept': '*/*',
                  'Origin': 'https://wplace.live',
                  'Referer': 'https://wplace.live/',
                  'Content-Type': 'text/plain;charset=UTF-8',
                  'Cookie': `j=${jToken}; cf_clearance=${cf}`
                },
                body: payload,
                throwHttpErrors: false,
                decompress: true,
                agent: { https: HTTPS_AGENT },
                timeout: { request: 30000 }
              });
              const status = r && (r.statusCode || r.status) || 0;
              const text = r && (typeof r.body === 'string' ? r.body : (r.body ? String(r.body) : ''));
              debugLog('OUTBOUND_RESPONSE', 'proxy pixel POST end (got-scraping)', { status, bodyPreview: String(text || '').slice(0, 300) });
              if (status >= 500) {
                try { deactivateAccountByToken(jToken); } catch {}
              }
              res.writeHead(status || 502, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(text);
              return;
            }
          } catch {}
          const options = {
            hostname: 'backend.wplace.live',
            port: 443,
            path: remotePath,
            method: 'POST',
            agent: HTTPS_AGENT,
            headers: {
              'User-Agent': currentAccountUserAgent, // Sử dụng userAgent từ tài khoản
              'Accept': '*/*',
              'Origin': 'https://wplace.live',
              'Referer': 'https://wplace.live/',
              'Content-Type': 'text/plain;charset=UTF-8',
              'Cookie': `j=${jToken}; cf_clearance=${cf}`
            }
          };
          debugLog('OUTBOUND', 'proxy pixel POST begin', { path: remotePath, headers: { ...options.headers, Cookie: maskCookieHeader(options.headers.Cookie) } });
          const upstreamReq = https.request(options, (up) => {
            const chunks = [];
            up.on('data', (d) => chunks.push(d));
            up.on('end', () => {
              const encoding = ((up.headers && (up.headers['content-encoding'] || up.headers['Content-Encoding'])) || '').toLowerCase();
              let buf = Buffer.concat(chunks);
              if (encoding.includes('gzip')) { try { buf = zlib.gunzipSync(buf); } catch {} }
              else if (encoding.includes('deflate')) { try { buf = zlib.inflateRawSync(buf); } catch { try { buf = zlib.inflateSync(buf); } catch {} } }
              const text = buf.toString('utf8');
              const statusCode = up.statusCode || 0;
              debugLog('OUTBOUND_RESPONSE', 'proxy pixel POST end', { status: statusCode, bodyPreview: text.slice(0, 300) });
              if (statusCode >= 500) {
                try { deactivateAccountByToken(jToken); } catch {}
              }
              res.writeHead(statusCode || 502, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(text);
            });
          });
          upstreamReq.on('error', (e) => {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'upstream error', message: e && e.message ? e.message : String(e) }));
          });
          upstreamReq.write(payload);
          upstreamReq.end();
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'proxy failed' }));
        }
      // Loại bỏ .catch()
      return;
    }
    // Original pixel POST endpoint logic. Temporarily uncommented to restore.
    // New endpoint to send pixel data to worker pool
/*
    if (parsed.pathname === '/api/pixel' && req.method === 'POST') {
        const body = req.body;
        const jToken = body && typeof body.j === 'string' ? body.j : '';
        const pixelData = {
            area: body && body.area,
            no: body && body.no,
            colors: Array.isArray(body && body.colors) ? body.colors : [],
            coords: Array.isArray(body && body.coords) ? body.coords : [],
            t: body && typeof body.t === 'string' ? body.t : ''
        };

        if (!pixelData.colors.length || !pixelData.coords.length || !pixelData.t || !jToken) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'invalid payload' }));
            return;
        }

        const account = accountManager.findAccountByToken(jToken);
        if (!account) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'account not found' }));
            return;
        }

        // Add task to worker queue
        workerPool.addTask({ type: 'sendPixel', account, pixelData })
            .then(result => {
                if (result.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, message: 'Pixel sent successfully', response: result.response }));
                } else {
                    // Check if it's a 500 error for deactivation
                    if (result.status >= 500 && result.status < 600) {
                        deactivateAccountByToken(jToken); // Deactivate account on 5xx errors
                    }
                    res.writeHead(result.status || 500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: result.error }));
                }
            })
            .catch(e => {
                debugLog('ERROR', `Error processing pixel task for account ${account.name}:`, e.message);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: 'Internal server error processing pixel task' }));
            });
        return;
    }
        */

    // Proxy purchase to backend.wplace.live
    if (parsed.pathname === '/api/purchase' && req.method === 'POST') {
      const body = req.body; // Sử dụng body đã được đọc
      try {
        const productIdRaw = body && body.productId;
        const amountRaw = body && body.amount;
        const variantRaw = body && body.variant;
        const jToken = body && typeof body.j === 'string' ? body.j : '';
        const productId = Number(productIdRaw);
        const amount = Math.max(1, Number(amountRaw || 1));
        const variant = (variantRaw == null ? null : Number(variantRaw));
        if (!Number.isFinite(productId) || productId <= 0 || !jToken) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'invalid payload' }));
          return;
        }
          const accounts = readJson(ACCOUNTS_FILE, []);
          const acc = accounts.find(a => a && typeof a.token === 'string' && a.token === jToken);
          const cf = acc && typeof acc.cf_clearance === 'string' ? acc.cf_clearance : '';
        /*
          const acc = accountManager.findAccountByToken(jToken);
          const cf = acc && typeof acc.cf_clearance === 'string' ? acc.cf_clearance : '';
          */
          if (!cf || cf.length < 30) {
            try { deactivateAccountByToken(jToken); } catch {}
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'cf_clearance missing for account' }));
            return;
          }
          const remotePath = '/purchase';
          const payloadObj = { product: { id: productId, amount: amount } };
          if (Number.isFinite(variant)) { payloadObj.product.variant = variant; }
          const payload = JSON.stringify(payloadObj);

          try {
            const gotScraping = await getGotScrapingFn();
            if (gotScraping) {
              debugLog('OUTBOUND', 'proxy purchase POST begin (got-scraping)', { path: remotePath, body: payload });
              const r = await gotScraping({
                url: 'https://backend.wplace.live' + remotePath,
                method: 'POST',
                headers: {
                  'User-Agent': currentAccountUserAgent, // Sử dụng userAgent đã truyền vào hoặc từ tài khoản
                  'Accept': 'application/json, text/plain, */*',
                  'Origin': 'https://wplace.live',
                  'Referer': 'https://wplace.live/',
                  'Content-Type': 'application/json',
                  'Cookie': `j=${jToken}; cf_clearance=${cf}`
                },
                body: payload,
                throwHttpErrors: false,
                decompress: true,
                agent: { https: HTTPS_AGENT },
                timeout: { request: 30000 }
              });
              const status = r && (r.statusCode || r.status) || 0;
              const text = r && (typeof r.body === 'string' ? r.body : (r.body ? String(r.body) : ''));
              debugLog('OUTBOUND_RESPONSE', 'proxy purchase POST end (got-scraping)', { status, bodyPreview: String(text || '').slice(0, 300) });
              res.writeHead(status || 502, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(text);
              return;
            }
          } catch {}

          const globalSettings = readJson(SETTINGS_FILE, {});
          const enableAntiDetection = globalSettings.enableAntiDetection || false;
          let currentAccountUserAgent = 'Mozilla/5.0'; // Default
          if (enableAntiDetection) {
            if (acc && acc.userAgent) {
              currentAccountUserAgent = acc.userAgent;
              if (typeof currentAccountUserAgent !== 'string' || !currentAccountUserAgent) {
                debugLog('WARNING', `Invalid User-Agent found for purchase POST for account ${acc.id}. Using default.`);
                currentAccountUserAgent = 'Mozilla/5.0'; // Fallback to default
              }
            } else {
              debugLog('INFO', `Anti-detection enabled but no custom User-Agent for purchase POST for account ${acc ? acc.id : 'unknown'}. Using default.`);
            }
          }

          const options = {
            hostname: 'backend.wplace.live',
            port: 443,
            path: remotePath,
            method: 'POST',
            agent: HTTPS_AGENT,
            headers: {
              'User-Agent': currentAccountUserAgent, // Sử dụng userAgent đã truyền vào hoặc từ tài khoản
              'Accept': 'application/json, text/plain, */*',
              'Origin': 'https://wplace.live',
              'Referer': 'https://wplace.live/',
              'Content-Type': 'application/json',
              'Cookie': `j=${jToken}; cf_clearance=${cf}`
            }
          };
          debugLog('OUTBOUND', 'proxy purchase POST begin', { path: remotePath, headers: { ...options.headers, Cookie: maskCookieHeader(options.headers.Cookie) }, body: payload });
          const upstreamReq = https.request(options, (up) => {
            const chunks = [];
            up.on('data', (d) => chunks.push(d));
            up.on('end', () => {
              const encoding = ((up.headers && (up.headers['content-encoding'] || up.headers['Content-Encoding'])) || '').toLowerCase();
              let buf = Buffer.concat(chunks);
              if (encoding.includes('gzip')) { try { buf = zlib.gunzipSync(buf); } catch {} }
              else if (encoding.includes('deflate')) { try { buf = zlib.inflateRawSync(buf); } catch { try { buf = zlib.inflateSync(buf); } catch {} } }
              const text = buf.toString('utf8');
              const statusCode = up.statusCode || 0;
              debugLog('OUTBOUND_RESPONSE', 'proxy purchase POST end', { status: statusCode, bodyPreview: text.slice(0, 300) });
              res.writeHead(statusCode || 502, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(text);
            });
          });
          upstreamReq.on('error', (e) => {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'upstream error', message: e && e.message ? e.message : String(e) }));
          });
          upstreamReq.write(payload);
          upstreamReq.end();
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'proxy failed' }));
        }
      // Loại bỏ .catch()
      return;
    }
    if (parsed.pathname === '/api/accounts' && req.method === 'GET') {
      const accounts = readJson(ACCOUNTS_FILE, []);
      try {
        for (let i = 0; i < accounts.length; i++) {
          const a = accounts[i];
          const cf = a && typeof a.cf_clearance === 'string' ? a.cf_clearance : '';
          if (!cf || cf.length < 30) { accounts[i] = { ...a, active: false }; }
        }
        writeJson(ACCOUNTS_FILE, accounts);
      } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(accounts));
      return;
    }
/*
    if (parsed.pathname === '/api/accounts' && req.method === 'GET') {
      const accounts = accountManager.getAccounts(); // Use the getter from AccountManager
      try {
        for (let i = 0; i < accounts.length; i++) {
          const a = accounts[i];
          const cf = a && typeof a.cf_clearance === 'string' ? a.cf_clearance : '';
          if (!cf || cf.length < 30) { accountManager.setAccountStatus(a.id, 'inactive'); } // Use setAccountStatus
        }
        // accountManager.saveAccounts(); // saveAccounts() is called inside setAccountStatus
      } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(accounts));
      return;
    }
*/
    
    if (parsed.pathname && parsed.pathname.startsWith('/api/accounts/') && req.method === 'DELETE') {
      const idStr = parsed.pathname.split('/').pop();
      const id = Number(idStr);
      const accounts = readJson(ACCOUNTS_FILE, []);
      const next = accounts.filter(a => a.id !== id);
      writeJson(ACCOUNTS_FILE, next);
      res.writeHead(204); res.end();
      return;
    }
    if (parsed.pathname && parsed.pathname.startsWith('/api/accounts/') && (req.method === 'PUT' || req.method === 'PATCH')) {
      const idStr = parsed.pathname.split('/').pop();
      const id = Number(idStr);
      const body = req.body; // Sử dụng body đã được đọc
      const accounts = readJson(ACCOUNTS_FILE, []);
      const idx = accounts.findIndex(a => a.id === id);
      if (idx === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
        const updated = { ...accounts[idx] };
        if (body.hasOwnProperty('name')) updated.name = String(body.name || ''); // Cho phép name rỗng hoặc không có
        if (typeof body.token === 'string') updated.token = body.token;
        if (typeof body.cf_clearance === 'string') {
          const newCf = String(body.cf_clearance);
          const dup = accounts.find(a => a && a.id !== id && typeof a.cf_clearance === 'string' && a.cf_clearance === newCf);
          if (dup) {
            res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'cf_clearance already used' }));
            return;
          }
          updated.cf_clearance = newCf;
        }
      /*
      const id = Number(idStr);
      if (accountManager.deleteAccount(id)) { // Use deleteAccount
        res.writeHead(204); res.end();
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'not found' }));
      }
      return;
    }
    if (parsed.pathname && parsed.pathname.startsWith('/api/accounts/') && (req.method === 'PUT' || req.method === 'PATCH')) {
      const idStr = parsed.pathname.split('/').pop();
      const id = Number(idStr);
      const body = req.body; // Sử dụng body đã được đọc
      
      const existingAccount = accountManager.getAccounts().find(a => a.id === id);
      if (!existingAccount) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
        const updated = { ...existingAccount }; // Start with existing account
        if (body.hasOwnProperty('name')) updated.name = String(body.name || ''); // Cho phép name rỗng hoặc không có
        if (typeof body.token === 'string') updated.token = body.token;
        if (typeof body.cf_clearance === 'string') {
          const newCf = String(body.cf_clearance);
          // Check for duplicate cf_clearance across other accounts
          const dup = accountManager.getAccounts().find(a => a && a.id !== id && typeof a.cf_clearance === 'string' && a.cf_clearance === newCf);
          if (dup) {
            res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'cf_clearance already used' }));
            return;
          }
          updated.cf_clearance = newCf;
        }

        // Handle pixelTokens (add, remove, update)
        if (Array.isArray(body.pixelTokens)) {
            updated.pixelTokens = body.pixelTokens.map(t => String(t)); // Ensure they are strings
        }
        */

        const globalSettings = readJson(SETTINGS_FILE, {});
        const enableAntiDetection = globalSettings.enableAntiDetection || false;
        const regenerateAntiDetectionParams = body.regenerateAntiDetectionParams === true;

        if (enableAntiDetection && (regenerateAntiDetectionParams || !updated.userAgent || !updated.fingerprint)) {
            debugLog('INFO', `Generating new anti-detection params for account ${id}. Regenerate: ${regenerateAntiDetectionParams}`);
            const generatedParams = generateAntiDetectionParams();
            if (generatedParams) {
                updated.userAgent = generatedParams.userAgent;
                updated.fingerprint = generatedParams.fingerprint;
            } else {
                debugLog('WARNING', `Failed to generate anti-detection params for account ${id}. Using null values.`);
                updated.userAgent = null;
                updated.fingerprint = null;
            }
        } else if (!enableAntiDetection) {
            // Nếu anti-detection bị tắt, xóa userAgent và fingerprint
            updated.userAgent = null;
            updated.fingerprint = null;
        } else {
            // Nếu anti-detection bật và không yêu cầu regenerate, giữ nguyên các giá trị hiện có
            if (typeof body.userAgent === 'string') updated.userAgent = body.userAgent;
            if (typeof body.fingerprint === 'object') updated.fingerprint = body.fingerprint;
        }

        if (body.pixelRight != null) updated.pixelRight = body.pixelRight;
        if (typeof body.active === 'boolean') updated.active = body.active;
        if (body.autobuy === null) { updated.autobuy = null; }
        else if (body.autobuy === 'max' || body.autobuy === 'rec') { updated.autobuy = body.autobuy; }
        try {
          const cf = updated && typeof updated.cf_clearance === 'string' ? updated.cf_clearance : '';
          if (!cf || cf.length < 30) updated.active = false;
        } catch {}
        accounts[idx] = updated;
        writeJson(ACCOUNTS_FILE, accounts);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(updated));
      // Loại bỏ .catch()
      return;
    }
    // Settings endpoints removed; cf_clearance is now per-account
    if (parsed.pathname === '/api/accounts' && req.method === 'POST') {
      const body = req.body; // Sử dụng body đã được đọc
      const name = (body && body.name) ? String(body.name) : '';
      const token = (body && body.token) ? String(body.token) : '';
      const cf_clearance = (body && body.cf_clearance) ? String(body.cf_clearance) : '';
      // Các trường userAgent và fingerprint trong body không được sử dụng trực tiếp nữa,
      // mà sẽ được tạo ngẫu nhiên nếu enableAntiDetection bật.
      if (!name || !token || !cf_clearance || cf_clearance.length < 30) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'name, token and cf_clearance required' }));
        return;
      }
        const accounts = readJson(ACCOUNTS_FILE, []);
        try {
          const dup = accounts.find(a => a && typeof a.cf_clearance === 'string' && a.cf_clearance === cf_clearance);
          if (dup) {
            res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'cf_clearance already used' }));
            return;
          }
        } catch {}
/*        // Update account status if explicitly provided or derived
        if (typeof body.status === 'string') {
          updated.status = body.status;
          updated.active = (body.status === 'active');
        } else if (typeof body.active === 'boolean') { // Fallback for old 'active' property
          updated.active = body.active;
          updated.status = body.active ? 'active' : 'inactive';
        }
        
        // Update proxy settings
        if (typeof body.proxySettings === 'object' && body.proxySettings !== null) {
            updated.proxySettings = { ...updated.proxySettings, ...body.proxySettings };
        }

        // Update timestamps if provided (or handled by manager)
        if (typeof body.lastUsedTimestamp === 'number') updated.lastUsedTimestamp = body.lastUsedTimestamp;
        if (typeof body.lastRefresh === 'number') updated.lastRefresh = body.lastRefresh; // For manual refresh override

        if (accountManager.updateAccount(id, updated)) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'failed to update account' }));
        }
        return;
    }
    // Settings endpoints removed; cf_clearance is now per-account
    if (parsed.pathname === '/api/accounts' && req.method === 'POST') {
      const body = req.body; // Sử dụng body đã được đọc
      const name = (body && body.name) ? String(body.name) : '';
      const token = (body && body.token) ? String(body.token) : '';
      const cf_clearance = (body && body.cf_clearance) ? String(body.cf_clearance) : '';
      // Các trường userAgent và fingerprint trong body không được sử dụng trực tiếp nữa,
      // mà sẽ được tạo ngẫu nhiên nếu enableAntiDetection bật.
      if (!name || !token || !cf_clearance || cf_clearance.length < 30) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'name, token and cf_clearance required' }));
        return;
      }
        const dup = accountManager.getAccounts().find(a => a && typeof a.cf_clearance === 'string' && a.cf_clearance === cf_clearance);
        if (dup) {
            res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'cf_clearance already used' }));
            return;
        }
*/
        const globalSettings = readJson(SETTINGS_FILE, {});
        const enableAntiDetection = globalSettings.enableAntiDetection || false;

        let generatedUserAgent = null;
        let generatedFingerprint = null;
        if (enableAntiDetection) {
            const generatedParams = generateAntiDetectionParams();
            if (generatedParams) {
                generatedUserAgent = generatedParams.userAgent;
                generatedFingerprint = generatedParams.fingerprint;
            } else {
                debugLog('WARNING', 'Failed to generate anti-detection params for new account. Using null values.');
            }
        }
        
        const account = {
          id: Date.now(),
          name,
          token,
          cf_clearance,
          userAgent: generatedUserAgent, // Sử dụng userAgent đã tạo hoặc null
          fingerprint: generatedFingerprint, // Sử dụng fingerprint đã tạo hoặc null
          pixelCount: null,
          pixelMax: null,
          droplets: null,
          extraColorsBitmap: null,
          active: false,
          autobuy: null,
          lastRefresh: Date.now()
        };
        try {
          // Khi tạo tài khoản mới, fetchMe không nên sử dụng userAgent ngẫu nhiên vì có thể chưa hợp lệ.
          // Thay vào đó, nó nên sử dụng userAgent mặc định hoặc userAgent từ tài khoản nếu có.
          const me = await fetchMe(cf_clearance, token, account.userAgent); // Sử dụng generatedUserAgent nếu có
          if (me && me.charges) {
            account.pixelCount = Number(me.charges.count);
            account.pixelMax = Number(me.charges.max);
            account.active = true;
          }
          if (me && Object.prototype.hasOwnProperty.call(me, 'droplets')) {
            const d = Number(me.droplets);
            account.droplets = Number.isFinite(d) ? Math.floor(d) : null;
          }
          if (me && Object.prototype.hasOwnProperty.call(me, 'extraColorsBitmap')) {
            const b = Number(me.extraColorsBitmap);
            account.extraColorsBitmap = Number.isFinite(b) ? Math.floor(b) : null;
          }
          if (me && me.name && !name) account.name = String(me.name);
        } catch {}
        try { if (!account.cf_clearance || account.cf_clearance.length < 30) account.active = false; } catch {}
        accounts.push(account);
        writeJson(ACCOUNTS_FILE, accounts);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(account));
      // Loại bỏ .catch()
      return;
    }
    if (parsed.pathname && /^\/api\/accounts\/\d+\/refresh$/.test(parsed.pathname) && req.method === 'POST') {
      const parts = parsed.pathname.split('/');
      const id = Number(parts[3]);
      const accounts = readJson(ACCOUNTS_FILE, []);
      const idx = accounts.findIndex(a => a.id === id);
      if (idx === -1) { res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'not found' })); return; }
      const acct = accounts[idx];
      const cf = acct && typeof acct.cf_clearance === 'string' ? acct.cf_clearance : '';
      if (!cf || cf.length < 30) {
        try { accounts[idx] = { ...acct, active: false }; writeJson(ACCOUNTS_FILE, accounts); } catch {}
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'cf_clearance missing for account' })); return; }
      (async () => {
        debugLog('OUTBOUND', 'refresh: begin got-scraping /me fetch', { accountId: id, name: acct && acct.name ? String(acct.name) : undefined });
        let me = null;
        try {
          me = await fetchMe(cf, acct.token, acct.userAgent);
        } catch (err) {
          const msg = (err && err.message) ? String(err.message) : String(err);
          const code = (err && err.code) ? String(err.code) : '';
          if (!(code === 'ECONNRESET' || (msg && msg.toUpperCase && msg.toUpperCase().includes('ECONNRESET')))) {
            console.log('refresh fetch error:', msg);
          }
        }
        debugLog('OUTBOUND_RESPONSE', 'refresh: got-scraping result', {
          ok: !!me,
          meta: me ? {
            name: me.name,
            charges: me.charges ? { count: me.charges.count, max: me.charges.max } : undefined,
            droplets: Object.prototype.hasOwnProperty.call(me, 'droplets') ? me.droplets : undefined,
            extraColorsBitmap: Object.prototype.hasOwnProperty.call(me, 'extraColorsBitmap') ? me.extraColorsBitmap : undefined
          } : null
        });
        if (me && me.charges) {
          
          acct.pixelCount = Math.floor(Number(me.charges.count));
          acct.pixelMax = Math.floor(Number(me.charges.max));
          acct.active = true; // Keep active if refresh successful
        } else {
          acct.active = false; // Deactivate if refresh fails
        }
        if (me && Object.prototype.hasOwnProperty.call(me, 'droplets')) {
          const d = Number(me.droplets);
          acct.droplets = Number.isFinite(d) ? Math.floor(d) : null;
        }
        if (me && Object.prototype.hasOwnProperty.call(me, 'extraColorsBitmap')) {
          const b = Number(me.extraColorsBitmap);
          acct.extraColorsBitmap = Number.isFinite(b) ? Math.floor(b) : null;
        }
        acct.lastRefresh = now; // Update last refresh time
        updatedAccounts = true;
        accounts[idx] = acct;
        writeJson(ACCOUNTS_FILE, accounts);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(acct));
      })().catch(() => {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'upstream error' }));
      })(); // đóng async function tự gọi
      return;
    }
    
    const publicPath = path.resolve(process.cwd(), 'public');
    const tryFile = path.resolve(publicPath, '.' + parsed.pathname);
    if (tryFile.startsWith(publicPath) && fs.existsSync(tryFile) && fs.statSync(tryFile).isFile()) {
      const ext = path.extname(tryFile).toLowerCase();
      const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : ext === '.png' ? 'image/png' : 'application/octet-stream';
      try {
        const buf = fs.readFileSync(tryFile);
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        res.end(buf);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Dosya servis edilemedi.');
      }
      return;
    }
    if (parsed.pathname === '/api/debug' && req.method === 'POST') {
      const body = req.body;
      const enable = body && typeof body.enable === 'boolean' ? body.enable : null;
      const mask = body && typeof body.mask === 'boolean' ? body.mask : null;
      if (enable !== null) {
        DEBUG = enable;
        console.log(`Debug mode set to: ${DEBUG}`);
      }
      if (mask !== null) {
        DEBUG_MASK = mask;
        console.log(`Debug mask set to: ${DEBUG_MASK}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ DEBUG, DEBUG_MASK }));
      return;
    }
    if (parsed.pathname === '/favicon.ico') {
      res.writeHead(204); res.end(); return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });
  server.listen(port, host, () => {
    console.log(`Listening on http://${host}:${port}`);
  });
}

function main() {
  const args = process.argv.slice(2);
  
  let port = 3000;
  let host = 'localhost';
  let getMe = false;
  let cookieHeader = null;
  let cfOpt = null;
  let jOpt = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--get-me') getMe = true;
    else if (a.startsWith('--cookie=')) cookieHeader = a.slice('--cookie='.length);
    else if (a === '--cookie' && i + 1 < args.length) { cookieHeader = args[++i]; }
    else if (a.startsWith('--cf=')) cfOpt = a.slice('--cf='.length);
    else if (a === '--cf' && i + 1 < args.length) { cfOpt = args[++i]; }
    else if (a.startsWith('--j=')) jOpt = a.slice('--j='.length);
    else if (a === '--j' && i + 1 < args.length) { jOpt = args[++i]; }
    else if (a.startsWith('--port=')) port = parseInt(a.split('=')[1], 10) || port;
    else if (a === '--port' && i + 1 < args.length) { port = parseInt(args[++i], 10) || port; }
    else if (a.startsWith('--host=')) host = a.split('=')[1] || host;
  }

  if (getMe) {
    requestMeLikePython({ cookie: cookieHeader, cf_clearance: cfOpt, j: jOpt })
      .then(() => {})
      .catch((err) => {
        const msg = (err && err.message) ? String(err.message) : String(err);
        const code = (err && err.code) ? String(err.code) : '';
        if (!(code === 'ECONNRESET' || (msg && msg.toUpperCase && msg.toUpperCase().includes('ECONNRESET')))) {
          console.error('Request failed:', msg);
          process.exitCode = 1;
        }
      });
    return;
  }
 
  startServer(port, host);
  startAccountRefreshScheduler(); // Start the scheduler once when the application starts
}

let refreshSchedulerInterval = null;
async function startAccountRefreshScheduler() {
  if (refreshSchedulerInterval) {
    clearInterval(refreshSchedulerInterval);
  }
  const settings = readJson(SETTINGS_FILE, {});
  const intervalMinutes = Number(settings.updateIntervalMinutes || 5);
  const intervalMs = Math.max(1000, intervalMinutes * 60 * 1000); // Minimum 1 second

  console.log(`Account refresh scheduler started with interval: ${intervalMinutes} minutes (${intervalMs}ms)`);

  refreshSchedulerInterval = setInterval(async () => {
    // const accounts = accountManager.getAccounts(); // Already get the latest accounts at the beginning of the function
    const accounts = readJson(ACCOUNTS_FILE, []);
    const now = Date.now();
    let updatedAccounts = false;

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      // Only refresh active accounts that have a token and whose refresh interval has passed
      if (account.active && account.token && (now - (account.lastRefresh || 0)) >= intervalMs) {
        console.log(`Refreshing account: ${account.name}`);
        const cf = account.cf_clearance;
        try {
          const me = await fetchMe(cf, account.token, account.userAgent); // Truyền userAgent
          if (me && me.charges) {
            account.pixelCount = Math.floor(Number(me.charges.count));
            account.pixelMax = Math.floor(Number(me.charges.max));
            account.active = true; // Keep active if refresh successful
          } else {
            account.active = false; // Deactivate if refresh fails
          }
          if (me && Object.prototype.hasOwnProperty.call(me, 'droplets')) {
            const d = Number(me.droplets);
            account.droplets = Number.isFinite(d) ? Math.floor(d) : null;
          }
          if (me && Object.prototype.hasOwnProperty.call(me, 'extraColorsBitmap')) {
            const b = Number(me.extraColorsBitmap);
            account.extraColorsBitmap = Number.isFinite(b) ? Math.floor(b) : null;
          }
          account.lastRefresh = now; // Update last refresh time
          updatedAccounts = true;
        } catch (err) {
          console.error(`Error refreshing account ${account.name}: ${err.message}`);
          account.active = false; // Deactivate on error
          account.lastRefresh = now; // Still update last refresh to avoid continuous retries
          updatedAccounts = true;
        }
      }
    }

    if (updatedAccounts) {
      writeJson(ACCOUNTS_FILE, accounts);
    }
  }, intervalMs);
}
 
if (require.main === module) {
  main();
}
