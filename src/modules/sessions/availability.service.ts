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
        this.logger.warn(
          `Failed to update creator availability status: ${error}`,
        );
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
    const dateOverrides =
      await this.availabilityRepository.findDateOverridesInRange(
        creatorId,
        startDate,
        endDate,
      );

    this.logger.log(
      `getAvailableSlots: creatorId=${creatorId}, startDate=${startDate}, endDate=${endDate}, duration=${durationMinutes}`,
    );
    this.logger.log(
      `Settings: minimumNoticeHours=${settings.minimumNoticeHours}, bufferTime=${settings.bufferTime}, timezone=${settings.timezone}`,
    );
    this.logger.log(
      `Weekly availability slots: ${availability.length}, Date overrides: ${dateOverrides.length}`,
    );

    // Create a map of date overrides for quick lookup
    const overrideMap = new Map<
      string,
      { isAvailable: boolean; slots: { start: string; end: string }[] }
    >();
    for (const override of dateOverrides) {
      // Handle both Date objects and strings from database
      // Use local date parts to avoid timezone shifting
      const rawDate = override.date as unknown;
      let dateKey: string;
      if (rawDate instanceof Date) {
        const year = rawDate.getFullYear();
        const month = String(rawDate.getMonth() + 1).padStart(2, '0');
        const day = String(rawDate.getDate()).padStart(2, '0');
        dateKey = `${year}-${month}-${day}`;
      } else {
        dateKey = String(override.date).split('T')[0];
      }

      this.logger.log(
        `Processing override: date=${override.date}, dateKey=${dateKey}, isAvailable=${override.isAvailable}, start=${override.startTime}, end=${override.endTime}`,
      );

      if (!overrideMap.has(dateKey)) {
        overrideMap.set(dateKey, { isAvailable: true, slots: [] });
      }
      const entry = overrideMap.get(dateKey)!;

      if (!override.isAvailable) {
        // If any override blocks the day, mark as unavailable
        entry.isAvailable = false;
      } else if (override.startTime && override.endTime) {
        entry.slots.push({ start: override.startTime, end: override.endTime });
      }
    }

    this.logger.log(
      `Override map keys: ${Array.from(overrideMap.keys()).join(', ')}`,
    );

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

    this.logger.log(
      `Current time: ${now.toISOString()}, Minimum notice time: ${minimumNotice.toISOString()}`,
    );

    while (currentDate <= end) {
      // Use local date parts to avoid timezone shifting
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = currentDate.getDay() as DayOfWeek;
      const override = overrideMap.get(dateStr);

      // Check if this date has an override
      let dayAvailabilityRanges: { start: string; end: string }[] = [];

      if (override) {
        if (!override.isAvailable) {
          // Date is blocked, skip
          this.logger.debug(`${dateStr} is blocked by override`);
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        // Use override slots instead of weekly availability
        dayAvailabilityRanges = override.slots;
        this.logger.debug(
          `${dateStr} has ${override.slots.length} override slots`,
        );
      } else {
        // Use weekly availability
        const dayAvailability = availability.filter(
          (a) => a.dayOfWeek === dayOfWeek,
        );
        dayAvailabilityRanges = dayAvailability.map((a) => ({
          start: a.startTime,
          end: a.endTime,
        }));
      }

      this.logger.debug(
        `Checking ${dateStr}, dayOfWeek=${dayOfWeek}, ranges=${dayAvailabilityRanges.length}`,
      );

      if (dayAvailabilityRanges.length > 0) {
        const slots: string[] = [];

        for (const range of dayAvailabilityRanges) {
          this.logger.log(
            `Generating slots for ${dateStr}: range ${range.start} - ${range.end}, duration=${durationMinutes}, buffer=${settings.bufferTime}`,
          );
          const timeSlots = this.generateTimeSlots(
            dateStr,
            range.start,
            range.end,
            durationMinutes,
            settings.bufferTime,
          );
          this.logger.log(
            `Generated ${timeSlots.length} time slots: ${timeSlots.join(', ')}`,
          );

          for (const slot of timeSlots) {
            // Create slot date in creator's timezone
            // The slot time (e.g., "02:00") is in the creator's local timezone
            // We need to convert it to UTC for comparison
            const slotDate = this.createDateInTimezone(
              dateStr,
              slot,
              settings.timezone || 'UTC',
            );

            this.logger.log(
              `Checking slot ${slot}: slotDate=${slotDate.toISOString()}, minimumNotice=${minimumNotice.toISOString()}, timezone=${settings.timezone}`,
            );

            // Skip if before minimum notice
            if (slotDate < minimumNotice) {
              this.logger.log(`Slot ${slot} skipped: before minimum notice`);
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
          result.push({
            date: dateStr,
            slots,
            timezone: settings.timezone || 'UTC',
          });
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
    // Handle both HH:MM and HH:MM:SS formats
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    this.logger.debug(
      `generateTimeSlots: start=${startTime} (${startMinutes}min), end=${endTime} (${endMinutes}min), duration=${duration}, buffer=${buffer}`,
    );

    let currentMinutes = startMinutes;
    while (currentMinutes + duration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const slot = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      this.logger.debug(
        `Adding slot: ${slot} (current=${currentMinutes}, next=${currentMinutes + duration + buffer})`,
      );
      slots.push(slot);
      currentMinutes += duration + buffer;
    }

    this.logger.debug(`Generated ${slots.length} slots: ${slots.join(', ')}`);
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

  /**
   * Get date overrides for a creator
   */
  async getDateOverrides(creatorId: string) {
    return this.availabilityRepository.findDateOverrides(creatorId);
  }

  /**
   * Set date overrides (replaces existing)
   */
  async setDateOverrides(
    creatorId: string,
    overrides: {
      date: string;
      startTime?: string;
      endTime?: string;
      isAvailable: boolean;
    }[],
  ) {
    const data = overrides.map((o) => ({
      creatorId,
      date: o.date,
      startTime: o.isAvailable ? o.startTime : null,
      endTime: o.isAvailable ? o.endTime : null,
      isAvailable: o.isAvailable,
    }));

    return this.availabilityRepository.setDateOverrides(creatorId, data);
  }

  /**
   * Create a Date object from a date/time string
   * For V1, we treat times as-is without timezone conversion (Lebanon focused)
   * @param dateStr Date string in YYYY-MM-DD format
   * @param timeStr Time string in HH:MM format
   * @param timezone IANA timezone string (ignored for V1 - kept for future use)
   * @returns Date object
   */
  private createDateInTimezone(
    dateStr: string,
    timeStr: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timezone: string,
  ): Date {
    // V1 Simplified: Treat times as-is without timezone conversion
    // The time 02:00 means 02:00 - no UTC offset calculation
    const result = new Date(`${dateStr}T${timeStr}:00`);

    this.logger.debug(
      `createDateInTimezone: ${dateStr} ${timeStr} -> ${result.toISOString()}`,
    );

    return result;
  }
}
