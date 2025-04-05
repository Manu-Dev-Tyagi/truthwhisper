import { SpeechClient } from '@google-cloud/speech';
import { DefakeAnalyzer } from './defake-analyzer';
import { AnalysisResult } from '../../shared/schemas/analysis-schemas';
import ffmpeg from 'fluent-ffmpeg';
import { tmpdir } from 'os';

export class AudioAnalyzer {
  private speechClient = new SpeechClient();
  private defakeAnalyzer = new DefakeAnalyzer();

  async analyzeAudio(audioBuffer: Buffer): Promise<AnalysisResult> {
    // Convert audio to standard format
    const processedAudio = await this.preprocessAudio(audioBuffer);
    
    // Speech to text
    const transcription = await this.speechToText(processedAudio);
    
    // Voice authentication
    const defakeScore = await this.defakeAnalyzer.analyze(processedAudio);

    return {
      isFake: defakeScore > 0.85,
      confidence: defakeScore,
      explanation: `Audio contains synthetic voice patterns. Transcription: ${transcription}`,
      sources: []
    };
  }

  private async preprocessAudio(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tempPath = `${tmpdir()}/${Date.now()}.wav`;
      ffmpeg()
        .input(buffer)
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .on('end', () => resolve(fs.readFileSync(tempPath)))
        .on('error', reject)
        .save(tempPath);
    });
  }
}