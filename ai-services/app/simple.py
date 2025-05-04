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
