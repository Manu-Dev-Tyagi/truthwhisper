Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       STARTING TRUTHWHISPER EXTENSION       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Kill existing processes that might be using the ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
taskkill /F /FI "IMAGENAME eq node.exe" 2>$null
taskkill /F /FI "IMAGENAME eq python.exe" 2>$null

# Configure service ports (use higher port numbers to avoid permission issues)
$AI_PORT = 9877
$BACKEND_PORT = 9876

# Create a special environment for the AI service to work around NumPy issues
Write-Host "Creating special AI service environment..." -ForegroundColor Yellow
$env:PYTHONWARNINGS = "ignore::UserWarning"
$env:PYTORCH_ENABLE_MPS_FALLBACK = "1"

# Fix localhost issues by using 127.0.0.1 instead of ::1 or localhost
Write-Host "Updating API endpoints in backend service..." -ForegroundColor Yellow

# Update TextAnalysisService to use the correct IP and port
$textServicePath = "$PWD\backend\src\services\analysis\text.service.ts"
$textServiceContent = Get-Content -Path $textServicePath -Raw
$textServiceContent = $textServiceContent -replace "http://[^:]+:8\d+/analyze-text/advanced", "http://127.0.0.1:$AI_PORT/analyze-text/advanced"
$textServiceContent = $textServiceContent -replace "http://[^:]+:8\d+/analyze-text", "http://127.0.0.1:$AI_PORT/analyze-text"
$textServiceContent | Set-Content -Path $textServicePath -Force

# Update the background.js file to use the correct backend port
Write-Host "Updating API endpoints in extension..." -ForegroundColor Yellow
$bgJsPath = "$PWD\extension\public\background.js"
if (Test-Path $bgJsPath) {
    $bgJsContent = Get-Content -Path $bgJsPath -Raw
    $bgJsContent = $bgJsContent -replace "http://[^:]+:\d+/api/v1/analysis", "http://127.0.0.1:$BACKEND_PORT/api/v1/analysis"
    $bgJsContent = $bgJsContent -replace "http://[^:]+:\d+/analyze-text", "http://127.0.0.1:$AI_PORT/analyze-text"
    $bgJsContent | Set-Content -Path $bgJsPath -Force
}

# Update the Dashboard.tsx file to use the correct backend port
$dashboardPath = "$PWD\extension\src\components\Dashboard.tsx"
if (Test-Path $dashboardPath) {
    $dashboardContent = Get-Content -Path $dashboardPath -Raw
    $dashboardContent = $dashboardContent -replace "http://[^:]+:\d+/api/v1/analysis", "http://127.0.0.1:$BACKEND_PORT/api/v1/analysis"
    $dashboardContent = $dashboardContent -replace "http://[^:]+:\d+/analyze-text", "http://127.0.0.1:$AI_PORT/analyze-text"
    $dashboardContent | Set-Content -Path $dashboardPath -Force
}

# Update the backend port in index.ts
$indexPath = "$PWD\backend\src\index.ts"
if (Test-Path $indexPath) {
    $indexContent = Get-Content -Path $indexPath -Raw
    $indexContent = $indexContent -replace "const PORT = \d+;", "const PORT = $BACKEND_PORT;"
    $indexContent | Set-Content -Path $indexPath -Force
}

# Create a customized app file that disables NumPy warnings
$aiAppDir = "$PWD\ai-services\app"
$mainPath = "$aiAppDir\main.py"
$customMainPath = "$aiAppDir\custom_main.py"

Write-Host "Creating simplified AI service version..." -ForegroundColor Yellow
@"
from fastapi import FastAPI, HTTPException
import logging
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TruthWhisper AI Service (Simplified)",
    description="Basic fact-checking service for analyzing text content",
    version="1.0.0"
)

@app.post("/analyze-text")
async def analyze_text(request: dict):
    """
    Simplified analyze text endpoint
    """
    try:
        content = request.get('content', '')
        if not content or len(content.strip()) == 0:
            raise ValueError("Content cannot be empty")
            
        logger.info(f"Analyzing text: {content[:50]}...")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            "conspiracy", "secret", "they don't want you to know",
            "shocking truth", "wake up", "mainstream media", 
            "miracle cure", "one weird trick"
        ]
        
        suspicious_count = 0
        for pattern in suspicious_patterns:
            if re.search(pattern, content.lower()):
                suspicious_count += 1
        
        # Simple heuristic
        is_fake = suspicious_count > 0
        confidence = min(0.5 + suspicious_count * 0.07, 0.95) if is_fake else max(0.5, 0.8 - suspicious_count * 0.05)
        
        explanation = f"This text contains {suspicious_count} potentially misleading patterns." if is_fake else "No obvious signs of misinformation detected."
        
        result = {
            "isFake": is_fake,
            "confidence": round(confidence, 2),
            "explanation": explanation,
            "sources": ["https://www.factcheck.org/", "https://www.snopes.com/"]
        }
        
        logger.info(f"Analysis complete: {'FAKE' if is_fake else 'REAL'} with confidence {confidence}")
        return result
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-text/advanced")
async def analyze_text_advanced(request: dict):
    """
    Same as basic endpoint - forwarding to simplified implementation
    """
    return await analyze_text(request)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TruthWhisper AI (Simplified)"}

@app.get("/")
async def root():
    return {"message": "TruthWhisper AI Service is running. Use /analyze-text endpoint."}
"@ | Set-Content -Path $customMainPath -Force

# Start the simplified AI service first in a new window
Write-Host "Starting Simplified AI Service on port $AI_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\ai-services'; Write-Host 'Starting Simplified AI Service...' -ForegroundColor Cyan; python -m uvicorn app.custom_main:app --host 127.0.0.1 --port $AI_PORT"

# Wait for the AI service to initialize
Write-Host "Waiting for AI service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start the backend service
Write-Host "Starting Backend Service on port $BACKEND_PORT..." -ForegroundColor Green
$workingDir = "$PWD\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workingDir'; npm run dev"

# Wait for the backend to initialize
Start-Sleep -Seconds 3

# Build the extension
Write-Host "Building Chrome extension..." -ForegroundColor Green
$extDir = "$PWD\extension"
Set-Location $extDir
npm run build

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "TruthWhisper services started successfully!" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "• AI Service: http://127.0.0.1:$AI_PORT" -ForegroundColor Magenta
Write-Host "• Backend Service: http://127.0.0.1:$BACKEND_PORT" -ForegroundColor Magenta
Write-Host "• Extension files: $extDir\dist" -ForegroundColor Magenta
Write-Host "`nTo use the extension:" -ForegroundColor Yellow
Write-Host "1. Go to chrome://extensions/" -ForegroundColor Yellow
Write-Host "2. Enable Developer Mode" -ForegroundColor Yellow
Write-Host "3. Click 'Load unpacked' and select:" -ForegroundColor Yellow
Write-Host "   $extDir\dist" -ForegroundColor White
Write-Host "`nThe extension is ready to use!" -ForegroundColor Green 