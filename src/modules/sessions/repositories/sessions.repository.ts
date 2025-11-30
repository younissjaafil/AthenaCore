import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Session, SessionStatus } from '../entities/session.entity';

@Injectable()
export class SessionsRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repository: Repository<Session>,
  ) {}

  async create(data: Partial<Session>): Promise<Session> {
    const session = this.repository.create(data);
    return this.repository.save(session);
  }

  async findById(id: string): Promise<Session | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'creator', 'creator.user'],
    });
  }

  async findByUser(userId: string): Promise<Session[]> {
    return this.repository.find({
      where: { userId },
      relations: ['creator', 'creator.user'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async findByCreator(creatorId: string): Promise<Session[]> {
    return this.repository.find({
      where: { creatorId },
      relations: ['user', 'creator', 'creator.user'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async findUpcoming(userId: string): Promise<Session[]> {
    const now = new Date();
    return this.repository.find({
      where: {
        userId,
        scheduledAt: MoreThan(now),
        status: SessionStatus.CONFIRMED,
      },
      relations: ['creator', 'creator.user'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByDateRange(
    creatorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Session[]> {
    return this.repository.find({
      where: {
        creatorId,
        scheduledAt: Between(startDate, endDate),
      },
      order: { scheduledAt: 'ASC' },
    });
  }

  async findConflicting(
    creatorId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ): Promise<Session[]> {
    const sessionEnd = new Date(
      scheduledAt.getTime() + durationMinutes * 60000,
    );

    return this.repository
      .createQueryBuilder('session')
      .where('session.creatorId = :creatorId', { creatorId })
      .andWhere('session.status IN (:...statuses)', {
        statuses: [SessionStatus.CONFIRMED, SessionStatus.IN_PROGRESS],
      })
      .andWhere(
        '(session.scheduledAt < :sessionEnd AND ' +
          "session.scheduledAt + INTERVAL '1 minute' * session.durationMinutes > :scheduledAt)",
        {
          scheduledAt,
          sessionEnd,
        },
      )
      .getMany();
  }

  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findSessionsNeedingReminder(): Promise<Session[]> {
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    return this.repository.find({
      where: {
        scheduledAt: Between(now, reminderWindow),
        status: SessionStatus.CONFIRMED,
      },
      relations: ['user', 'creator'],
    });
  }
}
