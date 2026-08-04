/**
 * 生成命令的主流程：组装输入 → 调用 LLM（或演示模式）→ 解析 → 输出。
 */
import 'dotenv/config';
import { readInputFile, FileReadError } from './read-input.js';
import { buildSystemPrompt, buildUserPrompt, parseQuestionsJson } from './prompt.js';
import { generateWithLLM, generateWithMock, resolveProviderConfig } from './llm.js';
import { DEMO_RESUME, DEMO_JD, DEMO_LLM_OUTPUT } from './demo-data.js';
import { renderTerminal, saveMarkdown } from './output.js';
import type { GenerateOptions } from './args.js';
import type { GeneratedQuestions } from './types.js';

export interface RunInput {
  resume?: string;
  jd?: string;
  options: GenerateOptions;
}

/** 演示模式主入口（也供 examples 生成使用） */
export async function runDemo(): Promise<GeneratedQuestions> {
  const raw = await generateWithMock(DEMO_LLM_OUTPUT);
  return parseQuestionsJson(raw);
}

/** 真实模式主入口 */
async function runReal(resumePath: string, jdPath: string, options: GenerateOptions): Promise<GeneratedQuestions> {
  const [resume, jd] = await Promise.all([
    readInputFile(resumePath),
    readInputFile(jdPath),
  ]);

  const apiKey = options.key ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      '未提供 API key。请通过 --key 参数、环境变量 DEEPSEEK_API_KEY 或 .env 文件提供；\n' +
        '或使用 --demo 模式免 key 体验（iq generate --demo）。',
    );
  }

  const config = resolveProviderConfig(options.provider, apiKey);
  const system = buildSystemPrompt();
  const user = buildUserPrompt(resume, jd);
  const raw = await generateWithLLM(system, user, config);
  return parseQuestionsJson(raw);
}

/**
 * 执行 generate 命令。
 * @returns 生成的面试问题（供测试/复用）
 */
export async function runGenerate(input: RunInput): Promise<GeneratedQuestions> {
  const { options } = input;

  if (options.demo) {
    return runDemo();
  }

  if (!input.resume || !input.jd) {
    throw new Error(
      '请提供简历和 JD 文件路径：iq generate resume.md jd.md\n' +
        '或使用演示模式：iq generate --demo',
    );
  }

  try {
    return await runReal(input.resume, input.jd, options);
  } catch (err) {
    if (err instanceof FileReadError) throw err;
    throw err;
  }
}

/** 从输入组装出可保存的文件名（生成默认输出名用） */
export function defaultOutName(resumePath: string, jdPath: string): string {
  const base = (p: string) => p.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-');
  return `${base(resumePath)}__vs__${base(jdPath)}-questions.md`;
}
