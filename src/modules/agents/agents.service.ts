import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AgentsRepository } from './repositories/agents.repository';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { Agent } from './entities/agent.entity';
import { CreatorsService } from '../creators/creators.service';
import { CreatorsRepository } from '../creators/repositories/creators.repository';

@Injectable()
export class AgentsService {
  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly creatorsService: CreatorsService,
    private readonly creatorsRepository: CreatorsRepository,
  ) {}

  async create(
    userId: string,
    createAgentDto: CreateAgentDto,
  ): Promise<AgentResponseDto> {
    // Get creator profile for this user
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator) {
      throw new ForbiddenException(
        'You must have a creator profile to create agents',
      );
    }

    // Create agent
    const agent = await this.agentsRepository.create({
      creatorId: creator.id,
      ...createAgentDto,
    });

    // Increment creator's agent count
    await this.creatorsRepository.incrementAgentCount(creator.id);

    return this.toResponseDto(agent);
  }

  async findAll(): Promise<AgentResponseDto[]> {
    const agents = await this.agentsRepository.findPublic();
    return agents.map((agent) => this.toResponseDto(agent));
  }

  async findByCreator(creatorId: string): Promise<AgentResponseDto[]> {
    const agents = await this.agentsRepository.findByCreator(creatorId);
    return agents.map((agent) => this.toResponseDto(agent));
  }

  async findByCategory(category: string): Promise<AgentResponseDto[]> {
    const agents = await this.agentsRepository.findByCategory(category);
    return agents.map((agent) => this.toResponseDto(agent));
  }

  async findFree(): Promise<AgentResponseDto[]> {
    const agents = await this.agentsRepository.findFree();
    return agents.map((agent) => this.toResponseDto(agent));
  }

  async findOne(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return this.toResponseDto(agent);
  }

  async findMyAgents(userId: string): Promise<AgentResponseDto[]> {
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator) {
      return [];
    }
    return this.findByCreator(creator.id);
  }

  async update(
    id: string,
    userId: string,
    updateAgentDto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    // Check if user owns this agent
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator || creator.id !== agent.creatorId) {
      throw new ForbiddenException('You can only update your own agents');
    }

    const updated = await this.agentsRepository.update(id, updateAgentDto);
    if (!updated) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return this.toResponseDto(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    // Check if user owns this agent
    const creator = await this.creatorsService.findByUserId(userId);
    if (!creator || creator.id !== agent.creatorId) {
      throw new ForbiddenException('You can only delete your own agents');
    }

    const deleted = await this.agentsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    // Decrement creator's agent count
    await this.creatorsRepository.decrementAgentCount(creator.id);
  }

  toResponseDto(agent: Agent): AgentResponseDto {
    const response: AgentResponseDto = {
      id: agent.id,
      creatorId: agent.creatorId,
      name: agent.name,
      tagline: agent.tagline,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      welcomeMessage: agent.welcomeMessage,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      topP: agent.topP,
      frequencyPenalty: agent.frequencyPenalty,
      presencePenalty: agent.presencePenalty,
      category: agent.category,
      tags: agent.tags,
      pricePerMessage: Number(agent.pricePerMessage),
      pricePerMonth: Number(agent.pricePerMonth),
      isFree: agent.isFree,
      visibility: agent.visibility,
      status: agent.status,
      avatarUrl: agent.avatarUrl,
      coverImageUrl: agent.coverImageUrl,
      ragEnabled: agent.ragEnabled,
      ragContextSize: agent.ragContextSize,
      ragSimilarityThreshold: agent.ragSimilarityThreshold,
      totalConversations: agent.totalConversations,
      totalMessages: agent.totalMessages,
      averageRating: Number(agent.averageRating),
      totalReviews: agent.totalReviews,
      totalDocuments: agent.totalDocuments,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };

    if (agent.creator) {
      response.creator = {
        id: agent.creator.id,
        userId: agent.creator.userId,
        bio: agent.creator.bio,
        specialties: agent.creator.specialties,
        averageRating: Number(agent.creator.averageRating),
      };
    }

    return response;
  }
}
