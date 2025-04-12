import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface AnalysisResult {
  isFake: boolean;
  confidence: number;
  explanation: string;
  sources: string[];
}

export class TextAnalysisService {
  async analyze(content: string): Promise<AnalysisResult> {
    const url = `http://localhost:8000/analyze-text`;
    const payload = { content };

    try {
      logger.info(`🔍 Sending content to AI Text Service at ${url}`);
      console.debug(`Payload: ${JSON.stringify(payload)}`);

      const response = await axios.post(url, payload);
      const data = response.data;

      return {
        isFake: data.isFake,
        confidence: data.confidence,
        explanation: data.explanation,
        sources: data.sources || []
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`❌ AI Text Service request failed: ${error.message}`);
        if (error.response) {
          logger.error(`Response status: ${error.response.status}`);
          logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
      } else {
        logger.error('❌ Unknown error during text analysis', error as Error);
      }

      throw new Error('Text analysis service unavailable');
    }
  }
}
