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

  // const toggleAntiDetection = document.getElementById('toggle-anti-detection');
  // const toggleAntiDetectionWrap = document.getElementById('toggle-anti-detection-wrap');
  // const toggleAntiDetectionLabel = document.getElementById('toggle-anti-detection-label');
  
  const quickAddCfClearanceInput = document.getElementById('quick-add-cf-clearance-input');
  const pasteCfClearanceButton = document.getElementById('paste-cf-clearance-button');
  const toggleSeassonCfClearance = document.getElementById('toggle-seasson-cf-clearance');
  const toggleSeassonCfClearanceWrap = document.getElementById('toggle-seasson-cf-clearance-wrap');
  const toggleSeassonCfClearanceLabel = document.getElementById('toggle-seasson-cf-clearance-label');
 
// const quickAddInput = document.getElementById('quick-add-input'); // Removed because j and cf_clearance data is now automatically retrieved from cookies
  const quickAddButton = document.getElementById('quick-add-button');
  const quickAddNameInput = document.getElementById('quick-add-name-input'); // Retained to allow users to manually enter account names
 
  function setStatus(text) {
    if (!statusDiv) return;
    statusDiv.textContent = text || '';
    if (text) setTimeout(() => { if (statusDiv) statusDiv.textContent = ''; }, 2000);
  }
 
  // Merge chrome.storage.local.get calls into one
  chrome.storage.local.get(['wplace_token', 'wplace_world_x', 'wplace_world_y', 'wplace_cf_clearance', 'wplace_enabled', 'enableAntiDetection', 'seasson_cf_clearance_enabled'], function(result) {
    // Update Pixel Token and World X/Y
    if (tokenInput) {
      tokenInput.value = (result && result.wplace_token) ? result.wplace_token : 'No token captured yet...';
    }
    if (worldXInput) {
      worldXInput.value = (result && result.wplace_world_x) ? result.wplace_world_x : '-';
    }
    if (worldYInput) {
      worldYInput.value = (result && result.wplace_world_y) ? result.wplace_world_y : '-';
    }
    // Update quickAddCfClearanceInput
    if (quickAddCfClearanceInput) {
      quickAddCfClearanceInput.value = (result && result.wplace_cf_clearance) ? result.wplace_cf_clearance : '';
    }
 
    // Update "Enable capture and block" status
    let captureEnabled = result && typeof result.wplace_enabled === 'boolean' ? result.wplace_enabled : true;
    if (result === undefined || typeof result.wplace_enabled === 'undefined') {
        chrome.storage.local.set({ wplace_enabled: true });
        captureEnabled = true;
    }
    if (toggleCapture) toggleCapture.checked = captureEnabled;
    if (toggleWrap) toggleWrap.setAttribute('data-checked', String(!!captureEnabled));
    if (toggleLabel) toggleLabel.textContent = captureEnabled ? 'On' : 'Off';
 
    // Update Anti-Detection status (always off)
    const antiDetectionEnabled = false; // Always set to false to disable anti-detection feature
    // const antiDetectionEnabled = result && typeof result.enableAntiDetection === 'boolean' ? result.enableAntiDetection : false;
    // if (toggleAntiDetection) toggleAntiDetection.checked = antiDetectionEnabled;
    // if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(!!antiDetectionEnabled));
    // if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = 'Off';
 
    // Update Seasson Cf_Clearance status (always off)
    const seassonCfClearanceEnabled = false; // Always set to false to disable this feature for now
    if (toggleSeassonCfClearance) toggleSeassonCfClearance.checked = seassonCfClearanceEnabled;
    if (toggleSeassonCfClearanceWrap) toggleSeassonCfClearanceWrap.setAttribute('data-checked', String(seassonCfClearanceEnabled));
    if (toggleSeassonCfClearanceLabel) toggleSeassonCfClearanceLabel.textContent = 'Off';
  });
 
  chrome.storage.onChanged.addListener(function(changes, area) {
    if (!tokenInput) return;
     if (area === 'local' && changes) {
      if (changes.wplace_token) {
        tokenInput.value = changes.wplace_token.newValue || 'No token captured yet...';
      }
      if (changes.wplace_world_x) {
        if (worldXInput) worldXInput.value = changes.wplace_world_x.newValue || '-';
      }
      if (changes.wplace_world_y) {
        if (worldYInput) worldYInput.value = changes.wplace_world_y.newValue || '-';
      }
      if (changes.wplace_cf_clearance) {
        if (quickAddCfClearanceInput) quickAddCfClearanceInput.value = changes.wplace_cf_clearance.newValue || '';
        if (changes.wplace_cf_clearance.newValue) {
          setStatus('CF_Clearance captured!'); // Show notification when cf_clearance changes
        }
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


  // if (toggleAntiDetection) {
  //   toggleAntiDetection.addEventListener('change', function() {
  //     // Prevent user from enabling anti-detection feature
  //     toggleAntiDetection.checked = false;
  //     if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(false));
  //     if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = 'Off';
  //     chrome.storage.local.set({ enableAntiDetection: false });
  // /*      const enabled = !!toggleAntiDetection.checked;
  //     if (toggleAntiDetectionWrap) toggleAntiDetectionWrap.setAttribute('data-checked', String(enabled));
  //     if (toggleAntiDetectionLabel) toggleAntiDetectionLabel.textContent = enabled ? 'On' : 'Off';
  //     chrome.storage.local.set({ enableAntiDetection: enabled }); */
  //   });
  // }

 if (toggleSeassonCfClearance) {
   toggleSeassonCfClearance.addEventListener('change', function() {
     // Prevent user from enabling this feature
     toggleSeassonCfClearance.checked = false;
     if (toggleSeassonCfClearanceWrap) toggleSeassonCfClearanceWrap.setAttribute('data-checked', String(false));
     if (toggleSeassonCfClearanceLabel) toggleSeassonCfClearanceLabel.textContent = 'Off';
     chrome.storage.local.set({ seasson_cf_clearance_enabled: false });
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
      // Prioritize manually entered cf_clearance. If not available, use stored.
      const storedCfClearance = (await chrome.storage.local.get('wplace_cf_clearance')).wplace_cf_clearance;
      if (!cfClearance && storedCfClearance && storedCfClearance.length >= 30) {
          cfClearance = storedCfClearance;
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
        if (!existingAccount && cfClearance) { // Check based on cf_clearance if jToken does not match
          // Only search for existing accounts by cf_clearance if the cf_clearance is NOT from quickAddCfClearanceInput.value
          // This prevents overwriting an existing account if the user pastes an old cf_clearance.
          // The assumption is that quickAddCfClearanceInput.value is for adding a *new* cf_clearance,
          // or if it's the current one, it will be handled by the jToken match.
          // This logic needs to be revisited if quickAddCfClearanceInput.value is intended for updating existing accounts by cf_clearance.
          // For now, prioritize matching by jToken, and if that fails,
          // only consider storedCfClearance for matching if it was *captured* and not manually entered.
          // To be safe, if a cfClearance is provided via quickAddCfClearanceInput, we always treat it as a potential new entry or update,
          // and let the backend handle the merge/update logic.
          // For now, we remove the existingAccount lookup by cfClearance for quickAdd,
          // as it can cause unintended overwrites if an old cf_clearance is pasted.
          // The backend should manage cf_clearance uniqueness and updates for existing accounts.
          //existingAccount = accounts.find(acc => acc.cf_clearance === cfClearance);
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
          url = `http://localhost:3000/api/accounts/${existingAccount.id}`; // Changed to localhost:3000
          // If a new name is entered, use it. Otherwise, keep the account's old name.
          body.name = accountName || existingAccount.name;
          // If jToken is provided, update it. Otherwise, use existing.
          body.token = jToken || existingAccount.token;
          // Ensure cf_clearance is updated if existingAccount does not have cf_clearance or a new cf_clearance is different
          // or if it was captured automatically
          if (cfClearance) { // Only update if cfClearance is provided and valid
            body.cf_clearance = cfClearance;
          } else if (existingAccount.cf_clearance) { // Keep existing if no new one provided
            body.cf_clearance = existingAccount.cf_clearance;
          }
        } else {
          // If creating a new account
          if (accountName) {
            // If a name is entered, use it
            body.name = accountName;
          } else {
            // If no name is entered, but jToken is available, use jToken based name
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
          // If the account name was not provided manually and the backend returned a name, use it
          if (!accountName && data.name) {
            // Update the body.name to reflect the name provided by the backend.
            // This is important because the backend might assign a name if it was initially empty.
            // This `body.name` isn't directly used for display here, but conceptual consistency.
            body.name = data.name;
          }
          setStatus('Account saved!');
          // Clear input content after successful save (if any)
          const accountNameInput = document.getElementById('quick-add-name-input');
          if (accountNameInput) {
            accountNameInput.value = ''; // Clear entered name after saving
          }
          // Clear cf_clearance input after successful save
          if (quickAddCfClearanceInput) {
              quickAddCfClearanceInput.value = '';
          }
          chrome.storage.local.remove('wplace_cf_clearance'); // Clear stored cf_clearance as it's saved
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
