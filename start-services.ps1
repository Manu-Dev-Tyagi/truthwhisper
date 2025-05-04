Write-Host "Starting TruthWhisper Services" -ForegroundColor Cyan

# Kill existing processes that might be using the ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
taskkill /F /FI "IMAGENAME eq node.exe" 2>$null
taskkill /F /FI "IMAGENAME eq python.exe" 2>$null

# Configure service ports
$AI_PORT = 9000
$BACKEND_PORT = 3333

# Update the backend configuration to use fallback directly
Write-Host "Updating backend configuration..." -ForegroundColor Yellow
(Get-Content -Path "./backend/src/services/analysis/text.service.ts") -replace "http://localhost:8888/analyze-text/advanced", "http://localhost:$AI_PORT/analyze-text/advanced" -replace "http://localhost:8888/analyze-text", "http://localhost:$AI_PORT/analyze-text" | Set-Content -Path "./backend/src/services/analysis/text.service.ts"

# Start AI service in a new PowerShell window
Write-Host "Starting AI Service on port $AI_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\ai-services'; Write-Host 'Starting AI Service...' -ForegroundColor Cyan; python -m uvicorn app.main:app --reload --host localhost --port $AI_PORT"

# Wait for a moment to let AI service initialize
Write-Host "Waiting for AI service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Backend service in a new PowerShell window
Write-Host "Starting Backend on port $BACKEND_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Starting Backend Service...' -ForegroundColor Cyan; npm run dev"

# Build the Chrome extension
Write-Host "Building Chrome extension..." -ForegroundColor Green
cd ./extension
npm run build

Write-Host "All services started! Load the extension from ./extension/dist folder." -ForegroundColor Cyan
Write-Host "API URLs:" -ForegroundColor Magenta
Write-Host "- AI Service: http://localhost:$AI_PORT" -ForegroundColor Magenta
Write-Host "- Backend Service: http://localhost:$BACKEND_PORT" -ForegroundColor Magenta 