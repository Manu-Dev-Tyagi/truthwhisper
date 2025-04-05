// src/nlp-processor.ts
import { NewsDataFactCheck } from '@helpers/factcheck-integration';

export async function analyzeText(content: string): Promise<{
  isFake: boolean;
  confidence: number;
  explanation: string;
  sources: string[];
}> {
  const suspiciousKeywords = ['miracle', 'secret', 'shocking', 'cure'];
  const containsSuspicious = suspiciousKeywords.some((kw) =>
    content.toLowerCase().includes(kw)
  );

  let isFake = containsSuspicious;
  let confidence = containsSuspicious ? 0.7 : 0.3;
  let explanation = containsSuspicious
    ? 'Contains suspicious keywords commonly found in misinformation.'
    : 'No suspicious keywords found.';
  let sources: string[] = [];

  try {
    const factCheckResult = await NewsDataFactCheck.verifyClaim(content);
    if (factCheckResult.rating < 0.5) {
      isFake = true;
      confidence = Math.max(confidence, 1 - factCheckResult.rating);
      explanation += `\nFact-check rating suggests low credibility.`;
    } else {
      explanation += `\nFact-check rating supports credibility.`;
    }
    sources = factCheckResult.sources;
  } catch (error) {
    console.error("❌ Error in verifyClaim:", error);
    explanation += `\nCould not verify claim via NewsData Fact Check API.`;
  }

  return {
    isFake,
    confidence,
    explanation,
    sources
  };
}
