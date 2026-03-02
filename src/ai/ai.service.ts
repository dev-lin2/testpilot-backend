// src/ai/ai.service.ts

import {
  Injectable,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { LlmConfigsService } from '../llm-configs/llm-configs.service';
import { LLMProvider } from '@prisma/client';
import type { LlmMessages, LlmCallResult } from './ai.types';

interface OpenAIResponse {
  choices: { message: { content: string } }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnthropicResponse {
  content: { text: string }[];
  usage: { input_tokens: number; output_tokens: number };
}

interface GeminiResponse {
  candidates: { content: { parts: { text: string }[] } }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface OllamaResponse {
  message: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private llmConfigsService: LlmConfigsService,
  ) {}

  async call(
    userId: string,
    configId: string,
    messages: LlmMessages,
  ): Promise<LlmCallResult> {
    const config = await this.llmConfigsService.findOne(userId, configId);
    const apiKey = await this.llmConfigsService.getDecryptedApiKey(
      userId,
      configId,
    );

    if (
      config.tokenBudget !== null &&
      config.totalTokens >= config.tokenBudget
    ) {
      throw new ForbiddenException('Token budget exceeded for this LLM config');
    }

    let result: LlmCallResult;

    try {
      switch (config.provider) {
        case LLMProvider.OPENAI:
          result = await this.callOpenAI(
            config.model,
            apiKey,
            messages,
            config.temperature,
            config.maxTokens,
            null,
          );
          break;
        case LLMProvider.ANTHROPIC:
          result = await this.callAnthropic(
            config.model,
            apiKey,
            messages,
            config.maxTokens,
          );
          break;
        case LLMProvider.GEMINI:
          result = await this.callGemini(
            config.model,
            apiKey,
            messages,
            config.temperature,
            config.maxTokens,
          );
          break;
        case LLMProvider.OLLAMA:
          result = await this.callOllama(
            config.model,
            config.baseUrl ?? 'http://localhost:11434',
            messages,
          );
          break;
        case LLMProvider.CUSTOM:
          result = await this.callOpenAI(
            config.model,
            apiKey,
            messages,
            config.temperature,
            config.maxTokens,
            config.baseUrl,
          );
          break;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'LLM API call failed';
      throw new BadGatewayException(`LLM provider error: ${message}`);
    }

    await this.prisma.lLMConfig.update({
      where: { id: configId },
      data: { totalTokens: { increment: result.totalTokens } },
    });

    return result;
  }

  parseJsonResponse<T>(content: string): T {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content.trim();
    return JSON.parse(jsonStr) as T;
  }

  private async callOpenAI(
    model: string,
    apiKey: string,
    messages: LlmMessages,
    temperature: number,
    maxTokens: number,
    baseUrl: string | null,
  ): Promise<LlmCallResult> {
    const url = baseUrl
      ? `${baseUrl}/v1/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const res = await axios.post<OpenAIResponse>(
      url,
      {
        model,
        messages: [
          { role: 'system', content: messages.system },
          { role: 'user', content: messages.user },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    return {
      content: res.data.choices[0].message.content,
      promptTokens: res.data.usage.prompt_tokens,
      completionTokens: res.data.usage.completion_tokens,
      totalTokens: res.data.usage.total_tokens,
    };
  }

  private async callAnthropic(
    model: string,
    apiKey: string,
    messages: LlmMessages,
    maxTokens: number,
  ): Promise<LlmCallResult> {
    const res = await axios.post<AnthropicResponse>(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        system: messages.system,
        messages: [{ role: 'user', content: messages.user }],
        max_tokens: maxTokens,
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      },
    );

    const promptTokens = res.data.usage.input_tokens;
    const completionTokens = res.data.usage.output_tokens;

    return {
      content: res.data.content[0].text,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private async callGemini(
    model: string,
    apiKey: string,
    messages: LlmMessages,
    temperature: number,
    maxTokens: number,
  ): Promise<LlmCallResult> {
    const res = await axios.post<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${messages.system}\n\n${messages.user}` }],
          },
        ],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      },
    );

    const usage = res.data.usageMetadata;

    return {
      content: res.data.candidates[0].content.parts[0].text,
      promptTokens: usage.promptTokenCount,
      completionTokens: usage.candidatesTokenCount,
      totalTokens: usage.totalTokenCount,
    };
  }

  private async callOllama(
    model: string,
    baseUrl: string,
    messages: LlmMessages,
  ): Promise<LlmCallResult> {
    const res = await axios.post<OllamaResponse>(`${baseUrl}/api/chat`, {
      model,
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ],
      stream: false,
    });

    const promptTokens = res.data.prompt_eval_count ?? 0;
    const completionTokens = res.data.eval_count ?? 0;

    return {
      content: res.data.message.content,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }
}
