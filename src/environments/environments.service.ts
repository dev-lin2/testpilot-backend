// src/environments/environments.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Environment } from '@prisma/client';
import type { CreateEnvironmentDto } from './dto/create-environment.dto';
import type { UpdateEnvironmentDto } from './dto/update-environment.dto';
import type { EnvironmentResponse } from './environments.types';

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<EnvironmentResponse[]> {
    const envs = await this.prisma.environment.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return envs.map(this.toResponse);
  }

  async findOne(userId: string, id: string): Promise<EnvironmentResponse> {
    const env = await this.findOwnedOrThrow(userId, id);
    return this.toResponse(env);
  }

  async create(userId: string, dto: CreateEnvironmentDto): Promise<EnvironmentResponse> {
    const env = await this.prisma.environment.create({
      data: {
        userId,
        name: dto.name,
        baseUrl: dto.baseUrl,
        variables: dto.variables ?? {},
      },
    });
    return this.toResponse(env);
  }

  async update(userId: string, id: string, dto: UpdateEnvironmentDto): Promise<EnvironmentResponse> {
    await this.findOwnedOrThrow(userId, id);

    const env = await this.prisma.environment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
      },
    });
    return this.toResponse(env);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.environment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<Environment> {
    const env = await this.prisma.environment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!env) throw new NotFoundException('Environment not found');
    if (env.userId !== userId) throw new ForbiddenException('Access denied');

    return env;
  }

  private toResponse(env: Environment): EnvironmentResponse {
    return {
      id: env.id,
      name: env.name,
      baseUrl: env.baseUrl,
      variables: env.variables as Record<string, string>,
      createdAt: env.createdAt,
      updatedAt: env.updatedAt,
    };
  }
}
