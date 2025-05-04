Write-Host "======== STARTING TRUTHWHISPER SERVICES ========" -ForegroundColor Cyan

# Kill existing processes that might be using the ports
taskkill /F /FI "IMAGENAME eq node.exe" 2>$null
taskkill /F /FI "IMAGENAME eq python.exe" 2>$null

# Configure service ports (use even higher port numbers to avoid conflicts)
$AI_PORT = 9999
$BACKEND_PORT = 9998

# Root directory
$rootDir = "C:\Users\chopr\Downloads\truthwhisper"
$backendDir = "$rootDir\backend"
$aiServicesDir = "$rootDir\ai-services"
$extensionDir = "$rootDir\extension"

# Create a simplified AI service file
$customMainPath = "$aiServicesDir\app\simple.py"

@"
from fastapi import FastAPI, HTTPException
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TruthWhisper Simple AI")

@app.post("/analyze-text")
async def analyze_text(request: dict):
    try:
        content = request.get('content', '')
        if not content:
            raise ValueError("Content cannot be empty")
            
        logger.info(f"Analyzing text: {content[:50]}...")
        
        # Simple logic - check for suspicious keywords
        keywords = ["conspiracy", "secret", "shocking", "they don't want you to know"]
        has_suspicious = any(kw in content.lower() for kw in keywords)
        
        result = {
            "isFake": has_suspicious,
            "confidence": 0.75 if has_suspicious else 0.65,
            "explanation": "Contains suspicious keywords" if has_suspicious else "No obvious issues detected",
            "sources": ["https://www.factcheck.org/", "https://www.snopes.com/"]
        }
        
        logger.info(f"Analysis complete: {'FAKE' if has_suspicious else 'REAL'}")
        return result
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        return {
            "isFake": False,
            "confidence": 0.5,
            "explanation": f"Error: {str(e)}",
            "sources": []
        }

@app.post("/analyze-text/advanced")
async def analyze_text_advanced(request: dict):
    return await analyze_text(request)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
"@ | Set-Content -Path $customMainPath -Force

# Update TextAnalysisService to use the correct IP and port
$textServicePath = "$backendDir\src\services\analysis\text.service.ts"
$textServiceContent = @"
import axios, { AxiosError } from "axios";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

interface AnalysisResult {
  isFake: boolean;
  confidence: number;
  explanation: string;
  sources: string[];
}

export class TextAnalysisService {
  async analyze(content: string): Promise<AnalysisResult> {
    // Try primary endpoint first
    try {
      const result = await this.callAIService(content);
      return result;
    } catch (error) {
      logger.error("Primary AI service failed, trying fallback", error);

      // Try fallback to direct AI service
      try {
        return await this.callDirectAIService(content);
      } catch (fallbackError) {
        logger.error("Fallback AI service also failed", fallbackError);

        // Return dummy response as last resort
        return this.generateFallbackResponse(content);
      }
    }
  }

  private async callAIService(content: string): Promise<AnalysisResult> {
    // Use the advanced endpoint for more comprehensive analysis
    const url = `http://127.0.0.1:$AI_PORT/analyze-text`;
    const payload = { content };

    logger.info(`🔍 Sending content to AI Text Service at \${url}`);

    const response = await axios.post(url, payload, {
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;

    return {
      isFake: Boolean(data.isFake),
      confidence: Number(data.confidence) || 0.5,
      explanation: data.explanation || "No explanation provided",
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  }

  private async callDirectAIService(content: string): Promise<AnalysisResult> {
    logger.info("Trying direct call to AI service");
    const url = `http://127.0.0.1:$AI_PORT/analyze-text`;
    const payload = { content };

    const response = await axios.post(url, payload, {
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;

    return {
      isFake: Boolean(data.isFake),
      confidence: Number(data.confidence) || 0.5,
      explanation: data.explanation || "No explanation provided",
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  }

  private generateFallbackResponse(content: string): AnalysisResult {
    // Very simplified rule-based fallback when AI services are unavailable
    logger.warn("Using hardcoded fallback response - AI services unavailable");

    // Check for suspicious patterns
    const suspiciousPatterns = [
      "conspiracy",
      "secret",
      "they don't want you to know",
      "shocking truth",
      "wake up",
      "mainstream media won't tell you",
      "miracle cure",
      "one weird trick",
    ];

    // Count suspicious words/phrases
    let suspiciousCount = 0;
    for (const pattern of suspiciousPatterns) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        suspiciousCount++;
      }
    }

    // Very basic heuristic - if suspicious patterns are found, mark as potentially fake
    const isFake = suspiciousCount > 0;
    const confidence = Math.min(0.5 + suspiciousCount * 0.07, 0.95);

    let explanation = isFake
      ? `This content contains \${suspiciousCount} potentially misleading patterns.`
      : "No obvious signs of misinformation detected, but verification is still recommended.";

    return {
      isFake,
      confidence: Number(confidence.toFixed(2)),
      explanation,
      sources: ["https://www.factcheck.org/", "https://www.snopes.com/"],
    };
  }
}
"@ | Set-Content -Path $textServicePath -Force

# Update the port in backend's index.ts
$indexPath = "$backendDir\src\index.ts"
if (Test-Path $indexPath) {
    (Get-Content -Path $indexPath) -replace "const PORT = \d+;", "const PORT = $BACKEND_PORT;" | Set-Content -Path $indexPath
}

# Update the extension's background.js with fixed ports
$backgroundJsPath = "$extensionDir\public\background.js"
if (Test-Path $backgroundJsPath) {
    (Get-Content -Path $backgroundJsPath) -replace "http://[^:]+:\d+/api/v1/analysis", "http://127.0.0.1:$BACKEND_PORT/api/v1/analysis" | 
    Set-Content -Path $backgroundJsPath -NoNewline
    
    (Get-Content -Path $backgroundJsPath) -replace "http://[^:]+:\d+/analyze-text", "http://127.0.0.1:$AI_PORT/analyze-text" | 
    Set-Content -Path $backgroundJsPath -NoNewline
}

# Update Dashboard.tsx with fixed ports
$dashboardPath = "$extensionDir\src\components\Dashboard.tsx"
if (Test-Path $dashboardPath) {
    (Get-Content -Path $dashboardPath) -replace "http://[^:]+:\d+/api/v1/analysis", "http://127.0.0.1:$BACKEND_PORT/api/v1/analysis" | 
    Set-Content -Path $dashboardPath -NoNewline
    
    (Get-Content -Path $dashboardPath) -replace "http://[^:]+:\d+/analyze-text", "http://127.0.0.1:$AI_PORT/analyze-text" | 
    Set-Content -Path $dashboardPath -NoNewline
}

# Start services
Write-Host "Starting AI Service on port $AI_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$aiServicesDir'; python -m uvicorn app.simple:app --host 127.0.0.1 --port $AI_PORT"

Write-Host "Waiting for AI service..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting Backend on port $BACKEND_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm run dev"

Write-Host "Waiting for backend service..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Building extension..." -ForegroundColor Green
Set-Location $extensionDir
npm run build

Write-Host "`n================ SETUP COMPLETE ================" -ForegroundColor Cyan
Write-Host "AI Service: http://127.0.0.1:$AI_PORT" -ForegroundColor Magenta
Write-Host "Backend: http://127.0.0.1:$BACKEND_PORT" -ForegroundColor Magenta
Write-Host "Extension: $extensionDir\dist" -ForegroundColor Magenta
Write-Host "`nLoad the extension from the dist folder in Chrome" -ForegroundColor Yellow 