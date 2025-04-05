import { z } from 'zod';

export const AnalysisResultSchema = z.object({
  isFake: z.boolean(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  sources: z.array(z.string())
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;