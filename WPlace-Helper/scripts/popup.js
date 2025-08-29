document.addEventListener('DOMContentLoaded', function() {
  const tokenInput = document.getElementById('token-input');
  const copyButton = document.getElementById('copy-button');
  const statusDiv = document.getElementById('status');
  const cookieJ = document.getElementById('cookie-j');
  const copyJ = document.getElementById('copy-j');
  const cookieCfClearance = document.getElementById('cookie-cf-clearance');
  const copyCfClearance = document.getElementById('copy-cf-clearance');
  const worldXInput = document.getElementById('world-x');
  const worldYInput = document.getElementById('world-y');
  const copyWorldX = document.getElementById('copy-world-x');
  const copyWorldY = document.getElementById('copy-world-y');
  const toggleCapture = document.getElementById('toggle-capture');
  const toggleWrap = document.getElementById('toggle-capture-wrap');
  const toggleLabel = document.getElementById('toggle-capture-label');

  const toggleAntiDetection = document.getElementById('toggle-anti-detection');
  const toggleAntiDetectionWrap = document.getElementById('toggle-anti-detection-wrap');
  const toggleAntiDetectionLabel = document.getElementById('toggle-anti-detection-label');

  // const quickAddInput = document.getElementById('quick-add-input'); // Bị loại bỏ vì dữ liệu j và cf_clearance giờ được lấy tự động từ cookies
  const quickAddButton = document.getElementById('quick-add-button');
  const quickAddNameInput = document.getElementById('quick-add-name-input'); // Được giữ lại để cho phép người dùng nhập tên tài khoản thủ công

  function setStatus(text) {
    if (!statusDiv) return;
    statusDiv.textContent = text || '';
    if (text) setTimeout(() => { if (statusDiv) statusDiv.textContent = ''; }, 2000);
  }

  chrome.storage.local.get(['wplace_token', 'wplace_world_x', 'wplace_world_y'], function(result) {
    if (!tokenInput) return;
    if (result && result.wplace_token) {
      tokenInput.value = result.wplace_token;
    }
    if (worldXInput) worldXInput.value = (result && result.wplace_world_x) ? result.wplace_world_x : '-';
    if (worldYInput) worldYInput.value = (result && result.wplace_world_y) ? result.wplace_world_y : '-';
  });

  chrome.storage.local.get(['wplace_enabled', 'enableAntiDetection'], function(result) {
    const captureEnabled = result && typeof result.wplace_enabled === 'boolean' ? result.wplace_enabled : true;
    if (toggleCapture) toggleCapture.checked = captureEnabled;
    if (toggleWrap) toggleWrap.setAttribute('data-checked', String(!!captureEnabled));
    if (toggleLabel) toggleLabel.textContent = captureEnabled ? 'On' : 'Off';

    const antiDetectionEnabled = result && typeof result.enableAntiDetection === 'boolean' ? result.enableAntiDetection : false;
    if (toggleAntiDetection) toggleAntiDetection.checked = antiDetectionEnabled;
    if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(!!antiDetectionEnabled));
    if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = antiDetectionEnabled ? 'On' : 'Off';
  });

  chrome.storage.onChanged.addListener(function(changes, area) {
    if (!tokenInput) return;
    if (area === 'local' && changes && changes.wplace_token) {
      tokenInput.value = changes.wplace_token.newValue || 'No token captured yet...';
    }
    if (area === 'local' && (changes.wplace_world_x || changes.wplace_world_y)) {
      if (worldXInput && changes.wplace_world_x) {
        worldXInput.value = changes.wplace_world_x.newValue || '-';
      }
      if (worldYInput && changes.wplace_world_y) {
        worldYInput.value = changes.wplace_world_y.newValue || '-';
      }
    }
  });

  if (toggleCapture) {
    toggleCapture.addEventListener('change', function() {
      const enabled = !!toggleCapture.checked;
      if (toggleWrap) toggleWrap.setAttribute('data-checked', String(enabled));
      if (toggleLabel) toggleLabel.textContent = enabled ? 'On' : 'Off';
      chrome.storage.local.set({ wplace_enabled: enabled });
    });
  }

  if (toggleAntiDetection) {
    toggleAntiDetection.addEventListener('change', function() {
      const enabled = !!toggleAntiDetection.checked;
      if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(enabled));
      if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = enabled ? 'On' : 'Off';
      chrome.storage.local.set({ enableAntiDetection: enabled });
    });
  }

  if (copyButton) {
    copyButton.addEventListener('click', function() {
      if (!tokenInput) return;
      if (tokenInput.value && tokenInput.value !== 'No token captured yet...') {
        navigator.clipboard.writeText(tokenInput.value).then(function() {
          setStatus('Pixel token copied!');
          tokenInput.value = 'No token captured yet...';
          chrome.storage.local.remove('wplace_token');
        });
      }
    });
  }

  function valOrDash(v) { return (v && String(v).trim()) ? String(v).trim() : '-'; }

  if (copyWorldX) {
    copyWorldX.addEventListener('click', function() {
      const xVal = worldXInput ? worldXInput.value : '';
      const value = valOrDash(xVal);
      if (value !== '-') {
        navigator.clipboard.writeText(value).then(function() {
          setStatus('World X copied!');
        });
      }
    });
  }

  if (copyWorldY) {
    copyWorldY.addEventListener('click', function() {
      const yVal = worldYInput ? worldYInput.value : '';
      const value = valOrDash(yVal);
      if (value !== '-') {
        navigator.clipboard.writeText(value).then(function() {
          setStatus('World Y copied!');
        });
      }
    });
  }

  function loadCookies() {
    if (!cookieJ || !cookieCfClearance) return;
    chrome.cookies.getAll({ domain: 'wplace.live' }, function(cookies) {
      try {
        const jCookie = (cookies || []).find(c => c && c.name === 'j');
        cookieJ.value = jCookie && jCookie.value ? jCookie.value : 'Not found';

        const cfCookie = (cookies || []).find(c => c && c.name === 'cf_clearance');
        cookieCfClearance.value = cfCookie && cfCookie.value ? cfCookie.value : 'Not found';
      } catch (e) {
        cookieJ.value = 'Not found';
        cookieCfClearance.value = 'Not found';
      }
    });
  }
  loadCookies();

  if (copyJ) {
    copyJ.addEventListener('click', function() {
      if (!cookieJ) return;
      if (cookieJ.value && cookieJ.value !== 'Not found') {
        navigator.clipboard.writeText(cookieJ.value).then(function() {
          setStatus('Account token copied!');
          loadCookies(); // Cập nhật lại UI sau khi copy (để hiển thị Not found nếu token bị xóa)
        });
      }
    });
  }

  if (copyCfClearance) {
    copyCfClearance.addEventListener('click', function() {
      if (!cookieCfClearance) return;
      if (cookieCfClearance.value && cookieCfClearance.value !== 'Not found') {
        navigator.clipboard.writeText(cookieCfClearance.value).then(function() {
          setStatus('Cloudflare token copied!');
          loadCookies(); // Cập nhật lại UI sau khi copy
        });
      }
    });
  }

  if (quickAddButton) {
    quickAddButton.addEventListener('click', async function() {
      // const inputText = quickAddInput.value.trim(); // Bị loại bỏ vì dữ liệu j và cf_clearance giờ được lấy tự động từ cookies
      // const accountName = quickAddNameInput.value.trim(); // Dòng này được di chuyển xuống dưới để lấy giá trị sau khi có thể đã có existingAccount
      let jToken = '';
      let cfClearance = '';

      // Extract j and cf_clearance from input text - Phần này bị loại bỏ vì dữ liệu j và cf_clearance giờ được lấy tự động từ cookies
      /*
      const jMatch = inputText.match(/\bj=([^;]+)/);
      if (jMatch) {
        jToken = jMatch[1];
      }
      const cfMatch = inputText.match(/cf_clearance=([^;]+)/);
      if (cfMatch) {
        cfClearance = cfMatch[1];
      }
      */

      // Tự động lấy j và cf_clearance từ cookies
      const cookies = await new Promise(resolve => {
        chrome.cookies.getAll({ domain: 'wplace.live' }, function(cks) {
          resolve(cks);
        });
      });

      const jCookie = (cookies || []).find(c => c && c.name === 'j');
      if (jCookie) {
        jToken = jCookie.value;
      }

      const cfCookie = (cookies || []).find(c => c && c.name === 'cf_clearance');
      if (cfCookie) {
        cfClearance = cfCookie.value;
      }

      if (!jToken && !cfClearance) {
        setStatus('Không tìm thấy token "j" hoặc "cf_clearance" trong cookies. Vui lòng đăng nhập vào wplace.live.');
        return;
      }
      if (!cfClearance || cfClearance.length < 30) {
        setStatus('cf_clearance is required (min 30 chars).');
        return;
      }
      
      try {
        const accounts = await fetch('http://localhost:3000/api/accounts').then(res => res.json());
        let existingAccount = null;

        // Check if account with same jToken or cfClearance already exists
        if (jToken) {
          existingAccount = accounts.find(acc => acc.token === jToken);
        }
        if (!existingAccount && cfClearance) {
          existingAccount = accounts.find(acc => acc.cf_clearance === cfClearance);
        }

        let method = 'POST';
        let url = 'http://localhost:3000/api/accounts';
        let body = { 
          token: jToken,
          cf_clearance: cfClearance,
          userAgent: navigator.userAgent || null
        };
        // Lấy tên từ quick-add-name-input, nếu có
        const accountNameInput = document.getElementById('quick-add-name-input');
        let accountName = accountNameInput ? accountNameInput.value.trim() : '';

        // Logic xử lý tên tài khoản
        if (existingAccount) {
          method = 'PUT';
          url = `http://localhost:3000/api/accounts/${existingAccount.id}`;
          // Nếu có tên mới nhập vào, sử dụng tên đó. Nếu không, giữ nguyên tên cũ của tài khoản.
          body.name = accountName || existingAccount.name;
          if (!jToken) {
            body.token = existingAccount.token;
          }
        } else {
          // Nếu là tạo mới tài khoản
          if (accountName) {
            // Nếu có tên nhập vào, sử dụng tên đó
            body.name = accountName;
          } else {
            // Nếu không có tên nhập vào, cần lấy username.
            // HIỆN TẠI TÔI KHÔNG THỂ XÁC ĐỊNH CÁCH "BLUE MARBLE" LẤY USERNAME.
            // Tạm thời sử dụng tên mặc định dựa trên token.
            // Nếu bạn muốn lấy username tự động, vui lòng hướng dẫn cách lấy username từ API hoặc cookie.
            body.name = jToken ? `j_${jToken.substring(0, 8)}` : `cf_${cfClearance.substring(0, 8)}`; // Tên mặc định
          }
        }


        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await response.json();
        if (response.ok) {
          setStatus('Tài khoản đã được lưu thành công!');
          // Xóa nội dung input sau khi lưu thành công (nếu có)
          const accountNameInput = document.getElementById('quick-add-name-input');
          if (accountNameInput) {
            accountNameInput.value = ''; // Xóa tên đã nhập sau khi lưu
          }
          // chrome.runtime.sendMessage({ type: 'refresh_main_app_accounts' });
        } else {
          setStatus(`Error: ${data.error || 'Something went wrong.'}`);
        }
      } catch (error) {
        setStatus(`Network Error: ${error.message}`);
      }
    });
  }
});
