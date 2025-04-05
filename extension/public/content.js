let isObserving = false;
let observer = null;

// --- CONTEXT MENU HANDLER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_SELECTION') {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      analyzeSelectedContent(selection);
    }
  }
});

// Handle selected text analysis
function analyzeSelectedContent(selectedText) {
  const requestId = Date.now();
  const platform = detectPlatform();

  chrome.runtime.sendMessage({
    type: 'ANALYZE_CONTENT',
    data: {
      text: selectedText,
      contentType: 'text',
      metadata: {
        platform,
        url: window.location.href,
        requestId,
        selected: true
      }
    }
  }, (response) => {
    if (response?.success) {
      highlightSelection(response.data);
      updateBadge(response.data.isFake);
    }
  });
}

// Identify platform for metadata
function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('whatsapp')) return 'whatsapp';
  if (host.includes('twitter')) return 'twitter';
  if (host.includes('facebook')) return 'facebook';
  return 'other';
}

// Visually mark selected text
function highlightSelection(result) {
  const range = window.getSelection().getRangeAt(0);
  const marker = document.createElement('span');
  marker.className = `truthwhisper-marker ${result.isFake ? 'fake' : 'genuine'}`;
  marker.style.backgroundColor = result.isFake ? '#fecaca80' : '#bbf7d080';
  marker.dataset.tooltip = result.explanation;
  range.surroundContents(marker);
}

// Update browser action badge
function updateBadge(isFake) {
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    isFake
  });
}

// Initialize the context menu from background
chrome.runtime.sendMessage({ type: 'INIT_CONTEXT_MENU' });

// --- EXISTING MESSAGE OBSERVER LOGIC ---
function analyzeMessage(data, messageElement) {
  const requestId = Date.now();
  console.log(`[Content] Analyzing message (ID: ${requestId}):`, {
    text: data.text?.substring(0, 100) + (data.text?.length > 100 ? '...' : ''),
    image: data.imageUrl ? 'Detected' : 'None'
  });

  chrome.runtime.sendMessage({
    type: 'ANALYZE_CONTENT',
    data: {
      ...data,
      metadata: {
        url: window.location.href,
        requestId,
        tabId: chrome.runtime?.id || 'unknown'
      }
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(`[Content] Error (ID: ${requestId}):`, chrome.runtime.lastError);
      return;
    }

    console.log(`[Content] Response (ID: ${requestId}):`, {
      status: response?.success ? 'OK' : 'ERROR',
      isFake: response?.data?.isFake,
      confidence: response?.data?.confidenceScore
    });

    if (response?.data?.isFake && response.data.confidenceScore > 0.5) {
      addWarningToMessage(messageElement, response.data);
    }
  });
}

function initializeObserver() {
  if (isObserving) {
    console.log('[Content] Observer already active');
    return;
  }

  const selectors = getPlatformSelectors();
  if (!selectors) {
    console.warn('[Content] Unsupported platform:', window.location.hostname);
    return;
  }

  try {
    console.log('[Content] Initializing observer for:', selectors.messageContainer);

    observer = new MutationObserver((mutations) => {
      console.log('[Content] DOM mutation detected');
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          try {
            if (!(node instanceof HTMLElement)) {
              console.log('[Content] Non-element node skipped');
              return;
            }

            const messages = node.matches(selectors.messageContainer)
              ? [node]
              : node.querySelectorAll(selectors.messageContainer);

            console.log(`[Content] Processing ${messages.length} messages`);

            messages.forEach((msg, index) => {
              if (msg.dataset.truthwhisperAnalyzed) {
                console.log('[Content] Message already processed');
                return;
              }

              msg.dataset.truthwhisperAnalyzed = 'true';
              const text = extractTextFromMessage(msg, selectors);
              const images = extractImagesFromMessage(msg, selectors);

              console.log(`[Content] Message ${index + 1}:`, {
                textLength: text.length,
                imageCount: images.length
              });

              if (text.length > 10 || images.length > 0) {
                analyzeMessage({
                  text: text,
                  imageUrl: images[0] || null
                }, msg);
              }
            });
          } catch (error) {
            console.error('[Content] Mutation processing error:', error);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    isObserving = true;
    console.log('[Content] Observer successfully initialized');

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      if (observer) {
        observer.disconnect();
        isObserving = false;
        console.log('[Content] Observer cleaned up');
      }
    });

  } catch (error) {
    console.error('[Content] Observer initialization failed:', error);
    isObserving = false;
    setTimeout(initializeObserver, 2000); // Retry after 2s
  }
}

// Start observation
function startObservation() {
  if (document.readyState === 'complete') {
    initializeObserver();
  } else {
    window.addEventListener('load', () => {
      initializeObserver();
    });
  }
}

// Error-handled startup
try {
  startObservation();
} catch (error) {
  console.error('[Content] Initial startup error:', error);
  setTimeout(startObservation, 5000); // Retry after 5s
}

// Health check
setInterval(() => {
  if (!isObserving) {
    console.warn('[Content] Observer inactive, reinitializing...');
    startObservation();
  }
}, 15000); // Every 15s
