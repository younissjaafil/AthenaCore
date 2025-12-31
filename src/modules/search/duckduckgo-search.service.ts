import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

@Injectable()
export class DuckDuckGoSearchService {
  private readonly logger = new Logger(DuckDuckGoSearchService.name);

  /**
   * Search DuckDuckGo for web results
   * Uses DuckDuckGo's HTML search endpoint
   */
  async search(
    query: string,
    maxResults: number = 5,
  ): Promise<WebSearchResult[]> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        query,
      )}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data as unknown as string);
      const results: WebSearchResult[] = [];

      // DuckDuckGo HTML structure: results are in .result divs
      ($('.result') as any).each((index: number, element: any) => {
        if (results.length >= maxResults) return false;

        const $result = $(element) as any;
        const titleElement = $result.find('.result__title a');
        const title = String(titleElement.text()).trim();
        const url = String(titleElement.attr('href') || '');
        const snippet = String($result.find('.result__snippet').text()).trim();

        if (title && url && snippet) {
          // Clean up URL (DuckDuckGo adds redirect URLs)
          const cleanUrl = this.cleanUrl(url);

          results.push({
            title,
            url: cleanUrl,
            snippet,
          });
        }
      });

      this.logger.log(
        `DuckDuckGo search for "${query}" returned ${results.length} results`,
      );
      return results;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`DuckDuckGo search failed: ${errorMessage}`);

      // Return empty results on error rather than throwing
      return [];
    }
  }

  /**
   * Format search results as context for LLM
   */
  formatSearchResultsAsContext(results: WebSearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    let context = '\n## 🌐 WEB SEARCH RESULTS\n\n';

    results.forEach((result, index) => {
      context += `### Result ${index + 1}: ${result.title}\n`;
      context += `URL: ${result.url}\n`;
      context += `Snippet: ${result.snippet}\n\n`;
    });

    context += '---\n';
    context +=
      'Use the information from these web search results to provide accurate, up-to-date information. ';
    context +=
      'Cite the sources when referencing specific information from the search results.\n';

    return context;
  }

  /**
   * Clean DuckDuckGo redirect URL
   */
  private cleanUrl(url: string): string {
    // DuckDuckGo uses redirect URLs like /l/?kh=-1&uddg=https://example.com
    const match = url.match(/uddg=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return url;
  }
}
