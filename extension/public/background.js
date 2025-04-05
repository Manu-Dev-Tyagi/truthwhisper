import './keep-alive.js';

let isActive = true;
let fakeCount = 0;

// ---------------- Context Menu Initialization ---------------- //
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyze-selection',
    title: 'Analyze with TruthWhisper',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'ANALYZE_SELECTION',
      selection: info.selectionText
    });
  }
});

// ---------------- Badge Management ---------------- //
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_BADGE') {
    fakeCount += message.isFake ? 1 : 0;
    chrome.action.setBadgeText({
      text: fakeCount > 0 ? fakeCount.toString() : ''
    });
    chrome.action.setBadgeBackgroundColor({
      color: message.isFake ? '#dc2626' : '#16a34a'
    });
  }
});

// ---------------- Message Listener for Content Analysis ---------------- //
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isActive) {
    console.error('Received message while inactive');
    return false;
  }

  if (message.type === 'ANALYZE_CONTENT') {
    const { data } = message;
    const requestId = data.metadata?.requestId || Date.now().toString();

    console.log(`[Background] Analyzing content (ID: ${requestId}) from ${data.metadata.platform || 'unknown'}`, {
      textPreview: data.text?.substring(0, 50) + '...',
      tab: sender.tab?.url
    });

    const startTime = Date.now();

    fetch('http://localhost:3000/api/v1/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        content: data.text,
        contentType: 'text/plain',
        metadata: data.metadata
      })
    })
    .then(response => {
      const duration = Date.now() - startTime;
      console.log(`[Background] Response (ID: ${requestId})`, {
        status: response.status,
        duration: `${duration}ms`
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    })
    .then(data => {
      console.log(`[Background] Success (ID: ${requestId})`, {
        isFake: data.data?.isFake,
        confidence: data.data?.confidenceScore
      });

      storeAnalysisResult(data.data, requestId);
    })
    .catch(error => {
      console.error(`[Background] Failed (ID: ${requestId}):`, error.message);
      storeErrorResult(error.message, requestId, data.metadata?.url);
    });
  }

  return true;
});

// ---------------- Result Storage Helpers ---------------- //
function storeAnalysisResult(result, requestId) {
  chrome.storage.local.get(['history'], (res) => {
    const newEntry = {
      ...result,
      _metadata: {
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    const newHistory = [newEntry, ...(res.history || []).slice(0, 49)];
    chrome.storage.local.set({ history: newHistory });
    console.log(`[Background] Stored result (ID: ${requestId})`);
  });
}

function storeErrorResult(errorMsg, requestId, url) {
  chrome.storage.local.get(['history'], (res) => {
    const newEntry = {
      error: errorMsg,
      _metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        url: url || 'unknown'
      }
    };

    const newHistory = [newEntry, ...(res.history || []).slice(0, 49)];
    chrome.storage.local.set({ history: newHistory });
    console.log(`[Background] Stored error (ID: ${requestId})`);
  });
}

// ---------------- Keep Service Worker Alive ---------------- //
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending');
  isActive = false;
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('Service worker suspend canceled');
  isActive = true;
});

// Watchdog to reload service worker if inactive
setInterval(() => {
  if (!isActive) {
    console.warn('Service worker inactive, reloading...');
    chrome.runtime.reload();
  }
}, 5000);
