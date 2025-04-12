const tabStates = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'analyze-selection',
      title: 'Analyze with TruthWhisper',
      contexts: ['selection']
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !tab.url) return;

  const blockedProtocols = ['chrome:', 'edge:', 'about:', 'chrome-extension:'];
  if (blockedProtocols.some(p => tab.url.startsWith(p))) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Analysis Unavailable',
      message: 'Cannot analyze on this type of page'
    });
    return;
  }

  // ✅ Send message directly (content.js is already injected)
  chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_ANALYSIS' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === 'PROCESS_SELECTION') {
    fetch('http://localhost:3000/api/v1/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.payload.text,
        contentType: 'text',
        metadata: message.payload.metadata
      })
    })
      .then(async response => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data?.data) throw new Error('Invalid response structure');
        sendResponse(data);
      })
      .catch(error => {
        console.error('[Background] Analysis failed:', error);
        sendResponse({
          error: error.message,
          _metadata: { timestamp: new Date().toISOString() }
        });
      });

    return true;
  }

  return false;
});
