import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private readonly openai: OpenAI;
  private readonly encoder;
  private readonly summaryModel = 'gpt-4o-mini';
  private readonly minTokensForSummary = 200; // Only summarize chunks >200 tokens
  private readonly batchSize = 10; // Summaries per API call

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
    this.openai = new OpenAI({ apiKey });
    this.encoder = encoding_for_model('text-embedding-3-small');
  }

  /**
   * Generate a concise summary for a chunk (1-2 sentences)
   */
  async generateSummary(chunkContent: string): Promise<string> {
    const tokenCount = this.encoder.encode(chunkContent).length;
    
    // Skip summarization for small chunks
    if (tokenCount < this.minTokensForSummary) {
      return chunkContent; // Return original for small chunks
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.summaryModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a summarization assistant. Create a concise 1-2 sentence summary that captures the key ideas and main points of the given text. Preserve important technical terms, names, and concepts.',
          },
          {
            role: 'user',
            content: `Summarize the following text in 1-2 sentences:\n\n${chunkContent}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const summary = response.choices[0]?.message?.content?.trim();
      if (!summary) {
        this.logger.warn('Empty summary returned, using original content');
        return chunkContent;
      }

      return summary;
    } catch (error: any) {
      this.logger.error(`Failed to generate summary: ${error.message}`);
      // Fallback to original content on error
      return chunkContent;
    }
  }

  /**
   * Generate summaries for multiple chunks in batches
   */
  async generateSummariesBatch(chunks: string[]): Promise<string[]> {
    const summaries: string[] = [];
    
    // Filter chunks that need summarization
    const chunksToSummarize = chunks.map((content, idx) => {
      const tokenCount = this.encoder.encode(content).length;
      return { content, idx, needsSummary: tokenCount >= this.minTokensForSummary };
    });

    // Process in batches
    for (let i = 0; i < chunksToSummarize.length; i += this.batchSize) {
      const batch = chunksToSummarize.slice(i, i + this.batchSize);
      const batchSummaries = await Promise.all(
        batch.map(async (item) => {
          if (!item.needsSummary) {
            return item.content; // Return original for small chunks
          }
          return this.generateSummary(item.content);
        }),
      );

      summaries.push(...batchSummaries);
    }

    // Reorder summaries to match original chunk order
    const orderedSummaries: string[] = new Array(chunks.length);
    let summaryIdx = 0;
    chunksToSummarize.forEach((item) => {
      orderedSummaries[item.idx] = summaries[summaryIdx];
      summaryIdx++;
    });

    return orderedSummaries;
  }

  /**
   * Check if a chunk needs summarization
   */
  needsSummarization(chunkContent: string): boolean {
    const tokenCount = this.encoder.encode(chunkContent).length;
    return tokenCount >= this.minTokensForSummary;
  }
}
