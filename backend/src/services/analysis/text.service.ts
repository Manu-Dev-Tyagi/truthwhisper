import axios, { AxiosError } from "axios";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

interface AnalysisResult {
  isFake: boolean;
  confidence: number;
  explanation: string;
  sources: string[];
}

export class TextAnalysisService {
  async analyze(content: string): Promise<AnalysisResult> {
    // Try primary endpoint first
    try {
      const result = await this.callAIService(content);
      return result;
    } catch (error) {
      logger.error("Primary AI service failed, trying fallback", error);

      // Try fallback to direct AI service
      try {
        return await this.callDirectAIService(content);
      } catch (fallbackError) {
        logger.error("Fallback AI service also failed", fallbackError);

        // Return dummy response as last resort
        return this.generateFallbackResponse(content);
      }
    }
  }

  private async callAIService(content: string): Promise<AnalysisResult> {
    // TEMPORARY CHANGE: Direct connection to Google Fact Check API service
    const url = "http://127.0.0.1:9999/analyze-text";
    const payload = { content };

    logger.info(
      `🔍 Sending content to Google Fact Check API Service at ${url}`
    );

    const response = await axios.post(url, payload, {
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;

    return {
      isFake: data.isFake === null ? false : Boolean(data.isFake),
      confidence: data.isFake === null ? 0.5 : Number(data.confidence) || 0.5,
      explanation:
        data.isFake === null
          ? "Unable to verify: No fact-checks found for this claim. TruthWhisper cannot determine if this is true or false."
          : data.explanation || "No explanation provided",
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  }

  private async callDirectAIService(content: string): Promise<AnalysisResult> {
    logger.info("Trying direct call to Google Fact Check API service");
    // TEMPORARY CHANGE: Direct connection to Google Fact Check API service
    const url = "http://127.0.0.1:9999/analyze-text";
    const payload = { content };

    const response = await axios.post(url, payload, {
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;

    return {
      isFake: data.isFake === null ? false : Boolean(data.isFake),
      confidence: data.isFake === null ? 0.5 : Number(data.confidence) || 0.5,
      explanation:
        data.isFake === null
          ? "Unable to verify: No fact-checks found for this claim. TruthWhisper cannot determine if this is true or false."
          : data.explanation || "No explanation provided",
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  }

  private generateFallbackResponse(text: string): AnalysisResult {
    // Very simplified rule-based fallback when AI services are unavailable
    logger.warn("Using hardcoded fallback response - AI services unavailable");

    // Check for suspicious patterns
    const suspiciousPatterns = [
      "conspiracy",
      "secret",
      "they don't want you to know",
      "shocking truth",
      "wake up",
      "mainstream media won't tell you",
      "miracle cure",
      "one weird trick",
    ];

    // Count suspicious words/phrases
    let suspiciousCount = 0;
    for (const pattern of suspiciousPatterns) {
      if (text.toLowerCase().includes(pattern.toLowerCase())) {
        suspiciousCount++;
      }
    }

    // Very basic heuristic - if suspicious patterns are found, mark as potentially fake
    const isFake = suspiciousCount > 0;
    const confidence = Math.min(0.5 + suspiciousCount * 0.07, 0.95);

    let explanation = isFake
      ? `This content contains ${suspiciousCount} potentially misleading patterns.`
      : "No obvious signs of misinformation detected, but verification is still recommended.";

    return {
      isFake,
      confidence: Number(confidence.toFixed(2)),
      explanation,
      sources: ["https://www.factcheck.org/", "https://www.snopes.com/"],
    };
  }
}
