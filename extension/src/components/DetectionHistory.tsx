
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    // Check if we're in Chrome extension environment
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Load history from Chrome storage
      chrome.storage.local.get(['history'], (result) => {
        if (result.history) {
          setHistory(result.history);
        }
      });

      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.history && changes.history.newValue) {
          setHistory(changes.history.newValue);
        }
      });
    } else {
      // Mock data for development
      setHistory([
        {
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          content: {
            text: "Doctors don't want you to know about this miracle cure for all diseases!",
            imageUrl: null
          },
          result: {
            isFake: true,
            confidenceScore: 0.85,
            explanation: "Contains misleading health claims without scientific evidence.",
            sources: ["Internal pattern detection"]
          }
        },
        {
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          content: {
            text: "Breaking news: Major storm system approaching the East Coast.",
            imageUrl: "https://example.com/storm.jpg"
          },
          result: {
            isFake: false,
            confidenceScore: 0.92,
            explanation: "Verified with multiple weather sources.",
            sources: ["National Weather Service", "AccuWeather"]
          }
        }
      ]);
    }
  }, []);

  const clearHistory = () => {
    // Clear history in Chrome storage if in extension environment
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ history: [] });
    }
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-muted-foreground mb-2">No detection history available</div>
        <p className="text-sm text-muted-foreground">
          Recent content analysis will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Recent Detections</h2>
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
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {history.map((item, index) => {
            const { content, result, timestamp } = item;
            const confidencePercent = Math.round(result.confidenceScore * 100);
            const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
            
            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className={`py-3 ${result.isFake ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {result.isFake ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <CardTitle className="text-sm">
                          {result.isFake ? "Potential Misinformation" : "Likely Trustworthy"}
                        </CardTitle>
                        <CardDescription className="text-xs">{timeAgo}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={result.isFake ? "destructive" : "outline"} className="text-xs">
                      {confidencePercent}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs py-2">
                  <div className="line-clamp-2">{content.text || "No text content"}</div>
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
