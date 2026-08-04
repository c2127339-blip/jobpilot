/**
 * 各命令的主流程：组装输入 → 调用 LLM（或演示模式）→ 解析 → 输出。
 */
import 'dotenv/config';
import { readInputFile, FileReadError } from './read-input.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseQuestionsJson,
  buildResumeSystemPrompt,
  buildResumeUserPrompt,
  parseResumeJson,
} from './prompt.js';
import { generateWithLLM, generateWithMock, resolveProviderConfig } from './llm.js';
import {
  DEMO_RESUME,
  DEMO_JD,
  DEMO_LLM_OUTPUT,
  DEMO_RESUME_TEMPLATE_OUTPUT,
  DEMO_RESUME_MERGED_OUTPUT,
} from './demo-data.js';
import type { CommonOptions } from './args.js';
import type { GeneratedQuestions, GeneratedResume } from './types.js';

/** 取 API key：--key 参数 > 环境变量；无则抛错 */
function resolveApiKey(options: CommonOptions): string {
  const apiKey = options.key ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      '未提供 API key。请通过 --key 参数、环境变量 DEEPSEEK_API_KEY 或 .env 文件提供；\n' +
        '或使用 --demo 模式免 key 体验（jp questions --demo / jp resume --demo）。',
    );
  }
  return apiKey;
}

/* ==================== 面试问题（questions） ==================== */

/** 面试问题 · 演示模式 */
export async function runQuestionsDemo(): Promise<GeneratedQuestions> {
  const raw = await generateWithMock(DEMO_LLM_OUTPUT);
  return parseQuestionsJson(raw);
}

/** 面试问题 · 真实模式 */
async function runQuestionsReal(
  resumePath: string,
  jdPath: string,
  options: CommonOptions,
): Promise<GeneratedQuestions> {
  const [resume, jd] = await Promise.all([
    readInputFile(resumePath),
    readInputFile(jdPath),
  ]);

  const config = resolveProviderConfig(options.provider, resolveApiKey(options));
  const system = buildSystemPrompt();
  const user = buildUserPrompt(resume, jd);
  const raw = await generateWithLLM(system, user, config);
  return parseQuestionsJson(raw);
}

/**
 * 执行 questions 命令。
 * @returns 生成的面试问题
 */
export async function runQuestions(input: {
  resume?: string;
  jd?: string;
  options: CommonOptions;
}): Promise<GeneratedQuestions> {
  const { options } = input;

  if (options.demo) {
    return runQuestionsDemo();
  }

  if (!input.resume || !input.jd) {
    throw new Error(
      '请提供简历和 JD 文件路径：jp questions resume.md jd.md\n' +
        '或使用演示模式：jp questions --demo',
    );
  }

  return runQuestionsReal(input.resume, input.jd, options);
}

/* ==================== 简历（resume） ==================== */

/**
 * 简历 · 演示模式。
 * @param withResume true=合并改写（基于示例简历），false=生成模板
 */
export async function runResumeDemo(withResume: boolean): Promise<GeneratedResume> {
  const mock = withResume ? DEMO_RESUME_MERGED_OUTPUT : DEMO_RESUME_TEMPLATE_OUTPUT;
  const raw = await generateWithMock(mock);
  return parseResumeJson(raw);
}

/**
 * 简历 · 真实模式。
 * @param jdPath JD 文件路径（必需）
 * @param existingResumePath 现有简历路径（可选：有此则合并改写，否则生成模板）
 */
async function runResumeReal(
  jdPath: string,
  existingResumePath: string | undefined,
  options: CommonOptions,
): Promise<GeneratedResume> {
  const jd = await readInputFile(jdPath);
  const isMerge = Boolean(existingResumePath);
  const existingResume = existingResumePath ? await readInputFile(existingResumePath) : undefined;

  const config = resolveProviderConfig(options.provider, resolveApiKey(options));
  const system = buildResumeSystemPrompt(isMerge);
  const user = buildResumeUserPrompt(jd, existingResume);
  const raw = await generateWithLLM(system, user, config);
  return parseResumeJson(raw);
}

/**
 * 执行 resume 命令。
 * @returns 生成的简历
 */
export async function runResume(input: {
  jd?: string;
  resume?: string;
  options: CommonOptions;
}): Promise<GeneratedResume> {
  const { options } = input;

  if (options.demo) {
    return runResumeDemo(Boolean(input.resume));
  }

  if (!input.jd) {
    throw new Error('请提供 JD 文件路径：jp resume jd.md');
  }
  const jdPath: string = input.jd;

  return runResumeReal(jdPath, input.resume, options);
}

/* ==================== 工具 ==================== */

/** 示例数据：供 --demo 返回给 questions 使用（兼容旧接口） */
export { DEMO_RESUME, DEMO_JD };
