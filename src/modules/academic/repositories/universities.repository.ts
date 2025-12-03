import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { University } from '../entities/university.entity';

@Injectable()
export class UniversitiesRepository {
  constructor(
    @InjectRepository(University)
    private readonly universityRepository: Repository<University>,
  ) {}

  async create(data: Partial<University>): Promise<University> {
    const university = this.universityRepository.create(data);
    return this.universityRepository.save(university);
  }

  async findAll(includeInactive = false): Promise<University[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.universityRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<University | null> {
    return this.universityRepository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<University | null> {
    return this.universityRepository.findOne({ where: { code } });
  }

  async findBySlug(slug: string): Promise<University | null> {
    return this.universityRepository.findOne({ where: { slug } });
  }

  async findWithMajors(id: string): Promise<University | null> {
    return this.universityRepository.findOne({
      where: { id },
      relations: ['majors'],
    });
  }

  async update(
    id: string,
    data: Partial<University>,
  ): Promise<University | null> {
    await this.universityRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.universityRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async countMajors(universityId: string): Promise<number> {
    const university = await this.universityRepository.findOne({
      where: { id: universityId },
      relations: ['majors'],
    });
    return university?.majors?.length ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.universityRepository.count({ where: { id } });
    return count > 0;
  }
}
