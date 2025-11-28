import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findByClerkId(
      createUserDto.clerkId,
    );
    if (existingUser) {
      throw new ConflictException('User with this Clerk ID already exists');
    }

    const existingEmail = await this.usersRepository.findByEmail(
      createUserDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    return this.usersRepository.create(createUserDto);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByClerkId(clerkId: string): Promise<User> {
    const user = await this.usersRepository.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundException(`User with Clerk ID ${clerkId} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    const updated = await this.usersRepository.update(id, updateUserDto);
    if (!updated) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.usersRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async syncFromClerk(clerkUserData: any): Promise<User> {
    const existingUser = await this.usersRepository.findByClerkId(
      clerkUserData.id,
    );

    if (existingUser) {
      // Update existing user
      const updated = await this.usersRepository.update(existingUser.id, {
        email: clerkUserData.email_addresses[0]?.email_address,
        firstName: clerkUserData.first_name,
        lastName: clerkUserData.last_name,
        profileImageUrl: clerkUserData.image_url,
      });
      if (!updated) {
        throw new NotFoundException(
          `User with ID ${existingUser.id} not found`,
        );
      }
      return updated;
    }

    // Create new user
    return this.usersRepository.create({
      clerkId: clerkUserData.id,
      email: clerkUserData.email_addresses[0]?.email_address,
      firstName: clerkUserData.first_name,
      lastName: clerkUserData.last_name,
      profileImageUrl: clerkUserData.image_url,
    });
  }

  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
