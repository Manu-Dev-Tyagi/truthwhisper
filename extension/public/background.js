const tabStates = new Map();

// Default settings
const DEFAULT_SETTINGS = {
  notifications: true,
  autoAnalyze: true,
  confidenceThreshold: 60,
  monitorPlatforms: {
    whatsapp: true,
    facebook: true,
    twitter: true,
  },
  analysisType: {
    text: true,
    images: true,
    audio: false,
  },
  apiModel: "default",
};

// Initialize storage with empty history and default settings if not present
chrome.runtime.onInstalled.addListener(() => {
  try {
    // Create context menu after a short delay to ensure chrome APIs are ready
    setTimeout(() => {
      chrome.contextMenus.removeAll(() => {
        try {
          chrome.contextMenus.create({
            id: "analyze-selection",
            title: "Analyze with TruthWhisper",
            contexts: ["selection"],
          });
          console.log("[Background] Context menu created successfully");
        } catch (e) {
          console.error("[Background] Error creating context menu:", e);
        }
      });
    }, 500);

    // Initialize storage with both history and settings
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["history", "settings"], (result) => {
        let updates = {};
        if (!result.history) {
          updates.history = [];
        }
        if (!result.settings) {
          updates.settings = DEFAULT_SETTINGS;
        }
        if (Object.keys(updates).length > 0) {
          chrome.storage.local.set(updates);
          console.log("TruthWhisper storage initialized:", updates);
        }
      });
    } else {
      console.error("Chrome storage API not available");
    }
    console.log("TruthWhisper extension installed/updated");
  } catch (error) {
    console.error("Error during extension initialization:", error);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  try {
    if (!tab?.id || !tab.url) return;

    const blockedProtocols = [
      "chrome:",
      "edge:",
      "about:",
      "chrome-extension:",
    ];

    if (blockedProtocols.some((p) => tab.url.startsWith(p))) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Analysis Unavailable",
        message: "Cannot analyze on this type of page",
      });
      return;
    }

    console.log(
      "[Background] Context menu clicked, sending message to tab:",
      tab.id
    );

    // Send message directly (content.js is already injected)
    chrome.tabs.sendMessage(
      tab.id,
      { type: "TRIGGER_ANALYSIS" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Background] Error sending message:",
            chrome.runtime.lastError
          );
        } else if (response) {
          console.log("[Background] Content script response:", response);
        }
      }
    );
  } catch (e) {
    console.error("[Background] Error in context menu handler:", e);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  // Handle settings update messages
  if (message.type === "SETTINGS_UPDATED") {
    console.log("[Background] Settings updated:", message.settings);
    return false;
  }

  // Message handler for explicit history saving
  if (message.type === "SAVE_TO_HISTORY") {
    try {
      if (message.payload && message.payload.text && message.payload.result) {
        console.log(
          "[Background] Saving detection to history from explicit request"
        );
        saveToHistory(message.payload.text, message.payload.result);
      }
    } catch (error) {
      console.error("[Background] Error saving to history:", error);
    }
    return false;
  }

  if (message.type === "PROCESS_SELECTION") {
    console.log(
      "[Background] Processing selection:",
      message.payload.text.substring(0, 50) + "..."
    );

    // Add timeout handling
    const timeoutId = setTimeout(() => {
      console.error("[Background] Request timed out");
      sendResponse({
        error: "Request timed out after 30 seconds",
        _metadata: { timestamp: new Date().toISOString() },
      });
    }, 30000);

    // Try direct fetch first
    fetch("http://127.0.0.1:9998/api/v1/analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "omit",
      body: JSON.stringify({
        content: message.payload.text,
        contentType: "text",
        metadata: message.payload.metadata,
      }),
    })
      .then(async (response) => {
        clearTimeout(timeoutId); // Clear timeout on success

        console.log("[Background] Response status:", response.status);
        console.log("[Background] Response headers:", response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Background] HTTP error:", response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("[Background] Analysis succeeded:", data);
        if (!data?.data) throw new Error("Invalid response structure");

        // Save to history
        saveToHistory(message.payload.text, data.data);
        sendResponse(data);
      })
      .catch((error) => {
        clearTimeout(timeoutId); // Clear timeout on error too
        console.error("[Background] Analysis failed:", error);

        // Try fallback to direct AI service
        console.log("[Background] Trying fallback...");
        tryFallbackRequest(message.payload.text)
          .then((fallbackData) => {
            // Save to history on successful fallback
            saveToHistory(message.payload.text, fallbackData.data);
            sendResponse(fallbackData);
          })
          .catch((fallbackError) => {
            console.error("[Background] Fallback also failed:", fallbackError);

            // Even if both services fail, try to create a simple detection record
            try {
              saveErrorToHistory(
                message.payload.text,
                error.message || "Analysis failed"
              );
            } catch (e) {
              console.error("[Background] Failed to save error to history:", e);
            }

            sendResponse({
              error: error.message,
              _metadata: { timestamp: new Date().toISOString() },
            });
          });
      });

    return true; // Keep message channel open for async response
  }
  return false;
});

