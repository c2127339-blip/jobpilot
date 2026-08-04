/**
 * LLM 调用层：通过 Vercel AI SDK 统一接口调用 DeepSeek / OpenAI，
 * 并提供演示模式（MockProvider），无需 API key、不碰网络即可跑通全流程。
 *
 * 为什么要用 AI SDK：
 *  - 统一接口：换模型只需改 baseURL 与 model 名
 *  - 内置流式输出、错误重试、usage 统计
 *  - 这是本项目的一个工程亮点（可替换 provider 架构）
 */
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamResult,
} from '@ai-sdk/provider';

/** LLM 提供商配置 */
export interface ProviderConfig {
  /** baseURL（OpenAI 兼容接口） */
  baseURL: string;
  /** 默认模型名 */
  model: string;
  /** API key */
  apiKey: string;
}

/** DeepSeek 官方 OpenAI 兼容配置 */
const DEEPSEEK: Omit<ProviderConfig, 'apiKey'> = {
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat',
};

/** OpenAI 官方配置 */
const OPENAI: Omit<ProviderConfig, 'apiKey'> = {
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

/** 获取 provider 配置 */
export function resolveProviderConfig(
  provider: string,
  apiKey: string,
): ProviderConfig {
  const preset = provider === 'openai' ? OPENAI : DEEPSEEK;
  return { ...preset, apiKey };
}

/** 通过真实 LLM 生成面试问题 JSON 文本 */
export async function generateWithLLM(
  system: string,
  user: string,
  config: ProviderConfig,
): Promise<string> {
  const openai = createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
  const model = openai(config.model);

  const { text } = await generateText({
    model,
    system,
    prompt: user,
    temperature: 0.7,
  });
  return text;
}

/**
 * 演示模式（MockProvider）：
 * 模拟 LanguageModelV4 接口，直接返回预置的 JSON 文本。
 * 这样 --demo 可以完整走一遍 prompt → LLM → 解析 → 输出的管线，但不发网络请求。
 */
class MockLanguageModel implements LanguageModelV4 {
  readonly specificationVersion = 'v4' as const;
  readonly provider = 'mock';
  readonly modelId = 'demo-model';
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(private mockOutput: string) {}

  async doGenerate(
    _options: LanguageModelV4CallOptions,
  ): Promise<LanguageModelV4GenerateResult> {
    return {
      content: [{ type: 'text', text: this.mockOutput }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: {
        inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 0, text: 0, reasoning: 0 },
      },
      warnings: [],
    };
  }

  async doStream(
    _options: LanguageModelV4CallOptions,
  ): Promise<LanguageModelV4StreamResult> {
    // 演示模式用 generate 路径，stream 仅做最简实现以满足接口
    return {
      stream: (async function* () {
        yield {
          type: 'text-delta',
          delta: '',
        } as any;
      })(),
      streamOptions: undefined,
      warnings: [],
      response: undefined,
    } as any;
  }
}

/** 演示模式：用 MockProvider 生成（等价于真实调用路径，但返回预置 JSON） */
export async function generateWithMock(mockOutput: string): Promise<string> {
  const mockModel = new MockLanguageModel(mockOutput);
  const { text } = await generateText({ model: mockModel, prompt: 'demo' });
  return text;
}
