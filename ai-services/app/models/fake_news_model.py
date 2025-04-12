from transformers import pipeline

class FakeNewsAnalyzer:
    def __init__(self):
        self.model = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

    def analyze(self, text: str):
        output = self.model(text)[0]
        label = output["label"]
        confidence = round(output["score"], 2)

        # Map sentiment to fake/real for simulation
        mapped_label = "REAL" if label == "POSITIVE" else "FAKE"

        return {
            "label": mapped_label,
            "confidence": confidence
        }
