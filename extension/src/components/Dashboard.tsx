import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Info,
  ExternalLink,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface DashboardProps {
  latestDetection: any | null;
  isActive: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ latestDetection, isActive }) => {
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // ✅ Updated function as requested
  const handleManualTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const response = await fetch('http://localhost:3000/api/v1/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: testInput,
          contentType: 'text'
        })
      });

      const data = await response.json();

      if (!response.ok || !data?.data) {
        throw new Error(data.error?.message || 'Invalid server response');
      }

      setTestResult(data);
    } catch (error) {
      console.error('Manual test failed:', error);
      setTestResult({
        error: error instanceof Error ? error.message : 'Failed to connect to backend'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const renderDetectionCard = (detectionData: any) => {
    const isFake = detectionData?.isFake;
    const confidence = Math.round(detectionData?.confidenceScore * 100);
    const explanation = detectionData?.explanation;

    return (
      <Card>
        <CardHeader className={isFake ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}>
          <CardTitle className="flex items-center gap-2">
            {isFake ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {isFake ? "Potential Misinformation" : "Likely Trustworthy"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Confidence Score</div>
            <div className="flex items-center gap-2">
              <Progress value={confidence} className={`h-2 ${isFake ? "bg-red-100" : "bg-green-100"}`} />
              <span className="text-xs">{confidence}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Analysis</h3>
            <p className="text-sm">{explanation}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {latestDetection ? (() => {
        const { content, result, timestamp } = latestDetection;
        const confidencePercent = Math.round(result.confidenceScore * 100);
        const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

        return (
          <Card>
            <CardHeader className={result.isFake ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {result.isFake ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {result.isFake ? "Potential Misinformation" : "Likely Trustworthy"}
                  </CardTitle>
                  <CardDescription>Detected {timeAgo}</CardDescription>
                </div>
                <Badge variant={result.isFake ? "destructive" : "outline"}>
                  {confidencePercent}% {result.isFake ? "False" : "True"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Confidence Score</div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={confidencePercent}
                    className={`h-2 ${result.isFake ? "bg-red-100" : "bg-green-100"}`}
                  />
                  <span className="text-xs">{confidencePercent}%</span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium mb-1">Content Analyzed</h3>
                <div className="text-sm p-3 bg-muted rounded-md max-h-24 overflow-auto">
                  {content?.text || "No text content"}
                  {content?.imageUrl && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">Contains image</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Analysis</h3>
                <p className="text-sm">{result.explanation}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" size="sm" className="text-xs">
                <Info className="h-3 w-3 mr-1" />
                More Details
              </Button>
              {result.isFake && (
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Verify Sources
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })() : (
        <div className="p-4 border rounded-lg text-center">
          <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-muted-foreground">
            No content analyzed yet. Use the manual analysis below or select text on any page.
          </p>
        </div>
      )}

      {/* Manual Analysis Section */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-sm font-medium mb-2">Manual Analysis</h3>
        <div className="flex flex-col gap-2">
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value.slice(0, 500))}
            placeholder="Enter text to analyze (max 500 characters)"
            className="min-h-[100px] p-2 border rounded text-sm w-full"
          />
          <div className="flex justify-between items-center">
            <Button
              onClick={handleManualTest}
              variant="outline"
              size="sm"
              disabled={isTesting || !testInput.trim()}
            >
              {isTesting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </span>
              ) : 'Test Analysis'}
            </Button>
            <span className="text-xs text-muted-foreground">{testInput.length}/500</span>
          </div>
        </div>

        {testResult && (
          <div className="mt-4 space-y-2">
            {testResult.error ? (
              <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{testResult.error}</span>
              </div>
            ) : (
              renderDetectionCard(testResult.data)
            )}
          </div>
        )}
      </div>

      {/* Status Message */}
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">
          {isActive
            ? "TruthWhisper is ready to analyze content"
            : "Extension is currently paused"}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
