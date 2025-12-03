import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';

@Injectable()
export class CoursesRepository {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(data: Partial<Course>): Promise<Course> {
    const course = this.courseRepository.create(data);
    return this.courseRepository.save(course);
  }

  async findAll(includeInactive = false): Promise<Course[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.courseRepository.find({
      where,
      relations: ['major', 'major.university', 'creator'],
      order: { code: 'ASC' },
    });
  }

  async findByMajorId(
    majorId: string,
    includeInactive = false,
  ): Promise<Course[]> {
    const where = includeInactive ? { majorId } : { majorId, isActive: true };
    return this.courseRepository.find({
      where,
      relations: ['major', 'major.university', 'creator'],
      order: { code: 'ASC' },
    });
  }

  async findByUniversityId(
    universityId: string,
    includeInactive = false,
  ): Promise<Course[]> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.major', 'major')
      .leftJoinAndSelect('major.university', 'university')
      .leftJoinAndSelect('course.creator', 'creator')
      .where('major.universityId = :universityId', { universityId })
      .orderBy('course.code', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('course.isActive = true');
    }

    return queryBuilder.getMany();
  }

  async findById(id: string): Promise<Course | null> {
    return this.courseRepository.findOne({
      where: { id },
      relations: ['major', 'major.university', 'creator'],
    });
  }

  async findByCode(majorId: string, code: string): Promise<Course | null> {
    return this.courseRepository.findOne({
      where: { majorId, code },
      relations: ['major', 'major.university', 'creator'],
    });
  }

  async findBySlug(slug: string): Promise<Course | null> {
    return this.courseRepository.findOne({
      where: { slug },
      relations: ['major', 'major.university', 'creator'],
    });
  }

  async findByCreatorId(creatorId: string): Promise<Course | null> {
    return this.courseRepository.findOne({
      where: { creatorId },
      relations: ['major', 'major.university', 'creator'],
    });
  }

  async update(id: string, data: Partial<Course>): Promise<Course | null> {
    await this.courseRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.courseRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async linkCreator(
    courseId: string,
    creatorId: string,
  ): Promise<Course | null> {
    await this.courseRepository.update(courseId, { creatorId });
    return this.findById(courseId);
  }

  async unlinkCreator(courseId: string): Promise<Course | null> {
    await this.courseRepository.update(courseId, { creatorId: undefined });
    return this.findById(courseId);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.courseRepository.count({ where: { id } });
    return count > 0;
  }

  async hasJarvis(id: string): Promise<boolean> {
    const course = await this.courseRepository.findOne({
      where: { id },
      select: ['creatorId'],
    });
    return !!course?.creatorId;
  }
}
