/**
 * 浏览器端 LLM 客户端。
 * 复用 src/prompt.ts 与 src/types.ts 的纯逻辑，
 * 通过 @ai-sdk/openai（dangerouslyAllowBrowser）在浏览器直接调用 DeepSeek API。
 */
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildResumeSystemPrompt,
  buildResumeUserPrompt,
  buildAnswerSystemPrompt,
  buildAnswerUserPrompt,
  parseQuestionsJson,
  parseResumeJson,
  parseAnswerJson,
} from '../../src/prompt.js';
import type { AnswerResult, GeneratedQuestions, GeneratedResume } from '../../src/types.js';

/** 浏览器端配置：用户填的 key 只存在于内存，不落盘 */
interface ClientConfig {
  apiKey: string;
  model?: string;
}

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

function createClient({ apiKey, model }: ClientConfig) {
  const openai = createOpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey,
    // AI SDK v7 基于原生 fetch（浏览器内置），无需额外选项即可在浏览器调用
  });
  return openai(model ?? DEFAULT_MODEL);
}

/** 生成简历 */
export async function generateResume(
  jd: string,
  resume: string,
  config: ClientConfig,
): Promise<GeneratedResume> {
  const hasResume = resume.trim().length > 0;
  const system = buildResumeSystemPrompt(hasResume);
  const user = buildResumeUserPrompt(jd, hasResume ? resume : undefined);
  const raw = await callLLM(system, user, config);
  return parseResumeJson(raw);
}

/** 生成面试问题 */
export async function generateQuestions(
  resume: string,
  jd: string,
  config: ClientConfig,
): Promise<GeneratedQuestions> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(resume, jd);
  const raw = await callLLM(system, user, config);
  return parseQuestionsJson(raw);
}

/** 生成某道面试问题的详细答案 */
export async function generateAnswer(
  question: string,
  jd: string,
  config: ClientConfig,
): Promise<AnswerResult> {
  const system = buildAnswerSystemPrompt();
  const user = buildAnswerUserPrompt(question, jd);
  const raw = await callLLM(system, user, config);
  return parseAnswerJson(raw);
}

async function callLLM(
  system: string,
  user: string,
  config: ClientConfig,
): Promise<string> {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('请先填写 API key');
  }
  const model = createClient(config);
  const { text } = await generateText({
    model,
    system,
    prompt: user,
    temperature: 0.7,
  });
  return text;
}
