/**
 * Popup UI Controller
 */

const statusEl = document.getElementById('status');
const tokenInput = document.getElementById('token');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const infoSection = document.getElementById('info');
const infoStatus = document.getElementById('infoStatus');
const infoAuth = document.getElementById('infoAuth');

// Load saved token
chrome.storage.local.get(['bridgeToken'], (result) => {
  if (result.bridgeToken) {
    tokenInput.value = result.bridgeToken;
  }
});

// Get initial status
updateStatus();

// Update status every 2 seconds
setInterval(updateStatus, 2000);

connectBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  
  console.log('🔵 Connect button clicked');
  
  if (!token) {
    alert('Please enter an auth token');
    return;
  }
  
  console.log('🔵 Sending SET_TOKEN message with token:', token.substring(0, 10) + '...');
  
  // Send token to background script
  chrome.runtime.sendMessage(
    { type: 'SET_TOKEN', token },
    (response) => {
      console.log('🔵 Response from background:', response);
      
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        alert('Error connecting: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success) {
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;
        
        setTimeout(() => {
          updateStatus();
          connectBtn.textContent = 'Connect';
          connectBtn.disabled = false;
        }, 1000);
      } else {
        alert('Failed to connect. Check the background console.');
      }
    }
  );
});

disconnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage(
    { type: 'DISCONNECT' },
    (response) => {
      if (response && response.success) {
        updateStatus();
      }
    }
  );
});

function updateStatus() {
  chrome.runtime.sendMessage(
    { type: 'GET_STATUS' },
    (status) => {
      if (!status) return;
      
      if (status.connected && status.authenticated) {
        statusEl.className = 'status status-connected';
        statusEl.innerHTML = `
          <div class="status-dot"></div>
          <span>Connected & Ready</span>
        `;
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        infoSection.style.display = 'block';
        
        infoStatus.textContent = 'Connected';
        infoAuth.textContent = 'Authenticated';
      } else if (status.connected) {
        statusEl.className = 'status';
        statusEl.style.background = '#fff3cd';
        statusEl.style.color = '#856404';
        statusEl.innerHTML = `
          <div class="status-dot"></div>
          <span>Connected (authenticating...)</span>
        `;
        infoSection.style.display = 'block';
        infoStatus.textContent = 'Connected';
        infoAuth.textContent = 'Waiting...';
      } else {
        statusEl.className = 'status status-disconnected';
        statusEl.innerHTML = `
          <div class="status-dot"></div>
          <span>Disconnected</span>
        `;
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
        infoSection.style.display = 'none';
      }
    }
  );
}
