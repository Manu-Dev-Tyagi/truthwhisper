/// <reference types="chrome" />

(function contentScript() {
  // Type definitions
  interface AnalysisResult {
    isFake?: boolean;
    confidenceScore?: number;
    explanation?: string;
    sources?: string[];
  }

  // Skip execution in restricted contexts
  if (
    window.location.protocol.startsWith("chrome") ||
    window.location.href === "about:blank"
  ) {
    console.log(
      "Skipping execution in restricted context:",
      window.location.href
    );
    return;
  }

  console.log("TruthWhisper content script loaded in:", window.location.href);

  // Message handler with proper Chrome API types
  chrome.runtime.onMessage.addListener(
    (
      message: { type: string },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: {
        error?: string;
        data?: AnalysisResult;
      }) => void
    ): boolean => {
      if (message.type === "TRIGGER_ANALYSIS") {
        const selection = window.getSelection()?.toString()?.trim();

        if (!selection || selection.length < 10) {
          console.log("[Content] Invalid selection length");
          showErrorIndicator(
            "Please select at least 10 characters of text to analyze"
          );
          return false;
        }

        console.log(
          "[Content] Selected text:",
          selection.substring(0, 50) + "..."
        );
        showLoadingIndicator("Analyzing content...");

        try {
          chrome.runtime.sendMessage(
            {
              type: "PROCESS_SELECTION",
              payload: {
                text: selection,
                metadata: {
                  url: window.location.href,
                  timestamp: new Date().toISOString(),
                },
              },
            },
            (response?: { error?: string; data?: AnalysisResult }) => {
              // Remove loading indicator
              const loading = document.getElementById("truthwhisper-loading");
              if (loading) loading.remove();

              if (chrome.runtime.lastError) {
                console.error(
                  "[Content] Message error:",
                  chrome.runtime.lastError
                );
                showErrorIndicator(
                  "Failed to communicate with extension: " +
                    chrome.runtime.lastError.message
                );
                return;
              }

              if (response?.error) {
                console.error("[Content] Response error:", response.error);
                showErrorIndicator(response.error);
                return;
              }

              if (!response?.data) {
                console.error("[Content] Invalid response:", response);
                showErrorIndicator("Invalid analysis response");
                return;
              }

              console.log("[Content] Analysis result:", response.data);
              showResultIndicator(response);
            }
          );
        } catch (error) {
          console.error("[Content] Exception during analysis:", error);
          showErrorIndicator(
            "Error: " + (error instanceof Error ? error.message : String(error))
          );
        }

        return true; // Keep message channel open for async response
      }
      return false;
    }
  );

  // Visual feedback functions
  function showLoadingIndicator(message: string) {
    // Remove any existing indicators
    const existing = document.getElementById("truthwhisper-loading");
    if (existing) existing.remove();

    const indicator = document.createElement("div");
    indicator.id = "truthwhisper-loading";
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px;
      background: #f0f9ff;
      border: 1px solid #93c5fd;
      border-radius: 6px;
      z-index: 99999;
      max-width: 300px;
      font-family: system-ui, sans-serif;
    `;

    indicator.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center; color: #1e40af;">
        <div class="spinner" style="
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <strong style="font-size: 14px;">Analyzing...</strong>
      </div>
      <div style="margin-top: 8px; font-size: 13px; color: #1e40af;">
        ${message}
      </div>
    `;

    // Add spinner animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);
  }

  function showResultIndicator(result: { data?: AnalysisResult }) {
    const safeData = result.data || {};
    const isFake = Boolean(safeData.isFake);
    const confidenceScore = safeData.confidenceScore || 0;
    const confidence =
      typeof confidenceScore === "number" && !isNaN(confidenceScore)
        ? Math.round(confidenceScore * 100)
        : 50;
    const explanation =
      safeData.explanation || "No detailed explanation available";
    const sources = Array.isArray(safeData.sources) ? safeData.sources : [];

    // Remove existing indicator
    const existing = document.getElementById("truthwhisper-indicator");
    if (existing) existing.remove();

    // Create new indicator
    const indicator = document.createElement("div");
    indicator.id = "truthwhisper-indicator";
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px;
      background: ${isFake ? "#fee2e2" : "#dcfce7"};
      border: 1px solid ${isFake ? "#f87171" : "#4ade80"};
      border-radius: 6px;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 300px;
      font-family: system-ui, sans-serif;
    `;

    // Build sources HTML if available
    let sourcesHtml = "";
    if (sources.length > 0) {
      sourcesHtml = `
        <div style="margin-top: 8px; font-size: 12px; border-top: 1px solid ${
          isFake ? "#fca5a5" : "#86efac"
        }; padding-top: 8px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Sources:</div>
          <ul style="margin: 0; padding-left: 16px;">
            ${sources
              .slice(0, 3)
              .map(
                (source) =>
                  `<li><a href="${source}" target="_blank" style="color: #2563eb; text-decoration: underline;">${source
                    .replace(/^https?:\/\//, "")
                    .replace(/\/.*$/, "")}</a></li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    indicator.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center;">
        ${isFake ? "⚠️" : "✅"}
        <strong style="font-size: 14px;">
          ${isFake ? "Potential Fake" : "Likely Genuine"}
        </strong>
      </div>
      <div style="margin-top: 8px; font-size: 13px; line-height: 1.4;">
        <div>Confidence: ${confidence}%</div>
        <div style="margin-top: 4px; color: #666;">${explanation}</div>
        ${sourcesHtml}
      </div>
    `;

    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 20000); // Increased visibility time to 20 seconds
  }

  function showErrorIndicator(message: string) {
    // Remove any existing indicators
    const loading = document.getElementById("truthwhisper-loading");
    if (loading) loading.remove();

    const existing = document.getElementById("truthwhisper-error");
    if (existing) existing.remove();

    const indicator = document.createElement("div");
    indicator.id = "truthwhisper-error";
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
      <div style="margin-top: 8px; font-size: 11px; color: #856404; text-align: right;">
        <button id="truthwhisper-retry" style="background: #856404; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer;">Retry</button>
      </div>
    `;

    document.body.appendChild(indicator);

    // Add retry button functionality
    setTimeout(() => {
      const retryButton = document.getElementById("truthwhisper-retry");
      if (retryButton) {
        retryButton.addEventListener("click", () => {
          indicator.remove();
          chrome.runtime.sendMessage({ type: "TRIGGER_ANALYSIS" });
        });
      }
    }, 0);

    setTimeout(() => {
      if (document.getElementById("truthwhisper-error")) {
        document.getElementById("truthwhisper-error")?.remove();
      }
    }, 10000);
  }
})();
