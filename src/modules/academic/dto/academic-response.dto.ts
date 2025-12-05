import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== University Response DTOs =====

export class UniversityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  bannerUrl?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Number of majors in this university' })
  majorsCount?: number;
}

// ===== Major Response DTOs =====

export class MajorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  universityId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => UniversityResponseDto })
  university?: UniversityResponseDto;

  @ApiPropertyOptional({ description: 'Number of courses in this major' })
  coursesCount?: number;
}

// ===== Course Response DTOs =====

export class CourseJarvisInfoDto {
  @ApiProperty()
  creatorId: string;

  @ApiPropertyOptional()
  profileHandle?: string;

  @ApiPropertyOptional()
  profileUrl?: string;
}

export class CourseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  majorId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  semester?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  credits?: number;

  @ApiPropertyOptional()
  creatorId?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => MajorResponseDto })
  major?: MajorResponseDto;

  @ApiPropertyOptional({
    description: 'Whether this course has a Jarvis creator',
  })
  hasJarvis?: boolean;

  @ApiPropertyOptional({ type: () => CourseJarvisInfoDto })
  jarvis?: CourseJarvisInfoDto;
}

// ===== Create Jarvis Response =====

export class CreateJarvisResponseDto {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ description: 'The auto-created agent ID for this course' })
  agentId: string;

  @ApiProperty()
  profileHandle: string;

  @ApiProperty()
  profileUrl: string;

  @ApiProperty()
  displayName: string;
}

// ===== Academic Stats Response =====

export class AcademicStatsResponseDto {
  @ApiProperty()
  totalUniversities: number;

  @ApiProperty()
  totalMajors: number;

  @ApiProperty()
  totalCourses: number;

  @ApiProperty()
  coursesWithJarvis: number;

  @ApiProperty()
  coursesWithoutJarvis: number;
}
