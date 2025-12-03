/**
 * Popup UI Controller
 * Updated for automatic authentication
 */

const statusEl = document.getElementById('status');
const reconnectBtn = document.getElementById('reconnectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const connectedInfo = document.getElementById('connectedInfo');
const disconnectedInfo = document.getElementById('disconnectedInfo');

// Get initial status
updateStatus();

// Update status every 2 seconds
setInterval(updateStatus, 2000);

reconnectBtn.addEventListener('click', () => {
  reconnectBtn.textContent = 'Reconnecting...';
  reconnectBtn.disabled = true;
  
  chrome.runtime.sendMessage(
    { type: 'RECONNECT' },
    (response) => {
      setTimeout(() => {
        updateStatus();
        reconnectBtn.textContent = 'Reconnect';
        reconnectBtn.disabled = false;
      }, 1000);
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
      if (chrome.runtime.lastError) {
        return;
      }
      
      if (!status) return;
      
      if (status.connected && status.authenticated) {
        statusEl.className = 'status status-connected';
        statusEl.innerHTML = `
          <div class="status-dot"></div>
          <span>Connected & Ready</span>
        `;
        connectedInfo.style.display = 'block';
        disconnectedInfo.style.display = 'none';
      } else if (status.connected) {
        statusEl.className = 'status';
        statusEl.style.background = '#fff3cd';
        statusEl.style.color = '#856404';
        statusEl.innerHTML = `
          <div class="status-dot"></div>
          <span>Connected (authenticating...)</span>
        `;
        connectedInfo.style.display = 'none';
        disconnectedInfo.style.display = 'block';
      } else {
        statusEl.className = 'status status-disconnected';
        statusEl.innerHTML = `
          <div class="status-dot"></div>
          <span>Disconnected</span>
        `;
        connectedInfo.style.display = 'none';
        disconnectedInfo.style.display = 'block';
      }
    }
  );
}
