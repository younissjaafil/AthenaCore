import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import {
  RagQueryLog,
  RagCitation,
  RagOutcome,
  RagFeedback,
} from './entities/rag-query-log.entity';

export interface RagQueryStats {
  latencyMs: number;
  retrievalMs: number;
  openaiMs: number;
  topK: number;
  retrievedCount: number;
  rerankUsed: boolean;
  contextTokenCount: number;
  model: string;
  totalTokensApprox: number;
}

export interface RagGuardrailResult {
  outcome: RagOutcome;
  reason?: string;
}

export interface LogQueryParams {
  userId?: string;
  agentId: string;
  query: string;
  topK: number;
  stats: RagQueryStats;
  citations: RagCitation[];
  guardrail: RagGuardrailResult;
  conversationId?: string;
}

export interface AgentAnalytics {
  totalQueries: number;
  answeredCount: number;
  idkCount: number;
  idkRate: number;
  avgSimilarity: number;
  avgLatencyMs: number;
  avgRetrievalMs: number;
  avgOpenaiMs: number;
  feedbackUpCount: number;
  feedbackDownCount: number;
  feedbackRate: number;
  queriesOverTime: { date: string; count: number }[];
  topIdkReasons: { reason: string; count: number }[];
  // Cost metrics
  totalTokens: number;
  estimatedCostUsd: number;
}

@Injectable()
export class RagQueryLogService {
  private readonly logger = new Logger(RagQueryLogService.name);

  constructor(
    @InjectRepository(RagQueryLog)
    private readonly repo: Repository<RagQueryLog>,
  ) {}

  async logQuery(params: LogQueryParams): Promise<RagQueryLog> {
    const { userId, agentId, query, topK, stats, citations, guardrail, conversationId } =
      params;

    const maxSimilarity = citations.length
      ? Math.max(...citations.map((c) => c.similarity))
      : undefined;

    const log = this.repo.create({
      userId,
      agentId,
      query,
      topK,
      retrievedCount: stats.retrievedCount,
      maxSimilarity,
      rerankUsed: stats.rerankUsed,
      latencyMs: stats.latencyMs,
      retrievalMs: stats.retrievalMs,
      openaiMs: stats.openaiMs,
      contextTokenCount: stats.contextTokenCount,
      model: stats.model,
      totalTokensApprox: stats.totalTokensApprox,
      outcome: guardrail.outcome,
      idkReason: guardrail.reason,
      citations,
      conversationId,
    });

    const saved = await this.repo.save(log);
    this.logger.log(
      `RAG query logged: agent=${agentId} outcome=${guardrail.outcome} latency=${stats.latencyMs}ms`,
    );
    return saved;
  }

  async listLogs(
    agentId: string,
    limit = 50,
    outcome?: RagOutcome,
    feedback?: RagFeedback,
  ): Promise<RagQueryLog[]> {
    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.agent_id = :agentId', { agentId })
      .orderBy('log.created_at', 'DESC')
      .limit(limit);

    if (outcome) {
      qb.andWhere('log.outcome = :outcome', { outcome });
    }
    if (feedback) {
      qb.andWhere('log.feedback = :feedback', { feedback });
    }

    return qb.getMany();
  }

  async setFeedback(
    id: string,
    feedback: RagFeedback,
    comment?: string,
  ): Promise<void> {
    await this.repo.update(id, { feedback, feedbackComment: comment });
    this.logger.log(`Feedback recorded: log=${id} feedback=${feedback}`);
  }

  async getAgentAnalytics(
    agentId: string,
    days = 30,
  ): Promise<AgentAnalytics> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all logs for the period
    const logs = await this.repo.find({
      where: {
        agentId,
        createdAt: MoreThanOrEqual(since),
      },
      order: { createdAt: 'DESC' },
    });

    const totalQueries = logs.length;
    const answeredLogs = logs.filter((l) => l.outcome === 'answered');
    const idkLogs = logs.filter((l) => l.outcome === 'idk');
    const logsWithFeedback = logs.filter((l) => l.feedback);

    // Calculate metrics
    const answeredCount = answeredLogs.length;
    const idkCount = idkLogs.length;
    const idkRate = totalQueries > 0 ? idkCount / totalQueries : 0;

    const avgSimilarity =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.maxSimilarity || 0), 0) / logs.length
        : 0;

    const avgLatencyMs =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + l.latencyMs, 0) / logs.length
        : 0;

    const avgRetrievalMs =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + l.retrievalMs, 0) / logs.length
        : 0;

    const avgOpenaiMs =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + l.openaiMs, 0) / logs.length
        : 0;

    const feedbackUpCount = logs.filter((l) => l.feedback === 'up').length;
    const feedbackDownCount = logs.filter((l) => l.feedback === 'down').length;
    const feedbackRate =
      logsWithFeedback.length > 0
        ? feedbackUpCount / logsWithFeedback.length
        : 0;

    // Calculate total tokens and estimated cost
    const totalTokens = logs.reduce((sum, l) => sum + (l.totalTokensApprox || 0), 0);
    // GPT-4o pricing: ~$2.50/1M input + $10/1M output tokens (avg ~$5/1M)
    // GPT-4o-mini: ~$0.15/1M input + $0.60/1M output tokens (avg ~$0.30/1M)
    // Using conservative estimate of $3/1M tokens for mixed usage
    const estimatedCostUsd = (totalTokens / 1_000_000) * 3;

    // Group by date for chart
    const dateMap = new Map<string, number>();
    for (const log of logs) {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    }
    const queriesOverTime = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top IDK reasons
    const reasonMap = new Map<string, number>();
    for (const log of idkLogs) {
      const reason = log.idkReason || 'unknown';
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    }
    const topIdkReasons = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalQueries,
      answeredCount,
      idkCount,
      idkRate,
      avgSimilarity,
      avgLatencyMs,
      avgRetrievalMs,
      avgOpenaiMs,
      feedbackUpCount,
      feedbackDownCount,
      feedbackRate,
      queriesOverTime,
      topIdkReasons,
      totalTokens,
      estimatedCostUsd,
    };
  }

  async getLogById(id: string): Promise<RagQueryLog | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Reset (delete) all analytics logs for an agent
   */
  async resetAnalytics(agentId: string): Promise<{ deletedCount: number }> {
    const result = await this.repo.delete({ agentId });
    const deletedCount = result.affected || 0;
    this.logger.log(`Analytics reset for agent ${agentId}: ${deletedCount} logs deleted`);
    return { deletedCount };
  }
}
