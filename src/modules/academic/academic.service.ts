import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  UniversitiesRepository,
  MajorsRepository,
  CoursesRepository,
} from './repositories';
import { University, Major, Course } from './entities';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../profiles/entities';
import { Creator } from '../creators/entities/creator.entity';
import {
  CreateUniversityDto,
  UpdateUniversityDto,
  CreateMajorDto,
  UpdateMajorDto,
  CreateCourseDto,
  UpdateCourseDto,
  UniversityResponseDto,
  MajorResponseDto,
  CourseResponseDto,
  CreateJarvisResponseDto,
  AcademicStatsResponseDto,
} from './dto';
import { ExpertiseLevel } from '../creators/entities/creator.entity';

@Injectable()
export class AcademicService {
  private readonly logger = new Logger(AcademicService.name);

  constructor(
    private readonly universitiesRepository: UniversitiesRepository,
    private readonly majorsRepository: MajorsRepository,
    private readonly coursesRepository: CoursesRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
  ) {}

  // ==================== UTILITY METHODS ====================

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ==================== UNIVERSITIES ====================

  async createUniversity(
    dto: CreateUniversityDto,
  ): Promise<UniversityResponseDto> {
    // Check for duplicate code
    const existing = await this.universitiesRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        `University with code ${dto.code} already exists`,
      );
    }

    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existingSlug = await this.universitiesRepository.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException(
        `University with slug ${slug} already exists`,
      );
    }

    const university = await this.universitiesRepository.create({
      ...dto,
      slug,
    });

    return this.toUniversityResponse(university);
  }

  async getUniversities(
    includeInactive = false,
  ): Promise<UniversityResponseDto[]> {
    const universities =
      await this.universitiesRepository.findAll(includeInactive);

    const responses: UniversityResponseDto[] = [];
    for (const university of universities) {
      const majorsCount = await this.majorsRepository.findByUniversityId(
        university.id,
      );
      responses.push({
        ...this.toUniversityResponse(university),
        majorsCount: majorsCount.length,
      });
    }

    return responses;
  }

  async getUniversityById(id: string): Promise<UniversityResponseDto> {
    const university = await this.universitiesRepository.findById(id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    const majors = await this.majorsRepository.findByUniversityId(id);
    return {
      ...this.toUniversityResponse(university),
      majorsCount: majors.length,
    };
  }

  async updateUniversity(
    id: string,
    dto: UpdateUniversityDto,
  ): Promise<UniversityResponseDto> {
    const existing = await this.universitiesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.universitiesRepository.findByCode(dto.code);
      if (duplicate) {
        throw new ConflictException(
          `University with code ${dto.code} already exists`,
        );
      }
    }

    // Check for duplicate slug if changing
    if (dto.slug && dto.slug !== existing.slug) {
      const duplicate = await this.universitiesRepository.findBySlug(dto.slug);
      if (duplicate) {
        throw new ConflictException(
          `University with slug ${dto.slug} already exists`,
        );
      }
    }

    const updated = await this.universitiesRepository.update(id, dto);
    return this.toUniversityResponse(updated!);
  }

  async deleteUniversity(id: string): Promise<void> {
    const existing = await this.universitiesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    // Check if university has majors
    const majorsCount = await this.universitiesRepository.countMajors(id);
    if (majorsCount > 0) {
      throw new BadRequestException(
        `Cannot delete university with ${majorsCount} majors. Delete majors first.`,
      );
    }

    await this.universitiesRepository.delete(id);
  }

  // ==================== MAJORS ====================

  async createMajor(dto: CreateMajorDto): Promise<MajorResponseDto> {
    // Check university exists
    const university = await this.universitiesRepository.findById(
      dto.universityId,
    );
    if (!university) {
      throw new NotFoundException(
        `University with ID ${dto.universityId} not found`,
      );
    }

    // Check for duplicate code within university
    const existing = await this.majorsRepository.findByCode(
      dto.universityId,
      dto.code,
    );
    if (existing) {
      throw new ConflictException(
        `Major with code ${dto.code} already exists in this university`,
      );
    }

    // Generate slug if not provided
    const slug =
      dto.slug || this.generateSlug(`${university.code}-${dto.code}`);

    const major = await this.majorsRepository.create({
      ...dto,
      slug,
    });

    return this.toMajorResponse(major);
  }

  async getMajors(
    universityId?: string,
    includeInactive = false,
  ): Promise<MajorResponseDto[]> {
    const majors = universityId
      ? await this.majorsRepository.findByUniversityId(
          universityId,
          includeInactive,
        )
      : await this.majorsRepository.findAll(includeInactive);

    const responses: MajorResponseDto[] = [];
    for (const major of majors) {
      const courses = await this.coursesRepository.findByMajorId(major.id);
      responses.push({
        ...this.toMajorResponse(major),
        coursesCount: courses.length,
      });
    }

    return responses;
  }

  async getMajorById(id: string): Promise<MajorResponseDto> {
    const major = await this.majorsRepository.findById(id);
    if (!major) {
      throw new NotFoundException(`Major with ID ${id} not found`);
    }

    const courses = await this.coursesRepository.findByMajorId(id);
    return {
      ...this.toMajorResponse(major),
      coursesCount: courses.length,
    };
  }

  async updateMajor(
    id: string,
    dto: UpdateMajorDto,
  ): Promise<MajorResponseDto> {
    const existing = await this.majorsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Major with ID ${id} not found`);
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.majorsRepository.findByCode(
        existing.universityId,
        dto.code,
      );
      if (duplicate) {
        throw new ConflictException(
          `Major with code ${dto.code} already exists in this university`,
        );
      }
    }

    const updated = await this.majorsRepository.update(id, dto);
    return this.toMajorResponse(updated!);
  }

  async deleteMajor(id: string): Promise<void> {
    const existing = await this.majorsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Major with ID ${id} not found`);
    }

    // Check if major has courses
    const coursesCount = await this.majorsRepository.countCourses(id);
    if (coursesCount > 0) {
      throw new BadRequestException(
        `Cannot delete major with ${coursesCount} courses. Delete courses first.`,
      );
    }

    await this.majorsRepository.delete(id);
  }

  // ==================== COURSES ====================

  async createCourse(dto: CreateCourseDto): Promise<CourseResponseDto> {
    // Check major exists
    const major = await this.majorsRepository.findById(dto.majorId);
    if (!major) {
      throw new NotFoundException(`Major with ID ${dto.majorId} not found`);
    }

    // Check for duplicate code within major
    const existing = await this.coursesRepository.findByCode(
      dto.majorId,
      dto.code,
    );
    if (existing) {
      throw new ConflictException(
        `Course with code ${dto.code} already exists in this major`,
      );
    }

    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(`${dto.code}`);

    const course = await this.coursesRepository.create({
      ...dto,
      slug,
    });

    // Re-fetch with relations
    const fullCourse = await this.coursesRepository.findById(course.id);
    return this.toCourseResponse(fullCourse!);
  }

  async getCourses(
    majorId?: string,
    universityId?: string,
    includeInactive = false,
  ): Promise<CourseResponseDto[]> {
    let courses: Course[];

    if (majorId) {
      courses = await this.coursesRepository.findByMajorId(
        majorId,
        includeInactive,
      );
    } else if (universityId) {
      courses = await this.coursesRepository.findByUniversityId(
        universityId,
        includeInactive,
      );
    } else {
      courses = await this.coursesRepository.findAll(includeInactive);
    }

    return courses.map((course) => this.toCourseResponse(course));
  }

  async getCourseById(id: string): Promise<CourseResponseDto> {
    const course = await this.coursesRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return this.toCourseResponse(course);
  }

  async updateCourse(
    id: string,
    dto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    const existing = await this.coursesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.coursesRepository.findByCode(
        existing.majorId,
        dto.code,
      );
      if (duplicate) {
        throw new ConflictException(
          `Course with code ${dto.code} already exists in this major`,
        );
      }
    }

    await this.coursesRepository.update(id, dto);
    const updated = await this.coursesRepository.findById(id);
    return this.toCourseResponse(updated!);
  }

  async deleteCourse(id: string): Promise<void> {
    const existing = await this.coursesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // If course has a Jarvis creator, we might want to warn or clean up
    if (existing.creatorId) {
      this.logger.warn(
        `Deleting course ${id} that has Jarvis creator ${existing.creatorId}`,
      );
    }

    await this.coursesRepository.delete(id);
  }

  // ==================== COURSE JARVIS ====================

  /**
   * Create Course Jarvis for a course
   * This creates a system user, user profile, and creator linked to the course
   */
  async createCourseJarvis(courseId: string): Promise<CreateJarvisResponseDto> {
    // 1. Load course
    const course = await this.coursesRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // 2. Check if Jarvis already exists
    if (course.creatorId) {
      throw new ConflictException(
        `Course ${course.code} already has a Jarvis creator (ID: ${course.creatorId})`,
      );
    }

    // 3. Generate unique identifiers
    const universityCode = course.major?.university?.code || 'UNI';
    const courseCode = course.code.replace(/\s+/g, '').toLowerCase();
    const jarvisHandle = `jarvis-${universityCode.toLowerCase()}-${courseCode}`;
    const jarvisEmail = `${jarvisHandle}@athena.internal`;
    const displayName = `${course.code} – ${course.title} Jarvis`;

    this.logger.log(
      `Creating Jarvis for course ${course.code}: handle=${jarvisHandle}`,
    );

    // 4. Create system user (NO clerk_id - system users bypass Clerk)
    const user = this.userRepository.create({
      email: jarvisEmail,
      username: jarvisHandle,
      firstName: course.code,
      lastName: 'Jarvis',
      roles: ['user', 'creator'],
      isActive: true,
      isSystemUser: true,
    });
    const savedUser = await this.userRepository.save(user);
    this.logger.log(`Created system user: ${savedUser.id}`);

    // 5. Create user profile
    const profile = this.profileRepository.create({
      userId: savedUser.id,
      handle: jarvisHandle,
      displayName: displayName,
      bio: `AI Course Assistant for ${course.code} - ${course.title}. Ask me anything about the course material!`,
    });
    const savedProfile = await this.profileRepository.save(profile);
    this.logger.log(`Created user profile: ${savedProfile.id}`);

    // 6. Create creator profile
    const creator = this.creatorRepository.create({
      userId: savedUser.id,
      title: `${course.code} Course Assistant`,
      bio: `AI-powered course assistant for ${course.code} - ${course.title}. Get help with course materials, practice problems, and study guidance.`,
      tagline: 'Your AI Course Companion',
      categories: ['Education', 'AI Assistant'],
      specialties: ['Course Material', 'Study Help', 'Practice Problems'],
      expertiseLevel: ExpertiseLevel.EXPERT,
      isAvailable: true,
      hourlyRate: 0, // Free for students
    });
    const savedCreator = await this.creatorRepository.save(creator);
    this.logger.log(`Created creator profile: ${savedCreator.id}`);

    // 7. Link creator to course
    await this.coursesRepository.linkCreator(courseId, savedCreator.id);
    this.logger.log(`Linked creator ${savedCreator.id} to course ${courseId}`);

    return {
      courseId,
      creatorId: savedCreator.id,
      userId: savedUser.id,
      profileHandle: jarvisHandle,
      profileUrl: `/u/${jarvisHandle}`,
      displayName,
    };
  }

  /**
   * Get Course Jarvis info for a course
   */
  async getCourseJarvis(
    courseId: string,
  ): Promise<CreateJarvisResponseDto | null> {
    const course = await this.coursesRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    if (!course.creatorId) {
      return null;
    }

    const creator = course.creator;
    if (!creator) {
      return null;
    }

    // Get the user profile
    const profile = await this.profileRepository.findOne({
      where: { userId: creator.userId },
    });

    return {
      courseId,
      creatorId: creator.id,
      userId: creator.userId,
      profileHandle: profile?.handle || '',
      profileUrl: profile ? `/u/${profile.handle}` : '',
      displayName: profile?.displayName || `${course.code} Jarvis`,
    };
  }

  // ==================== STATS ====================

  async getAcademicStats(): Promise<AcademicStatsResponseDto> {
    const universities = await this.universitiesRepository.findAll(true);
    const majors = await this.majorsRepository.findAll(true);
    const courses = await this.coursesRepository.findAll(true);

    const coursesWithJarvis = courses.filter((c) => c.creatorId).length;

    return {
      totalUniversities: universities.length,
      totalMajors: majors.length,
      totalCourses: courses.length,
      coursesWithJarvis,
      coursesWithoutJarvis: courses.length - coursesWithJarvis,
    };
  }

  // ==================== RESPONSE TRANSFORMERS ====================

  private toUniversityResponse(university: University): UniversityResponseDto {
    return {
      id: university.id,
      code: university.code,
      name: university.name,
      slug: university.slug,
      description: university.description,
      logoUrl: university.logoUrl,
      bannerUrl: university.bannerUrl,
      isActive: university.isActive,
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    };
  }

  private toMajorResponse(major: Major): MajorResponseDto {
    return {
      id: major.id,
      universityId: major.universityId,
      code: major.code,
      name: major.name,
      slug: major.slug,
      description: major.description,
      isActive: major.isActive,
      createdAt: major.createdAt,
      updatedAt: major.updatedAt,
      university: major.university
        ? this.toUniversityResponse(major.university)
        : undefined,
    };
  }

  private toCourseResponse(course: Course): CourseResponseDto {
    return {
      id: course.id,
      majorId: course.majorId,
      code: course.code,
      title: course.title,
      slug: course.slug,
      semester: course.semester,
      description: course.description,
      credits: course.credits,
      creatorId: course.creatorId,
      isActive: course.isActive,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      major: course.major ? this.toMajorResponse(course.major) : undefined,
      hasJarvis: !!course.creatorId,
      jarvis: course.creatorId
        ? {
            creatorId: course.creatorId,
            profileUrl: `/creator/${course.creatorId}`,
          }
        : undefined,
    };
  }
}
