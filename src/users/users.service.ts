// src/users/users.service.ts

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';
import type { UserProfile, ApiKeyMasked, ApiKeyCreated } from './users.types';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });

    return { id: updated.id, name: updated.name, email: updated.email, createdAt: updated.createdAt };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }

  async getApiKeys(userId: string): Promise<ApiKeyMasked[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      key: this.maskKey(k.key),
      lastUsed: k.lastUsed,
      createdAt: k.createdAt,
    }));
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreated> {
    const rawKey = `tp_${crypto.randomBytes(24).toString('hex')}`;

    const apiKey = await this.prisma.apiKey.create({
      data: { userId, name: dto.name, key: rawKey },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      lastUsed: apiKey.lastUsed,
      createdAt: apiKey.createdAt,
    };
  }

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId, deletedAt: null },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { deletedAt: new Date() },
    });
  }

  private maskKey(key: string): string {
    // Show prefix + **** + last 3 chars: tp_****xyz
    if (key.length <= 6) return key;
    return `${key.slice(0, 3)}_****${key.slice(-3)}`;
  }
}
