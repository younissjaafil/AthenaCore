import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AcademicService } from './academic.service';
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

@ApiTags('Admin - Academic')
@Controller('admin/academic')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ==================== STATS ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get academic statistics' })
  @ApiResponse({ status: 200, type: AcademicStatsResponseDto })
  async getStats(): Promise<AcademicStatsResponseDto> {
    return this.academicService.getAcademicStats();
  }

  // ==================== UNIVERSITIES ====================

  @Post('universities')
  @ApiOperation({ summary: 'Create a university' })
  @ApiResponse({ status: 201, type: UniversityResponseDto })
  async createUniversity(
    @Body() dto: CreateUniversityDto,
  ): Promise<UniversityResponseDto> {
    return this.academicService.createUniversity(dto);
  }

  @Get('universities')
  @ApiOperation({ summary: 'Get all universities' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [UniversityResponseDto] })
  async getUniversities(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<UniversityResponseDto[]> {
    return this.academicService.getUniversities(includeInactive === 'true');
  }

  @Get('universities/:id')
  @ApiOperation({ summary: 'Get university by ID' })
  @ApiParam({ name: 'id', description: 'University ID' })
  @ApiResponse({ status: 200, type: UniversityResponseDto })
  async getUniversity(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UniversityResponseDto> {
    return this.academicService.getUniversityById(id);
  }

  @Patch('universities/:id')
  @ApiOperation({ summary: 'Update a university' })
  @ApiParam({ name: 'id', description: 'University ID' })
  @ApiResponse({ status: 200, type: UniversityResponseDto })
  async updateUniversity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUniversityDto,
  ): Promise<UniversityResponseDto> {
    return this.academicService.updateUniversity(id, dto);
  }

  @Delete('universities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a university' })
  @ApiParam({ name: 'id', description: 'University ID' })
  @ApiResponse({ status: 204, description: 'University deleted successfully' })
  async deleteUniversity(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.academicService.deleteUniversity(id);
  }

  // ==================== MAJORS ====================

  @Post('majors')
  @ApiOperation({ summary: 'Create a major' })
  @ApiResponse({ status: 201, type: MajorResponseDto })
  async createMajor(@Body() dto: CreateMajorDto): Promise<MajorResponseDto> {
    return this.academicService.createMajor(dto);
  }

  @Get('majors')
  @ApiOperation({
    summary: 'Get all majors (optionally filtered by university)',
  })
  @ApiQuery({ name: 'universityId', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [MajorResponseDto] })
  async getMajors(
    @Query('universityId') universityId?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<MajorResponseDto[]> {
    return this.academicService.getMajors(
      universityId,
      includeInactive === 'true',
    );
  }

  @Get('majors/:id')
  @ApiOperation({ summary: 'Get major by ID' })
  @ApiParam({ name: 'id', description: 'Major ID' })
  @ApiResponse({ status: 200, type: MajorResponseDto })
  async getMajor(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MajorResponseDto> {
    return this.academicService.getMajorById(id);
  }

  @Patch('majors/:id')
  @ApiOperation({ summary: 'Update a major' })
  @ApiParam({ name: 'id', description: 'Major ID' })
  @ApiResponse({ status: 200, type: MajorResponseDto })
  async updateMajor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMajorDto,
  ): Promise<MajorResponseDto> {
    return this.academicService.updateMajor(id, dto);
  }

  @Delete('majors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a major' })
  @ApiParam({ name: 'id', description: 'Major ID' })
  @ApiResponse({ status: 204, description: 'Major deleted successfully' })
  async deleteMajor(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.academicService.deleteMajor(id);
  }

  // ==================== COURSES ====================

  @Post('courses')
  @ApiOperation({ summary: 'Create a course' })
  @ApiResponse({ status: 201, type: CourseResponseDto })
  async createCourse(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.academicService.createCourse(dto);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses (optionally filtered)' })
  @ApiQuery({ name: 'majorId', required: false, type: String })
  @ApiQuery({ name: 'universityId', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [CourseResponseDto] })
  async getCourses(
    @Query('majorId') majorId?: string,
    @Query('universityId') universityId?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<CourseResponseDto[]> {
    return this.academicService.getCourses(
      majorId,
      universityId,
      includeInactive === 'true',
    );
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  async getCourse(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    return this.academicService.getCourseById(id);
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  async updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.academicService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 204, description: 'Course deleted successfully' })
  async deleteCourse(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.academicService.deleteCourse(id);
  }

  // ==================== COURSE JARVIS ====================

  @Post('courses/:id/jarvis')
  @ApiOperation({
    summary: 'Create Course Jarvis for a course',
    description:
      'Creates a system user, user profile, and creator for the course. This Jarvis can own agents, documents, and sessions.',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 201, type: CreateJarvisResponseDto })
  async createCourseJarvis(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreateJarvisResponseDto> {
    return this.academicService.createCourseJarvis(id);
  }

  @Get('courses/:id/jarvis')
  @ApiOperation({ summary: 'Get Course Jarvis info for a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, type: CreateJarvisResponseDto })
  async getCourseJarvis(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreateJarvisResponseDto | null> {
    return this.academicService.getCourseJarvis(id);
  }
}
