import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Settings, History } from "lucide-react";
import Dashboard from '@/components/Dashboard';
import DetectionHistory from '@/components/DetectionHistory';
import SettingsPanel from '@/components/SettingsPanel';

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

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [latestDetection, setLatestDetection] = useState<DetectionItem | null>(null);
  const [isExtensionActive, setIsExtensionActive] = useState(true);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['history'], (result) => {
        if (result.history?.length > 0) {
          setLatestDetection(result.history[0]);
        } else {
          setLatestDetection(null);
        }
      });

      chrome.storage.onChanged.addListener((changes) => {
        if (changes.history?.newValue?.length > 0) {
          setLatestDetection(changes.history.newValue[0]);
        } else {
          setLatestDetection(null);
        }
      });
    } else {
      setLatestDetection(null); // No mock data for dev mode
    }
  }, []);

  const handleExtensionToggle = (enabled: boolean) => {
    setIsExtensionActive(enabled);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        type: 'SET_EXTENSION_ACTIVE', 
        active: enabled 
      });
    }
  };

  return (
    <div className="w-[400px] h-[500px] overflow-hidden bg-background text-foreground p-2">
      <header className="flex items-center justify-between p-3 border-b mb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-bold">TruthWhisper</h1>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="extension-active" className="text-xs">
            {isExtensionActive ? 'Active' : 'Paused'}
          </Label>
          <Switch 
            id="extension-active" 
            checked={isExtensionActive} 
            onCheckedChange={handleExtensionToggle} 
          />
        </div>
      </header>

      <main className="h-[calc(100%-80px)] overflow-hidden">
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="h-[calc(100%-40px)] overflow-auto">
            <Dashboard latestDetection={latestDetection} isActive={isExtensionActive} />
          </TabsContent>

          <TabsContent value="history" className="h-[calc(100%-40px)] overflow-auto">
            <DetectionHistory />
          </TabsContent>

          <TabsContent value="settings" className="h-[calc(100%-40px)] overflow-auto">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
