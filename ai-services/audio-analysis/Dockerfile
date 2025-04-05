FROM nvidia/cuda:11.8.0-base-ubuntu22.04

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3.10 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download pretrained models
RUN python -c "from transformers import pipeline; pipeline('audio-classification', model='facebook/wav2vec2-base-960h')"

COPY . .

EXPOSE 5002
CMD ["python", "service.py"]