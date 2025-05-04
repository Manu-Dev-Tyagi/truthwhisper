import { z } from 'zod';

const analysisSchema = z.object({
  content: z.string().min(10).max(10000),
  contentType: z.enum(['text', 'image', 'audio']),
  sessionId: z.string().uuid().optional()
});

export const validateAnalysisRequest = (data: unknown) => {
  return analysisSchema.parse(data);
};
