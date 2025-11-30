import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AvailabilityRepository } from './repositories/availability.repository';
import { SessionsRepository } from './repositories/sessions.repository';
import { CreatorsService } from '../creators/creators.service';
import {
  SetAvailabilityDto,
  AvailabilityResponseDto,
  TimeSlotAvailableDto,
} from './dto/availability.dto';
import {
  UpdateSessionSettingsDto,
  SessionSettingsResponseDto,
} from './dto/session-settings.dto';
import {
  CreatorAvailability,
  DayOfWeek,
} from './entities/creator-availability.entity';
import { SessionSettings } from './entities/session-settings.entity';
import { SessionStatus } from './entities/session.entity';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly creatorsService: CreatorsService,
  ) {}

  /**
   * Get creator ID from user ID
   * @throws ForbiddenException if user is not a creator
   */
  async getCreatorIdFromUserId(userId: string): Promise<string> {
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator) {
      throw new ForbiddenException('User is not a creator');
    }
    return creator.id;
  }

  /**
   * Set creator's weekly availability (replaces existing)
   */
  async setAvailability(
    creatorId: string,
    dto: SetAvailabilityDto,
  ): Promise<AvailabilityResponseDto[]> {
    // Validate time slots
    for (const slot of dto.slots) {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          `Invalid time slot: startTime (${slot.startTime}) must be before endTime (${slot.endTime})`,
        );
      }
    }

    // Delete existing availability
    await this.availabilityRepository.deleteByCreator(creatorId);

    // Create new availability slots
    const availabilities = await this.availabilityRepository.createMany(
      dto.slots.map((slot) => ({
        creatorId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive ?? true,
      })),
    );

    // Auto-set creator as available when they have availability slots
    if (availabilities.length > 0) {
      try {
        await this.creatorsService.update(creatorId, { isAvailable: true });
      } catch (error) {
        this.logger.warn(`Failed to update creator availability status: ${error}`);
      }
    }

    this.logger.log(
      `Set ${availabilities.length} availability slots for creator ${creatorId}`,
    );

    return availabilities.map((a) => this.mapAvailabilityToDto(a));
  }

  /**
   * Get creator's availability
   */
  async getAvailability(creatorId: string): Promise<AvailabilityResponseDto[]> {
    const availabilities =
      await this.availabilityRepository.findByCreator(creatorId);
    return availabilities.map((a) => this.mapAvailabilityToDto(a));
  }

  /**
   * Get available booking slots for a date range
   */
  async getAvailableSlots(
    creatorId: string,
    startDate: string,
    endDate: string,
    durationMinutes: number = 60,
  ): Promise<TimeSlotAvailableDto[]> {
    const settings =
      await this.availabilityRepository.getOrCreateSettings(creatorId);
    const availability =
      await this.availabilityRepository.findActiveByCreator(creatorId);

    this.logger.log(`getAvailableSlots: creatorId=${creatorId}, startDate=${startDate}, endDate=${endDate}, duration=${durationMinutes}`);
    this.logger.log(`Settings: minimumNoticeHours=${settings.minimumNoticeHours}, bufferTime=${settings.bufferTime}`);
    this.logger.log(`Availability slots found: ${availability.length}`);
    
    if (availability.length === 0) {
      this.logger.warn('No availability slots found for creator');
      return [];
    }

    // Get existing sessions in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const existingSessions = await this.sessionsRepository.findByDateRange(
      creatorId,
      start,
      end,
    );

    const result: TimeSlotAvailableDto[] = [];
    const currentDate = new Date(start);
    const now = new Date();
    const minimumNotice = new Date(
      now.getTime() + settings.minimumNoticeHours * 60 * 60 * 1000,
    );

    this.logger.log(`Current time: ${now.toISOString()}, Minimum notice time: ${minimumNotice.toISOString()}`);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay() as DayOfWeek;
      const dayAvailability = availability.filter(
        (a) => a.dayOfWeek === dayOfWeek,
      );

      this.logger.debug(`Checking ${currentDate.toISOString().split('T')[0]}, dayOfWeek=${dayOfWeek}, matchingSlots=${dayAvailability.length}`);

      if (dayAvailability.length > 0) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const slots: string[] = [];

        for (const avail of dayAvailability) {
          const timeSlots = this.generateTimeSlots(
            dateStr,
            avail.startTime,
            avail.endTime,
            durationMinutes,
            settings.bufferTime,
          );

          for (const slot of timeSlots) {
            const slotDate = new Date(`${dateStr}T${slot}:00`);

            // Skip if before minimum notice
            if (slotDate < minimumNotice) {
              continue;
            }

            // Check for conflicts with existing sessions
            const hasConflict = existingSessions.some((session) => {
              if (
                session.status === SessionStatus.CANCELLED ||
                session.status === SessionStatus.NO_SHOW
              ) {
                return false;
              }

              const sessionStart = new Date(session.scheduledAt);
              const sessionEnd = new Date(
                sessionStart.getTime() + session.durationMinutes * 60000,
              );
              const slotEnd = new Date(
                slotDate.getTime() + durationMinutes * 60000,
              );

              // Check overlap
              return slotDate < sessionEnd && slotEnd > sessionStart;
            });

            if (!hasConflict) {
              slots.push(slot);
            }
          }
        }

        if (slots.length > 0) {
          result.push({ date: dateStr, slots });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get or create session settings
   */
  async getSessionSettings(
    creatorId: string,
  ): Promise<SessionSettingsResponseDto> {
    const settings =
      await this.availabilityRepository.getOrCreateSettings(creatorId);
    return this.mapSettingsToDto(settings);
  }

  /**
   * Update session settings
   */
  async updateSessionSettings(
    creatorId: string,
    dto: UpdateSessionSettingsDto,
  ): Promise<SessionSettingsResponseDto> {
    // Validate durations if provided
    if (dto.sessionDurations) {
      if (dto.sessionDurations.some((d) => d < 15 || d > 180)) {
        throw new BadRequestException(
          'Session durations must be between 15 and 180 minutes',
        );
      }
    }

    const settings = await this.availabilityRepository.updateSettings(
      creatorId,
      dto,
    );

    if (!settings) {
      throw new NotFoundException('Failed to update settings');
    }

    this.logger.log(`Updated session settings for creator ${creatorId}`);

    return this.mapSettingsToDto(settings);
  }

  /**
   * Generate time slots between start and end time
   */
  private generateTimeSlots(
    date: string,
    startTime: string,
    endTime: string,
    duration: number,
    buffer: number,
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let currentMinutes = startMinutes;
    while (currentMinutes + duration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      slots.push(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
      );
      currentMinutes += duration + buffer;
    }

    return slots;
  }

  private mapAvailabilityToDto(
    availability: CreatorAvailability,
  ): AvailabilityResponseDto {
    return {
      id: availability.id,
      creatorId: availability.creatorId,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isActive: availability.isActive,
    };
  }

  private mapSettingsToDto(
    settings: SessionSettings,
  ): SessionSettingsResponseDto {
    return {
      id: settings.id,
      creatorId: settings.creatorId,
      sessionDurations: settings.sessionDurations,
      defaultDuration: settings.defaultDuration,
      bufferTime: settings.bufferTime,
      minimumNoticeHours: settings.minimumNoticeHours,
      maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
      autoConfirm: settings.autoConfirm,
      allowFreeSession: settings.allowFreeSession,
      pricePerDuration: settings.pricePerDuration ?? undefined,
      timezone: settings.timezone,
      welcomeMessage: settings.welcomeMessage ?? undefined,
      cancellationPolicy: settings.cancellationPolicy ?? undefined,
    };
  }
}
