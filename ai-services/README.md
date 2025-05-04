# TruthWhisper AI Service - Google Fact Check API Integration

This service provides real-time fact-checking capabilities by leveraging the Google Fact Check API to analyze claims in text.

## Setup

1. **Install dependencies**

```bash
pip install -r requirements.txt
```

2. **Get a Google API Key**

To use the Google Fact Check API, you need an API key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Fact Check Tools API" for your project
4. Create an API key from the "Credentials" section
5. Make sure to restrict the API key to only the "Fact Check Tools API"

6. **Set the API Key as an environment variable**

For Windows (PowerShell):

```powershell
$env:GOOGLE_FACT_CHECK_API_KEY = "your-api-key-here"
```

For Windows (Command Prompt):

```cmd
set GOOGLE_FACT_CHECK_API_KEY=your-api-key-here
```

For Linux/macOS:

```bash
export GOOGLE_FACT_CHECK_API_KEY="your-api-key-here"
```

## Starting the Service

Start the service with:

```bash
python -m uvicorn app.custom_main:app --host 127.0.0.1 --port 9999
```

The service will be available at `http://127.0.0.1:9999`

## API Endpoints

### Analyze Text

**POST** `/analyze-text`

Request body:

```json
{
  "content": "Your text to fact-check here"
}
```

Response:

```json
{
  "isFake": false,
  "confidence": 0.25,
  "explanation": "Your text matches previously fact-checked claims including: 'Example claim'. 3 fact-checkers rated similar claims as true or accurate, while 1 rated them as false.",
  "sources": [
    "https://www.snopes.com/fact-check/example-claim/",
    "https://www.factcheck.org/2023/05/example-claim-verification/"
  ]
}
```

### Advanced Text Analysis

**POST** `/analyze-text/advanced`

Same as `/analyze-text` but accepts different request formats for backward compatibility.

### Health Check

**GET** `/health`

Checks the health of the service and API key configuration.

## How It Works

1. The service receives text to fact-check
2. It queries the Google Fact Check API to find matching claims
3. If matches are found, it analyzes the ratings from fact-checkers
4. It determines if the content is likely true or false based on fact-checker consensus
5. It returns a verdict with confidence score, explanation, and sources

## Limitations

- The Google Fact Check API only contains claims that have been previously fact-checked
- For new or unique claims not previously checked, the service will indicate that no matches were found
- API usage is subject to Google's rate limits and terms of service