// Save error to history so user knows the analysis was attempted
function saveErrorToHistory(text, errorMessage) {
  try {
    const detectionRecord = {
      timestamp: new Date().toISOString(),
      content: {
        text: text,
        imageUrl: null,
      },
      result: {
        isFake: false,
        confidenceScore: 0,
        explanation: `Analysis error: ${errorMessage}. Please try again later.`,
        sources: [],
      },
    };
    updateHistoryInStorage(detectionRecord);
  } catch (error) {
    console.error("[Background] Error in saveErrorToHistory:", error);
  }
}

// Save detection to history
function saveToHistory(text, result) {
  try {
    if (!result) return;

    // Normalize confidence score value (may come as .confidence or .confidenceScore)
    const confidenceScore = result.confidenceScore || result.confidence || 0.5;

    // Create detection record with standardized format
    const detectionRecord = {
      timestamp: new Date().toISOString(),
      content: {
        text: text,
        imageUrl: null,
      },
      result: {
        isFake: Boolean(result.isFake), // Ensure boolean type
        confidenceScore: Number(confidenceScore), // Ensure number type
        explanation: result.explanation || "No explanation provided",
        sources: Array.isArray(result.sources) ? result.sources : [],
      },
    };

    console.log("[Background] Saving detection record:", detectionRecord);
    updateHistoryInStorage(detectionRecord);
  } catch (error) {
    console.error("[Background] Error in saveToHistory:", error);
  }
}

// Helper function to update history in storage
function updateHistoryInStorage(detectionRecord) {
  // Check if Chrome storage API is available
  if (!chrome.storage || !chrome.storage.local) {
    console.error("[Background] Chrome storage API not available");
    return;
  }

  try {
    // Get current history and add new item at the beginning
    chrome.storage.local.get(["history"], (data) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[Background] Error getting history:",
          chrome.runtime.lastError
        );
        return;
      }

      const history = Array.isArray(data.history) ? data.history : [];
      const updatedHistory = [detectionRecord, ...history].slice(0, 20); // Keep last 20 items

      // Update storage
      chrome.storage.local.set({ history: updatedHistory }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Background] Error updating history:",
            chrome.runtime.lastError
          );
        } else {
          console.log(
            "[Background] Updated history:",
            updatedHistory.length,
            "items"
          );
        }
      });
    });
  } catch (error) {
    console.error("[Background] Exception in updateHistoryInStorage:", error);
  }
}

// Fallback to direct AI service if backend fails
async function tryFallbackRequest(text) {
  console.log("[Background] Trying fallback to direct AI service");

  const response = await fetch("http://127.0.0.1:9999/analyze-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    credentials: "omit",
    body: JSON.stringify({ content: text }),
  });

  console.log("[Background] Fallback response status:", response.status);

  if (!response.ok) {
    throw new Error(`Fallback API error: ${response.status}`);
  }

  const data = await response.json();

  // Convert AI service response to match backend format with proper type handling
  return {
    success: true,
    data: {
      isFake: Boolean(data.isFake),
      confidenceScore: Number(data.confidence || 0.5),
      explanation: data.explanation || "No explanation provided",
      sources: Array.isArray(data.sources) ? data.sources : [],
      contentType: "text",
    },
  };
}
