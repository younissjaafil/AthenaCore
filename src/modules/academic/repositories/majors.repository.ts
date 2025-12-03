import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Major } from '../entities/major.entity';

@Injectable()
export class MajorsRepository {
  constructor(
    @InjectRepository(Major)
    private readonly majorRepository: Repository<Major>,
  ) {}

  async create(data: Partial<Major>): Promise<Major> {
    const major = this.majorRepository.create(data);
    return this.majorRepository.save(major);
  }

  async findAll(includeInactive = false): Promise<Major[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.majorRepository.find({
      where,
      relations: ['university'],
      order: { name: 'ASC' },
    });
  }

  async findByUniversityId(
    universityId: string,
    includeInactive = false,
  ): Promise<Major[]> {
    const where = includeInactive
      ? { universityId }
      : { universityId, isActive: true };
    return this.majorRepository.find({
      where,
      relations: ['university'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Major | null> {
    return this.majorRepository.findOne({
      where: { id },
      relations: ['university'],
    });
  }

  async findByCode(universityId: string, code: string): Promise<Major | null> {
    return this.majorRepository.findOne({
      where: { universityId, code },
      relations: ['university'],
    });
  }

  async findBySlug(slug: string): Promise<Major | null> {
    return this.majorRepository.findOne({
      where: { slug },
      relations: ['university'],
    });
  }

  async findWithCourses(id: string): Promise<Major | null> {
    return this.majorRepository.findOne({
      where: { id },
      relations: ['university', 'courses'],
    });
  }

  async update(id: string, data: Partial<Major>): Promise<Major | null> {
    await this.majorRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.majorRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async countCourses(majorId: string): Promise<number> {
    const major = await this.majorRepository.findOne({
      where: { id: majorId },
      relations: ['courses'],
    });
    return major?.courses?.length ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.majorRepository.count({ where: { id } });
    return count > 0;
  }
}
