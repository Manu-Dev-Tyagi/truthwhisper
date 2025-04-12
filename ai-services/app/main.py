from fastapi import FastAPI, HTTPException
from app.schemas.analyze_request import AnalyzeRequest
from app.models.fake_news_model import FakeNewsAnalyzer

app = FastAPI()

analyzer = FakeNewsAnalyzer()

@app.post("/analyze-text")
async def analyze_text(request: AnalyzeRequest):
    try:
        result = analyzer.analyze(request.content)
        return {
            "label": result["label"],
            "confidence": result["confidence"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Analysis failed: " + str(e))
