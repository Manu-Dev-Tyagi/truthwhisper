import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Trash2,
  ExternalLink,
  History as HistoryIcon,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface DetectionItem {
  timestamp: string;
  content: {
    text: string | null;
    imageUrl: string | null;
    audioUrl?: string | null;
  };
  result: {
    isFake: boolean;
    confidenceScore: number;
    explanation: string;
    sources: string[];
  };
}

const DetectionHistory = () => {
  const [history, setHistory] = useState<DetectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to load history from storage
  const loadHistory = () => {
    setLoading(true);

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["history"], (result) => {
        if (result.history && Array.isArray(result.history)) {
          setHistory(result.history);
          console.log("Loaded history:", result.history.length, "items");
        } else {
          console.warn("No valid history found in storage");
          setHistory([]);
        }
        setLoading(false);
      });
    } else {
      // Mock data for development environment
      console.log("Using mock data for development");
      setTimeout(() => {
        setHistory([
          {
            timestamp: new Date().toISOString(),
            content: {
              text: "This is a sample detection for development purposes.",
              imageUrl: null,
            },
            result: {
              isFake: Math.random() > 0.5,
              confidenceScore: 0.85,
              explanation:
                "This is a mock detection for testing the history component.",
              sources: ["https://example.com"],
            },
          },
        ]);
        setLoading(false);
      }, 500);
    }
  };

  useEffect(() => {
    // Initial load
    loadHistory();

    // Set up listener for changes
    if (typeof chrome !== "undefined" && chrome.storage) {
      const storageListener = (changes: any) => {
        if (changes.history && changes.history.newValue) {
          // Only update if the new value is valid
          if (Array.isArray(changes.history.newValue)) {
            setHistory(changes.history.newValue);
            console.log(
              "History updated from storage:",
              changes.history.newValue.length,
              "items"
            );
          }
        }
      };

      chrome.storage.onChanged.addListener(storageListener);

      // Cleanup listener on unmount
      return () => {
        chrome.storage.onChanged.removeListener(storageListener);
      };
    }
  }, []);

  const clearHistory = () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ history: [] }, () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to clear history:", chrome.runtime.lastError);
          toast.error("Failed to clear history");
        } else {
          setHistory([]);
          toast.success("History cleared");
        }
      });
    } else {
      setHistory([]);
    }
  };

  const refreshHistory = () => {
    loadHistory();
    toast.info("Refreshing history...");
  };

  // Function to open a source URL
  const openSourceUrl = (url: string) => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin mb-2">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-muted-foreground mb-2">
          <HistoryIcon className="h-8 w-8 mx-auto mb-2" />
          No detection history available
        </div>
        <p className="text-sm text-muted-foreground">
          Recent content analysis will appear here.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshHistory}
          className="mt-4"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Recent Detections</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshHistory}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="flex items-center gap-1 text-xs"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {history.map((item, index) => {
            // Validate that required properties exist
            if (!item || !item.result) {
              console.error("Invalid history item:", item);
              return null;
            }

            const { content, result, timestamp } = item;

            // Defensive data handling with fallbacks
            const confidencePercent =
              typeof result.confidenceScore === "number" &&
              !isNaN(result.confidenceScore)
                ? Math.round(result.confidenceScore * 100)
                : 50; // Default to 50% if no valid score

            const explanation =
              result.explanation || "No explanation available";
            const sources = Array.isArray(result.sources) ? result.sources : [];
            const isFake = Boolean(result.isFake);

            let timeAgo = "Unknown time";
            try {
              if (timestamp && typeof timestamp === "string") {
                timeAgo = formatDistanceToNow(new Date(timestamp), {
                  addSuffix: true,
                });
              }
            } catch (e) {
              console.error("Invalid timestamp:", timestamp, e);
            }

            // Handle potential error state in detection
            const isError =
              explanation.toLowerCase().includes("error") ||
              !result.confidenceScore;

            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader
                  className={`py-3 ${
                    isError
                      ? "bg-yellow-50 dark:bg-yellow-950/20"
                      : isFake
                      ? "bg-red-50 dark:bg-red-950/20"
                      : "bg-green-50 dark:bg-green-950/20"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : isFake ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <CardTitle className="text-sm">
                          {isError
                            ? "Analysis Error"
                            : isFake
                            ? "Potential Misinformation"
                            : "Likely Trustworthy"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {timeAgo}
                        </CardDescription>
                      </div>
                    </div>
                    {!isError && (
                      <Badge
                        variant={isFake ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {confidencePercent}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-xs line-clamp-3">
                    {content?.text || "No text content"}
                  </div>

                  {explanation && (
                    <div className="mt-2 pt-2 border-t text-xs">
                      <div className="font-medium mb-1">Analysis</div>
                      <p className="line-clamp-2">{explanation}</p>
                    </div>
                  )}

                  {sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-medium">Sources</div>
                      </div>
                      <div className="mt-1 space-y-1">
                        {sources.slice(0, 2).map((source, i) => (
                          <div key={i} className="flex items-center text-xs">
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                openSourceUrl(source);
                              }}
                              className="text-blue-600 hover:underline flex items-center truncate max-w-full"
                            >
                              {source
                                .replace(/^https?:\/\//, "")
                                .replace(/\/.*$/, "")}
                              <ExternalLink className="h-3 w-3 ml-1 inline flex-shrink-0" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DetectionHistory;
