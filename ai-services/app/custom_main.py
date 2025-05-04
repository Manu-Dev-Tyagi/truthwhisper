from fastapi import FastAPI, HTTPException
import logging
import requests
import os
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import asyncio
from urllib.parse import quote_plus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TruthWhisper AI Service - Google Fact Check API Integration",
    description="Real-time fact-checking service using Google Fact Check API",
    version="1.0.0"
)

# Define models for API data
class FactCheckRequest(BaseModel):
    content: str

class FactCheckResponse(BaseModel):
    isFake: Optional[bool]
    confidence: float
    explanation: str
    sources: List[str]

# Google Fact Check API endpoint
FACT_CHECK_API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

# Try to get API key from environment variables
# You need to set this environment variable with your actual Google API key
API_KEY = os.environ.get("GOOGLE_FACT_CHECK_API_KEY", "")

if not API_KEY:
    logger.warning("GOOGLE_FACT_CHECK_API_KEY environment variable not set! Fact-checking will be limited.")

async def query_fact_check_api(text: str) -> Dict[str, Any]:
    """
    Query the Google Fact Check API with the given text
    """
    if not API_KEY:
        logger.error("Cannot query Google Fact Check API: No API key provided")
        return {"error": "API key not configured"}
    
    # URL encode the query
    encoded_query = quote_plus(text)
    
    # Construct the full API URL with query and key
    url = f"{FACT_CHECK_API_URL}?query={encoded_query}&key={API_KEY}"
    
    try:
        logger.info(f"Querying Google Fact Check API for: {text[:50]}...")
        response = requests.get(url)
        
        if response.status_code != 200:
            logger.error(f"Google Fact Check API returned status {response.status_code}: {response.text}")
            return {"error": f"API error: {response.status_code}"}
            
        data = response.json()
        logger.info(f"Received response from Google Fact Check API with {len(data.get('claims', []))} claims")
        return data
    except Exception as e:
        logger.error(f"Error querying Google Fact Check API: {str(e)}")
        return {"error": str(e)}

def analyze_fact_check_results(data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
    """
    Analyze the results from the Google Fact Check API and determine if the content is fake
    """
    claims = data.get("claims", [])
    
    if not claims:
        logger.info("No claims found in the Google Fact Check API response")
        return {
            "isFake": None,
            "confidence": 0,
            "explanation": "No matching fact checks found for this claim. This doesn't mean the claim is true or false - it means no fact-checkers have addressed it yet.",
            "sources": []
        }
    
    # Count the claim ratings
    ratings = {"true": 0, "false": 0, "mixed": 0, "other": 0}
    sources = []
    matched_claims = []
    
    for claim in claims:
        # Extract the claim rating
        claim_review = claim.get("claimReview", [{}])[0]
        rating = claim_review.get("textualRating", "").lower()
        
        # Categorize the rating
        if "true" in rating or "correct" in rating or "accurate" in rating:
            ratings["true"] += 1
        elif "false" in rating or "fake" in rating or "incorrect" in rating or "misinformation" in rating:
            ratings["false"] += 1
        elif "mixed" in rating or "partly" in rating or "half" in rating:
            ratings["mixed"] += 1
        else:
            ratings["other"] += 1
        
        # Add the source
        source_url = claim_review.get("url", "")
        if source_url and source_url not in sources:
            sources.append(source_url)
            
        # Add the matched claim text
        matched_claim = claim.get("text", "")
        if matched_claim:
            matched_claims.append(matched_claim)
    
    # Determine if the content is fake based on the ratings
    total_ratings = sum(ratings.values())
    true_ratio = ratings["true"] / total_ratings if total_ratings > 0 else 0
    false_ratio = ratings["false"] / total_ratings if total_ratings > 0 else 0
    mixed_ratio = ratings["mixed"] / total_ratings if total_ratings > 0 else 0
    
    is_fake = false_ratio > true_ratio
    
    # Calculate confidence
    if false_ratio > 0.7:
        confidence = 0.9  # High confidence it's fake
    elif true_ratio > 0.7:
        confidence = 0.1  # High confidence it's true (low confidence it's fake)
    elif false_ratio > true_ratio:
        confidence = 0.5 + (false_ratio - true_ratio) * 0.5  # Moderate confidence it's fake
    elif true_ratio > false_ratio:
        confidence = 0.5 - (true_ratio - false_ratio) * 0.5  # Moderate confidence it's true
    else:
        confidence = 0.5  # Uncertain
    
    # Generate an explanation
    if len(matched_claims) > 0:
        claim_text = f"Your text matches previously fact-checked claims including: '{matched_claims[0]}'"
        if len(matched_claims) > 1:
            claim_text += f" and {len(matched_claims)-1} others"
    else:
        claim_text = "Your text was analyzed by fact checkers"
    
    if is_fake:
        explanation = f"{claim_text}. {ratings['false']} fact-checkers rated similar claims as false or misleading, while {ratings['true']} rated them as true."
    else:
        explanation = f"{claim_text}. {ratings['true']} fact-checkers rated similar claims as true or accurate, while {ratings['false']} rated them as false."
    
    if mixed_ratio > 0.3:
        explanation += " There is mixed consensus among fact-checkers on this topic."
    
    return {
        "isFake": is_fake,
        "confidence": round(confidence, 2),
        "explanation": explanation,
        "sources": sources[:5]  # Limit to 5 sources
    }

@app.post("/analyze-text", response_model=FactCheckResponse)
async def analyze_text(request: FactCheckRequest):
    """
    Analyze text using Google Fact Check API
    """
    try:
        content = request.content
        if not content or len(content.strip()) == 0:
            raise ValueError("Content cannot be empty")
            
        logger.info(f"Analyzing text: {content[:100]}...")
        
        # Query the Google Fact Check API
        fact_check_data = await query_fact_check_api(content)
        
        if "error" in fact_check_data:
            logger.warning(f"Error from Google Fact Check API: {fact_check_data['error']}")
            result = {
                "isFake": False,
                "confidence": 0.5,
                "explanation": f"Unable to verify: {fact_check_data['error']}. Please try again later.",
                "sources": []
            }
        else:
            # Analyze the results from the Google Fact Check API
            result = analyze_fact_check_results(fact_check_data, content)
        
        logger.info(f"Analysis complete: {'FAKE' if result['isFake'] else 'REAL'} with confidence {result['confidence']}")
        return result
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-text/advanced")
async def analyze_text_advanced(request: dict):
    """
    Advanced text analysis - same implementation as the basic endpoint
    """
    # Convert dict to FactCheckRequest model
    req = FactCheckRequest(content=request.get("content", ""))
    return await analyze_text(req)

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    # Check if the API key is set
    api_status = "configured" if API_KEY else "missing"
    
    return {
        "status": "healthy", 
        "service": "TruthWhisper AI - Google Fact Check API", 
        "api_key_status": api_status
    }

@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "TruthWhisper AI Service is running with Google Fact Check API integration.",
        "endpoints": {
            "/analyze-text": "Analyze text using Google Fact Check API",
            "/analyze-text/advanced": "Advanced text analysis (same as analyze-text)",
            "/health": "Health check"
        }
    }
