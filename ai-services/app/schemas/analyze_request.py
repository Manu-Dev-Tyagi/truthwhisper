from pydantic import BaseModel
from typing import List

class AnalyzeRequest(BaseModel):
    content: str

class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    explanation: str
    sources: List[str]
    isFake: bool
