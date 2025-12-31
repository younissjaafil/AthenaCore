import { Module } from '@nestjs/common';
import { DuckDuckGoSearchService } from './duckduckgo-search.service';

@Module({
  providers: [DuckDuckGoSearchService],
  exports: [DuckDuckGoSearchService],
})
export class SearchModule {}
