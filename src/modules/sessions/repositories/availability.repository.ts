import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreatorAvailability,
  DayOfWeek,
} from '../entities/creator-availability.entity';
import { SessionSettings } from '../entities/session-settings.entity';

@Injectable()
export class AvailabilityRepository {
  constructor(
    @InjectRepository(CreatorAvailability)
    private readonly availabilityRepo: Repository<CreatorAvailability>,
    @InjectRepository(SessionSettings)
    private readonly settingsRepo: Repository<SessionSettings>,
  ) {}

  // Availability methods
  async findByCreator(creatorId: string): Promise<CreatorAvailability[]> {
    return this.availabilityRepo.find({
      where: { creatorId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findActiveByCreator(creatorId: string): Promise<CreatorAvailability[]> {
    return this.availabilityRepo.find({
      where: { creatorId, isActive: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findByCreatorAndDay(
    creatorId: string,
    dayOfWeek: DayOfWeek,
  ): Promise<CreatorAvailability[]> {
    return this.availabilityRepo.find({
      where: { creatorId, dayOfWeek, isActive: true },
      order: { startTime: 'ASC' },
    });
  }

  async createAvailability(
    data: Partial<CreatorAvailability>,
  ): Promise<CreatorAvailability> {
    const availability = this.availabilityRepo.create(data);
    return this.availabilityRepo.save(availability);
  }

  async createMany(
    data: Partial<CreatorAvailability>[],
  ): Promise<CreatorAvailability[]> {
    const availabilities = this.availabilityRepo.create(data);
    return this.availabilityRepo.save(availabilities);
  }

  async deleteByCreator(creatorId: string): Promise<void> {
    await this.availabilityRepo.delete({ creatorId });
  }

  async updateAvailability(
    id: string,
    data: Partial<CreatorAvailability>,
  ): Promise<CreatorAvailability | null> {
    await this.availabilityRepo.update(id, data);
    return this.availabilityRepo.findOne({ where: { id } });
  }

  async deleteAvailability(id: string): Promise<void> {
    await this.availabilityRepo.delete(id);
  }

  // Settings methods
  async findSettings(creatorId: string): Promise<SessionSettings | null> {
    return this.settingsRepo.findOne({ where: { creatorId } });
  }

  async createSettings(
    data: Partial<SessionSettings>,
  ): Promise<SessionSettings> {
    const settings = this.settingsRepo.create(data);
    return this.settingsRepo.save(settings);
  }

  async updateSettings(
    creatorId: string,
    data: Partial<SessionSettings>,
  ): Promise<SessionSettings | null> {
    let settings = await this.findSettings(creatorId);
    if (!settings) {
      settings = await this.createSettings({ creatorId, ...data });
    } else {
      await this.settingsRepo.update(settings.id, data);
      settings = await this.findSettings(creatorId);
    }
    return settings;
  }

  async getOrCreateSettings(creatorId: string): Promise<SessionSettings> {
    let settings = await this.findSettings(creatorId);
    if (!settings) {
      settings = await this.createSettings({ creatorId });
    }
    return settings;
  }
}
