document.addEventListener('DOMContentLoaded', function() {
  const tokenInput = document.getElementById('token-input');
  const copyButton = document.getElementById('copy-button');
  const statusDiv = document.getElementById('status');
  const cookieJ = document.getElementById('cookie-j');
  const copyJ = document.getElementById('copy-j');
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
 
// const quickAddInput = document.getElementById('quick-add-input'); // Removed because j and cf_clearance data is now automatically retrieved from cookies
  const quickAddButton = document.getElementById('quick-add-button');
  const quickAddNameInput = document.getElementById('quick-add-name-input'); // Retained to allow users to manually enter account names
 
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
    let captureEnabled = result && typeof result.wplace_enabled === 'boolean' ? result.wplace_enabled : true;
    // If wplace_enabled is not in storage, default to true and save it to storage
    if (result === undefined || typeof result.wplace_enabled === 'undefined') {
        chrome.storage.local.set({ wplace_enabled: true });
        captureEnabled = true; // Ensure local variable is also updated
    }
    if (toggleCapture) toggleCapture.checked = captureEnabled;
    if (toggleWrap) toggleWrap.setAttribute('data-checked', String(!!captureEnabled));
    if (toggleLabel) toggleLabel.textContent = captureEnabled ? 'On' : 'Off';
 
    const antiDetectionEnabled = false; // Always set to false to disable anti-detection feature
  //const antiDetectionEnabled = result && typeof result.enableAntiDetection === 'boolean' ? result.enableAntiDetection : false;
    if (toggleAntiDetection) toggleAntiDetection.checked = antiDetectionEnabled;
    if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(!!antiDetectionEnabled));
    if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = 'Off'; // Always show as Off
  //if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = antiDetectionEnabled ? 'On' : 'Off';
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
      // Prevent user from enabling anti-detection feature
      toggleAntiDetection.checked = false;
      if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(false));
      if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = 'Off';
      chrome.storage.local.set({ enableAntiDetection: false });
/*      const enabled = !!toggleAntiDetection.checked;
      if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(enabled));
      if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = enabled ? 'On' : 'Off';
      chrome.storage.local.set({ enableAntiDetection: enabled }); */
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
    if (!cookieJ) return;
    chrome.cookies.getAll({ domain: 'wplace.live', name: 'j' }, function(cookies) {
      try {
        const jCookie = (cookies || []).find(c => c && c.name === 'j');
        cookieJ.value = jCookie && jCookie.value ? jCookie.value : 'Not found';
      } catch (e) {
        cookieJ.value = 'Not found';
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
          loadCookies(); // Update UI after copying (to show Not found if token is deleted)
        });
      }
    });
  }
 
 
  const quickAddCfClearanceInput = document.getElementById('quick-add-cf-clearance-input');
  const pasteCfClearanceButton = document.getElementById('paste-cf-clearance-button');
  if (pasteCfClearanceButton) {
    pasteCfClearanceButton.addEventListener('click', async function() {
      try {
        const text = await navigator.clipboard.readText();
        if (quickAddCfClearanceInput) {
          quickAddCfClearanceInput.value = text.trim();
          setStatus('Pasted.');
        }
      } catch (err) {
        setStatus('Clipboard read failed: ' + err.message);
      }
    });
  }
 
  if (quickAddButton) {
    quickAddButton.addEventListener('click', async function() {
      let jToken = '';
      let cfClearance = '';
 
      // Automatically retrieve jToken from cookies
      const jCookie = await new Promise(resolve => {
        chrome.cookies.getAll({ domain: 'wplace.live', name: 'j' }, function(cks) {
          resolve(cks && cks[0] ? cks[0] : null);
        });
      });
      if (jCookie) {
        jToken = jCookie.value;
      }
      
      // Get cfClearance from input box
      if (quickAddCfClearanceInput) {
          cfClearance = quickAddCfClearanceInput.value.trim();
      }
 
      if (!jToken) {
        setStatus('J token not found. Login or enter manually.');
        return;
      }
      if (!cfClearance || cfClearance.length < 30) {
        setStatus('cf_clearance required (min 30 chars).');
        return;
      }
      
      try {
        const accounts = await fetch('http://localhost:3000/api/accounts').then(res => res.json());
        let existingAccount = null;
 
        // Check if account with same jToken exists
        if (jToken) {
          existingAccount = accounts.find(acc => acc.token === jToken);
        }
        if (!existingAccount && cfClearance) { // Check based on cfClearance if jToken does not match
          existingAccount = accounts.find(acc => acc.cf_clearance === cfClearance);
        }
 
        let method = 'POST';
        let url = 'http://localhost:3000/api/accounts';
        let body = {
          token: jToken,
          cf_clearance: cfClearance,
          userAgent: navigator.userAgent || null
        };
        // Get name from quick-add-name-input, if available
        const accountNameInput = document.getElementById('quick-add-name-input');
        let accountName = accountNameInput ? accountNameInput.value.trim() : '';
 
        // Account name handling logic
        if (existingAccount) {
          method = 'PUT';
          url = `http://3000/api/accounts/${existingAccount.id}`;
          // If a new name is entered, use it. Otherwise, keep the account's old name.
          body.name = accountName || existingAccount.name;
          if (!jToken) {
            body.token = existingAccount.token;
          }
          // Ensure cf_clearance is updated if existingAccount does not have cf_clearance or a new cf_clearance is different
          if (!existingAccount.cf_clearance || existingAccount.cf_clearance !== cfClearance) {
            body.cf_clearance = cfClearance;
          }
        } else {
          // If creating a new account
          if (accountName) {
            // If a name is entered, use it
            body.name = accountName;
          } else {
            // If no name is entered, username is needed.
            // Temporarily use a default name based on the token.
            body.name = jToken ? `j_${jToken.substring(0, 8)}` : `cf_${cfClearance.substring(0, 8)}`; // Default name
          }
        }
 
 
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
 
        const data = await response.json();
        if (response.ok) {
          // If the account name was not provided manually and meta.name is available from the backend response, use it
          if (!accountName && data.name) { // Assuming 'name' field in backend response is the desired meta.name
            body.name = data.name; // Use name from backend response
          }
          setStatus('Account saved!');
          // Clear input content after successful save (if any)
          const accountNameInput = document.getElementById('quick-add-name-input');
          if (accountNameInput) {
            accountNameInput.value = ''; // Clear entered name after saving
          }
          // chrome.runtime.sendMessage({ type: 'refresh_main_app_accounts' });
        } else {
          setStatus(`Error: ${data.error || 'Unknown error.'}`);
        }
      } catch (error) {
        setStatus(`Network error: ${error.message}`);
      }
    });
  }
});