// src/llm-configs/llm-configs.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../common/utils/encryption.util';
import type { LLMConfig } from '@prisma/client';
import type { CreateLlmConfigDto } from './dto/create-llm-config.dto';
import type { UpdateLlmConfigDto } from './dto/update-llm-config.dto';
import type { LlmConfigResponse } from './llm-configs.types';

@Injectable()
export class LlmConfigsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll(userId: string): Promise<LlmConfigResponse[]> {
    const configs = await this.prisma.lLMConfig.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return configs.map((c) => this.toResponse(c));
  }

  async findOne(userId: string, id: string): Promise<LlmConfigResponse> {
    const config = await this.findOwnedOrThrow(userId, id);
    return this.toResponse(config);
  }

  async create(
    userId: string,
    dto: CreateLlmConfigDto,
  ): Promise<LlmConfigResponse> {
    const encryptionKey =
      this.configService.getOrThrow<string>('ENCRYPTION_KEY');
    const apiKeyEnc = encrypt(dto.apiKey, encryptionKey);

    const config = await this.prisma.lLMConfig.create({
      data: {
        userId,
        name: dto.name,
        provider: dto.provider,
        model: dto.model,
        apiKeyEnc,
        baseUrl: dto.baseUrl ?? null,
        temperature: dto.temperature ?? 0.2,
        maxTokens: dto.maxTokens ?? 2048,
        tokenBudget: dto.tokenBudget ?? null,
      },
    });

    return this.toResponse(config);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateLlmConfigDto,
  ): Promise<LlmConfigResponse> {
    await this.findOwnedOrThrow(userId, id);

    const encryptionKey =
      this.configService.getOrThrow<string>('ENCRYPTION_KEY');

    const config = await this.prisma.lLMConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.apiKey !== undefined && {
          apiKeyEnc: encrypt(dto.apiKey, encryptionKey),
        }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        ...(dto.tokenBudget !== undefined && { tokenBudget: dto.tokenBudget }),
      },
    });

    return this.toResponse(config);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.lLMConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Decrypts the API key for internal use (e.g. making LLM calls).
   */
  async getDecryptedApiKey(userId: string, id: string): Promise<string> {
    const config = await this.findOwnedOrThrow(userId, id);
    const encryptionKey =
      this.configService.getOrThrow<string>('ENCRYPTION_KEY');
    return decrypt(config.apiKeyEnc, encryptionKey);
  }

  private async findOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<LLMConfig> {
    const config = await this.prisma.lLMConfig.findFirst({
      where: { id, deletedAt: null },
    });

    if (!config) {
      throw new NotFoundException('LLM config not found');
    }

    if (config.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return config;
  }

  private toResponse(config: LLMConfig): LlmConfigResponse {
    return {
      id: config.id,
      name: config.name,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      tokenBudget: config.tokenBudget,
      totalTokens: config.totalTokens,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
