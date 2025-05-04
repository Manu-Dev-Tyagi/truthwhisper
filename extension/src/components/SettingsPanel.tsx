import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  notifications: boolean;
  autoAnalyze: boolean;
  confidenceThreshold: number;
  monitorPlatforms: {
    whatsapp: boolean;
    facebook: boolean;
    twitter: boolean;
  };
  analysisType: {
    text: boolean;
    images: boolean;
    audio: boolean;
  };
  apiModel: string;
}

// Default settings
const DEFAULT_SETTINGS: SettingsState = {
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

const SettingsPanel = () => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    // Load settings from Chrome storage if in extension environment
    if (typeof chrome !== "undefined" && chrome.storage) {
      setLoading(true);
      chrome.storage.local.get(["settings"], (result) => {
        if (result.settings) {
          console.log("Loaded settings from storage:", result.settings);
          setSettings(result.settings);
        } else {
          console.log("No settings found in storage, using defaults");
        }
        setLoading(false);
      });
    } else {
      // Development mode - use defaults
      console.log("Using default settings in development mode");
      setLoading(false);
    }
  }, []);

  const saveSettings = () => {
    setSaveStatus("saving");

    // Save settings to Chrome storage if in extension environment
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to save settings:", chrome.runtime.lastError);
          setSaveStatus("error");
          toast.error("Failed to save settings");
        } else {
          console.log("Settings saved successfully:", settings);
          setSaveStatus("saved");
          toast.success("Settings saved");

          // Notify background script about updated settings
          if (chrome.runtime) {
            chrome.runtime.sendMessage({
              type: "SETTINGS_UPDATED",
              settings,
            });
          }
        }
      });
    } else {
      // Development mode
      console.log("Settings would be saved (development mode):", settings);
      setSaveStatus("saved");

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.info("Settings reset to defaults. Click Save to apply.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin">
          <RefreshCw className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Settings</CardTitle>
          <CardDescription>Configure how TruthWhisper works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Show Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive alerts for suspicious content
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-analyze">Automatic Analysis</Label>
              <p className="text-xs text-muted-foreground">
                Analyze new messages as they appear
              </p>
            </div>
            <Switch
              id="auto-analyze"
              checked={settings.autoAnalyze}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoAnalyze: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
              <span className="text-xs text-muted-foreground">
                {settings.confidenceThreshold}%
              </span>
            </div>
            <Slider
              id="confidence-threshold"
              min={30}
              max={90}
              step={5}
              value={[settings.confidenceThreshold]}
              onValueChange={(value) =>
                setSettings({ ...settings, confidenceThreshold: value[0] })
              }
            />
            <p className="text-xs text-muted-foreground">
              Only alert for content above this confidence score
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platforms to Monitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp">WhatsApp Web</Label>
            <Switch
              id="whatsapp"
              checked={settings.monitorPlatforms.whatsapp}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  monitorPlatforms: {
                    ...settings.monitorPlatforms,
                    whatsapp: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="facebook">Facebook & Messenger</Label>
            <Switch
              id="facebook"
              checked={settings.monitorPlatforms.facebook}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  monitorPlatforms: {
                    ...settings.monitorPlatforms,
                    facebook: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="twitter">Twitter / X</Label>
            <Switch
              id="twitter"
              checked={settings.monitorPlatforms.twitter}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  monitorPlatforms: {
                    ...settings.monitorPlatforms,
                    twitter: checked,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="text-analysis">Text Analysis</Label>
            <Switch
              id="text-analysis"
              checked={settings.analysisType.text}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  analysisType: {
                    ...settings.analysisType,
                    text: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="image-analysis">Image Analysis</Label>
            <Switch
              id="image-analysis"
              checked={settings.analysisType.images}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  analysisType: {
                    ...settings.analysisType,
                    images: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="audio-analysis">Audio Analysis (Beta)</Label>
              <p className="text-xs text-muted-foreground">
                Detect synthetic or manipulated audio
              </p>
            </div>
            <Switch
              id="audio-analysis"
              checked={settings.analysisType.audio}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  analysisType: {
                    ...settings.analysisType,
                    audio: checked,
                  },
                })
              }
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="api-model">API Model</Label>
            <Select
              value={settings.apiModel}
              onValueChange={(value) =>
                setSettings({ ...settings, apiModel: value })
              }
            >
              <SelectTrigger id="api-model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which AI model to use for analysis
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>

        <Button
          onClick={saveSettings}
          disabled={saveStatus === "saving"}
          size="sm"
        >
          {saveStatus === "saving" ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveStatus === "saved" ? (
            "Saved!"
          ) : (
            <>
              <Save className="h-3 w-3 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel;
