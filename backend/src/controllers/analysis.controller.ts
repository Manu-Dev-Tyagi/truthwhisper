import { Request, Response } from 'express';
import { TextAnalysisService } from '../services/analysis/text.service';
import { validateAnalysisRequest } from '../utils/validation';
import { logger } from '../utils/logger';
import { z } from 'zod'; // Add Zod import

export class AnalysisController {
  static async analyzeContent(req: Request, res: Response) {
    try {
      console.log('📥 Received request with content:', req.body.content);
      console.log('🔍 Full request body:', JSON.stringify(req.body, null, 2));

      // Validate request with proper error handling
      const { content, contentType } = validateAnalysisRequest(req.body);
      
      console.log(`⚙️ Processing ${contentType}:`, content.substring(0, 50) + (content.length > 50 ? '...' : ''));
      
      const result = await new TextAnalysisService().analyze(content);
      
      console.log('✅ Analysis completed:', JSON.stringify(result, null, 2));
      
      res.json({ 
        success: true, 
        data: {
          ...result,
          contentType // Return the validated content type
        }
      });
    } catch (error) {
      console.error('Analysis error:', error);
      logger.error('Analysis failed', error instanceof Error ? error : undefined);
      
      // Improved error response handling
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error'
      });
    }
  }
}
