console.log("💣 DEBUG - Current Dir:", __dirname);
import path from 'path';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { NewsDataFactCheck } from '@helpers/factcheck-integration';
import { analyzeText } from './nlp-processor';
dotenv.config({ path: path.join(__dirname, '../../.env') });
console.log("🔥 NewsDataFactCheck:", NewsDataFactCheck ? "Loaded" : "Missing");
console.log("💣 DEBUG - FactCheck Import:", NewsDataFactCheck);

if (!process.env.NEWSDATA_API_KEY) {
  console.warn('⚠️ Warning: NEWSDATA_API_KEY not found in .env');
}

const app = express();

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.send('✅ AI Text Service is up and running');
});

console.log("✅ NewsDataFactCheck Loaded:", NewsDataFactCheck);

// Main analysis endpoint
app.post('/analyze-text', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("📥 Received request:", req.body);
    const { content } = req.body;

    if (!content) {
      console.error("❌ Error: Missing 'content' field");
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // NLP processing
    const nlpResult = await analyzeText(content);
    console.log("🧠 NLP Result:", nlpResult);

    // Fact-check via NewsData.io
    const factCheckResult = await NewsDataFactCheck.verifyClaim(content);
    console.log("🔎 Fact Check Result:", factCheckResult);

    // Final scoring
    const finalScore = (nlpResult.confidence + factCheckResult.rating) / 2;
    console.log("📊 Final Score:", finalScore);

    // Respond to client
    res.json({
      isFake: finalScore < 0.5,
      confidence: finalScore,
      explanation: `NLP: ${nlpResult.explanation}, NewsData Match Rating: ${factCheckResult.rating}`,
      sources: [...(nlpResult.sources || []), ...factCheckResult.sources],
    });

  } catch (err: any) {
    console.error("❌ Internal Server Error:", err.message);
    console.error("Full Error Stack:", err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Server start
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 AI Text Service running on http://localhost:${PORT}`);
});
