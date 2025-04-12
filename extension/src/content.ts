/// <reference types="chrome" />

(function contentScript() {
  // Type definitions
  interface AnalysisResult {
    isFake?: boolean;
    confidenceScore?: number;
    explanation?: string;
  }

  // Skip execution in restricted contexts
  if (
    window.location.protocol.startsWith('chrome') ||
    window.location.href === 'about:blank'
  ) {
    console.log(
      'Skipping execution in restricted context:',
      window.location.href
    );
    return;
  }

  console.log('TruthWhisper content script loaded in:', window.location.href);

  // Message handler with proper Chrome API types
  chrome.runtime.onMessage.addListener((
    message: { type: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: { error?: string; data?: AnalysisResult }) => void
  ): boolean => {
    if (message.type === 'TRIGGER_ANALYSIS') {
      const selection = window.getSelection()?.toString()?.trim();

      if (!selection || selection.length < 10) {
        console.log('[Content] Invalid selection length');
        return true;
      }

      console.log('[Content] Selected text:', selection.substring(0, 50) + '...');

      chrome.runtime.sendMessage(
        {
          type: 'PROCESS_SELECTION',
          payload: {
            text: selection,
            metadata: {
              url: window.location.href,
              timestamp: new Date().toISOString()
            }
          }
        },
        (response?: { error?: string; data?: AnalysisResult }) => {
          if (chrome.runtime.lastError) {
            console.error('[Content] Message error:', chrome.runtime.lastError);
            showErrorIndicator('Failed to communicate with extension');
            return;
          }

          if (response?.error) {
            showErrorIndicator(response.error);
            return;
          }

          if (!response?.data) {
            showErrorIndicator('Invalid analysis response');
            return;
          }

          showResultIndicator(response);
        }
      );

      return true; // Keep message channel open for async response
    }
    return false;
  });

  // Visual feedback functions
  function showResultIndicator(result: { data?: AnalysisResult }) {
    const safeData = result.data || {};
    const isFake = Boolean(safeData.isFake);
    const confidence = Math.round((safeData.confidenceScore || 0) * 100);
    const explanation = safeData.explanation || 'No detailed explanation available';

    // Remove existing indicator
    const existing = document.getElementById('truthwhisper-indicator');
    if (existing) existing.remove();

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'truthwhisper-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px;
      background: ${isFake ? '#fee2e2' : '#dcfce7'};
      border: 1px solid ${isFake ? '#f87171' : '#4ade80'};
      border-radius: 6px;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 300px;
      font-family: system-ui, sans-serif;
    `;

    indicator.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center;">
        ${isFake ? '⚠️' : '✅'}
        <strong style="font-size: 14px;">
          ${isFake ? 'Potential Fake' : 'Likely Genuine'}
        </strong>
      </div>
      <div style="margin-top: 8px; font-size: 13px; line-height: 1.4;">
        <div>Confidence: ${confidence}%</div>
        <div style="margin-top: 4px; color: #666;">${explanation}</div>
      </div>
    `;

    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 5000);
  }

  function showErrorIndicator(message: string) {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px;
      background: #ffecb3;
      border: 1px solid #ffd700;
      border-radius: 6px;
      z-index: 99999;
      max-width: 300px;
      font-family: system-ui, sans-serif;
    `;

    indicator.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center; color: #856404;">
        ⚠️ <strong style="font-size: 14px;">Analysis Error</strong>
      </div>
      <div style="margin-top: 8px; font-size: 13px; color: #856404;">
        ${message}
      </div>
    `;

    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 5000);
  }
})();