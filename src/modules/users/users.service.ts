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

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.usersRepository.findByClerkId(clerkId);
  }

  async findByClerkIdOrThrow(clerkId: string): Promise<User> {
    const user = await this.usersRepository.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundException(`User with Clerk ID ${clerkId} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
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

  async findOrCreate(clerkUserData: {
    sub: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }): Promise<User> {
    // Try to find existing user by clerkId
    const existingUser = await this.usersRepository.findByClerkId(
      clerkUserData.sub,
    );

    if (existingUser) {
      // Update user with latest Clerk data if username changed
      if (
        clerkUserData.username &&
        existingUser.username !== clerkUserData.username
      ) {
        await this.usersRepository.update(existingUser.id, {
          username: clerkUserData.username,
          firstName: clerkUserData.firstName,
          lastName: clerkUserData.lastName,
          profileImageUrl: clerkUserData.profileImageUrl,
        });
        return this.usersRepository.findById(existingUser.id) as Promise<User>;
      }
      return existingUser;
    }

    // Create new user if not found
    return this.usersRepository.create({
      clerkId: clerkUserData.sub,
      email: clerkUserData.email,
      username: clerkUserData.username,
      firstName: clerkUserData.firstName,
      lastName: clerkUserData.lastName,
      profileImageUrl: clerkUserData.profileImageUrl,
      isAdmin: false,
    });
  }

  async syncFromClerk(clerkUserData: any): Promise<User> {
    const existingUser = await this.usersRepository.findByClerkId(
      clerkUserData.id,
    );

    if (existingUser) {
      // Update existing user
      const updated = await this.usersRepository.update(existingUser.id, {
        email: clerkUserData.email_addresses[0]?.email_address,
        username: clerkUserData.username,
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
      username: clerkUserData.username,
      firstName: clerkUserData.first_name,
      lastName: clerkUserData.last_name,
      profileImageUrl: clerkUserData.image_url,
    });
  }

  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profileImageUrl: user.profileImageUrl,
      roles: user.roles,
      isCreator: user.isCreator,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Public profile response - less sensitive data
   */
  toPublicResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: '', // Don't expose email publicly
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profileImageUrl: user.profileImageUrl,
      roles: user.roles,
      isCreator: user.isCreator,
      isAdmin: false, // Don't expose admin status publicly
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Add creator role to user (enable creator power)
   */
  async enableCreatorPower(userId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (user.isCreator) {
      return user; // Already a creator
    }

    const newRoles = [...user.roles, 'creator'] as any;
    const updated = await this.usersRepository.update(userId, {
      roles: newRoles,
    });

    if (!updated) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return updated;
  }

  /**
   * Remove creator role from user (disable creator power)
   */
  async disableCreatorPower(userId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (!user.isCreator) {
      return user; // Not a creator
    }

    const newRoles = user.roles.filter((r) => r !== 'creator') as any;
    const updated = await this.usersRepository.update(userId, {
      roles: newRoles,
    });

    if (!updated) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return updated;
  }

  /**
   * Add admin role to user
   */
  async makeAdmin(userId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (user.isAdmin) {
      return user;
    }

    const newRoles = [...user.roles, 'admin'] as any;
    const updated = await this.usersRepository.update(userId, {
      roles: newRoles,
    });

    if (!updated) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return updated;
  }
}
