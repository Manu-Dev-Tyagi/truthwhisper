from fastapi import FastAPI, HTTPException
import sys
import os

# Add the parent directory to the path so we can import app.* modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.analyze_request import AnalyzeRequest, AnalyzeResponse
from app.models.fake_news_model import FakeNewsAnalyzer
from app.models.advanced_fact_check_model import AdvancedFactCheckModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TruthWhisper AI Service",
    description="AI-powered fact-checking service for analyzing text content",
    version="1.0.0"
)

# Initialize models
analyzer = FakeNewsAnalyzer()
advanced_analyzer = AdvancedFactCheckModel()

@app.post("/analyze-text", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    """
    Analyze text content using the basic fact-checking model
    """
    try:
        if not request.content or len(request.content.strip()) == 0:
            raise ValueError("Content cannot be empty")
            
        logger.info(f"Analyzing text: {request.content[:50]}...")
        result = analyzer.analyze(request.content)
        logger.info(f"Analysis complete: {result['label']} with confidence {result['confidence']}")
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze-text/advanced", response_model=AnalyzeResponse)
async def analyze_text_advanced(request: AnalyzeRequest):
    """
    Analyze text content using the advanced, comprehensive fact-checking model
    """
    try:
        result = advanced_analyzer.analyze(request.content)
        return result
    except Exception as e:
        logger.error(f"Advanced analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Advanced analysis failed: " + str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TruthWhisper AI"}

# Add a simple endpoint for testing
@app.get("/")
async def root():
    return {"message": "TruthWhisper AI Service is running. Use /analyze-text endpoint to analyze content."}
