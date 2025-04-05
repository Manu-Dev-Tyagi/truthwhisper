FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download NLP models during build
RUN python -c "import nltk; nltk.download('punkt', download_dir='/usr/local/nltk_data')"
RUN python -c "import nltk; nltk.download('stopwords', download_dir='/usr/local/nltk_data')"

EXPOSE 5000
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000", "-w", "4"]