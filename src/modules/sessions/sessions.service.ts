import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionsRepository } from './repositories/sessions.repository';
import { BookSessionDto } from './dto/book-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import {
  Session,
  SessionStatus,
  VideoProvider,
} from './entities/session.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Book a new session
   */
  async bookSession(
    userId: string,
    dto: BookSessionDto,
  ): Promise<SessionResponseDto> {
    const scheduledAt = new Date(dto.scheduledAt);

    // Validate scheduled time is in the future
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Check for conflicting sessions
    const conflicts = await this.sessionsRepository.findConflicting(
      dto.creatorId,
      scheduledAt,
      dto.durationMinutes,
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        'Creator has a conflicting session at this time',
      );
    }

    // Create session
    const session = await this.sessionsRepository.create({
      userId,
      creatorId: dto.creatorId,
      scheduledAt,
      durationMinutes: dto.durationMinutes,
      videoProvider: dto.videoProvider || VideoProvider.JITSI,
      price: dto.price,
      currency: dto.currency || 'USD',
      studentNotes: dto.studentNotes,
      status: SessionStatus.PENDING,
    });

    this.logger.log(
      `Session booked: ${session.id} for user ${userId} with creator ${dto.creatorId}`,
    );

    return this.mapToResponseDto(session);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionResponseDto> {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return this.mapToResponseDto(session);
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionsRepository.findByUser(userId);
    return sessions.map((s) => this.mapToResponseDto(s));
  }

  /**
   * Get creator's sessions
   */
  async getCreatorSessions(creatorId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionsRepository.findByCreator(creatorId);
    return sessions.map((s) => this.mapToResponseDto(s));
  }

  /**
   * Get upcoming sessions for user
   */
  async getUpcomingSessions(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionsRepository.findUpcoming(userId);
    return sessions.map((s) => this.mapToResponseDto(s));
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    userId: string,
    dto: UpdateSessionStatusDto,
  ): Promise<SessionResponseDto> {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Verify user is creator or student
    if (session.userId !== userId && session.creatorId !== userId) {
      throw new BadRequestException('Not authorized to update this session');
    }

    const updates: Partial<Session> = {
      status: dto.status,
    };

    // Generate video room URL when confirming
    if (dto.status === SessionStatus.CONFIRMED && !session.videoRoomUrl) {
      const videoData = this.generateVideoRoom(session.videoProvider as VideoProvider);
      updates.videoRoomUrl = videoData.url;
      updates.videoRoomId = videoData.roomId;
    }

    // Handle cancellation
    if (dto.status === SessionStatus.CANCELLED) {
      updates.cancellationReason = dto.cancellationReason;
    }

    // Add creator notes
    if (dto.creatorNotes && session.creatorId === userId) {
      updates.creatorNotes = dto.creatorNotes;
    }

    const updatedSession = await this.sessionsRepository.update(
      sessionId,
      updates,
    );

    this.logger.log(`Session ${sessionId} status updated to ${dto.status}`);

    return this.mapToResponseDto(updatedSession!);
  }

  /**
   * Cancel session
   */
  async cancelSession(
    sessionId: string,
    userId: string,
    reason?: string,
  ): Promise<SessionResponseDto> {
    return this.updateSessionStatus(sessionId, userId, {
      status: SessionStatus.CANCELLED,
      cancellationReason: reason,
    });
  }

  /**
   * Start session (move to in progress)
   */
  async startSession(sessionId: string): Promise<SessionResponseDto> {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed sessions can be started');
    }

    const updatedSession = await this.sessionsRepository.update(sessionId, {
      status: SessionStatus.IN_PROGRESS,
    });

    return this.mapToResponseDto(updatedSession!);
  }

  /**
   * Complete session
   */
  async completeSession(sessionId: string): Promise<SessionResponseDto> {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress sessions can be completed',
      );
    }

    const updatedSession = await this.sessionsRepository.update(sessionId, {
      status: SessionStatus.COMPLETED,
    });

    return this.mapToResponseDto(updatedSession!);
  }

  /**
   * Generate video room based on provider
   */
  private generateVideoRoom(provider: VideoProvider): {
    url: string;
    roomId: string;
  } {
    const roomId = `athena-session-${randomBytes(8).toString('hex')}`;

    switch (provider) {
      case VideoProvider.JITSI:
        return {
          url: `https://meet.jit.si/${roomId}`,
          roomId,
        };

      case VideoProvider.DAILY:
        // For Daily.co, you would create a room via their API
        // This is a placeholder showing the structure
        return {
          url: `https://athena.daily.co/${roomId}`,
          roomId,
        };

      default:
        // Default to Jitsi for any other provider
        return {
          url: `https://meet.jit.si/${roomId}`,
          roomId,
        };
    }
  }

  /**
   * Map session entity to response DTO
   */
  private mapToResponseDto(session: Session): SessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      creatorId: session.creatorId,
      creatorName: session.creator?.user?.firstName
        ? `${session.creator.user.firstName} ${session.creator.user.lastName || ''}`.trim()
        : undefined,
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes,
      status: session.status as SessionStatus,
      videoProvider: session.videoProvider as VideoProvider,
      videoRoomUrl: session.videoRoomUrl ?? undefined,
      videoRoomId: session.videoRoomId ?? undefined,
      price: session.price ?? undefined,
      currency: session.currency ?? undefined,
      studentNotes: session.studentNotes ?? undefined,
      creatorNotes: session.creatorNotes ?? undefined,
    };
  }
}
