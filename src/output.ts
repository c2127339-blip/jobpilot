/**
 * 输出渲染：终端彩色 Markdown + 保存为 .md 文件。
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk, { type ChalkInstance } from 'chalk';
import type { GeneratedQuestions, GeneratedResume } from './types.js';

/** 分类标题的终端颜色映射 */
const CATEGORY_COLORS: Record<string, ChalkInstance> = {
  project: chalk.cyan,
  tech: chalk.magenta,
  behavior: chalk.green,
  fit: chalk.yellow,
};

const DIFFICULTY_COLOR: Record<string, ChalkInstance> = {
  easy: chalk.green,
  medium: chalk.yellow,
  hard: chalk.red,
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

/** 在终端打印结果 */
export function renderTerminal(result: GeneratedQuestions): void {
  console.log('');
  console.log(chalk.bold.underline(result.title));
  console.log('');

  for (const cat of result.categories) {
    const color = CATEGORY_COLORS[cat.category] ?? chalk.white;
    console.log(color.bold(`▍${cat.name}`));
    console.log(color(`  ── ${cat.category} ──`));

    cat.questions.forEach((q, i) => {
      const diffColor = DIFFICULTY_COLOR[q.difficulty] ?? chalk.white;
      const diffLabel = DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty;
      console.log('');
      console.log(`  ${i + 1}. ${chalk.bold(q.text)} ${diffColor(`[${diffLabel}]`)}`);
      console.log(chalk.dim(`     为什么问：${q.why}`));
      console.log(chalk.dim(`     参考思路：${q.answerIdea}`));
    });
    console.log('');
  }

  if (result.gapSuggestions.length > 0) {
    console.log(chalk.bold('▍简历 vs JD 差距提示'));
    result.gapSuggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${chalk.rgb(255, 160, 80)(s)}`);
    });
    console.log('');
  }
}

/** 渲染为 Markdown 文本（用于保存文件） */
export function renderMarkdown(result: GeneratedQuestions): string {
  const lines: string[] = [];
  lines.push(`# ${result.title}`);
  lines.push('');

  for (const cat of result.categories) {
    lines.push(`## ${cat.name}`);
    lines.push('');
    cat.questions.forEach((q, i) => {
      const diffLabel = DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty;
      lines.push(`### ${i + 1}. ${q.text}`);
      lines.push('');
      lines.push(`- **难度**：${diffLabel}`);
      lines.push(`- **为什么问**：${q.why}`);
      lines.push(`- **参考答案思路**：${q.answerIdea}`);
      lines.push('');
    });
  }

  if (result.gapSuggestions.length > 0) {
    lines.push('## 简历 vs JD 差距提示');
    lines.push('');
    result.gapSuggestions.forEach((s) => {
      lines.push(`- ${s}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/** 保存 Markdown 到文件 */
export async function saveMarkdown(result: GeneratedQuestions, outPath: string): Promise<string> {
  const md = renderMarkdown(result);
  return writeMarkdownFile(md, outPath);
}

/** 写任意 Markdown 文本到文件（公共，供简历/问题复用） */
export async function writeMarkdownFile(md: string, outPath: string): Promise<string> {
  const abs = resolve(outPath);
  await writeFile(abs, md, 'utf-8');
  return abs;
}

/** 在终端打印简历 */
export function renderResumeTerminal(result: GeneratedResume): void {
  console.log('');
  console.log(chalk.bold.underline(result.title));
  console.log('');
  console.log(chalk.cyan(result.header));
  console.log('');
  console.log(chalk.bold('▍自我评价'));
  console.log(`  ${result.summary}`);
  console.log('');

  for (const sec of result.sections) {
    console.log(chalk.bold(`▍${sec.heading}`));
    sec.content.forEach((line, i) => {
      console.log(`  ${i + 1}. ${line}`);
    });
    console.log('');
  }

  if (result.gapNotes.length > 0) {
    console.log(chalk.bold('▍待补充 / 匹配度说明'));
    result.gapNotes.forEach((s, i) => {
      console.log(`  ${i + 1}. ${chalk.rgb(255, 160, 80)(s)}`);
    });
    console.log('');
  }
}

/** 渲染简历为 Markdown 文本 */
export function renderResumeMarkdown(result: GeneratedResume): string {
  const lines: string[] = [];
  lines.push(`# ${result.title}`);
  lines.push('');
  lines.push(result.header);
  lines.push('');
  lines.push('## 自我评价');
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  for (const sec of result.sections) {
    lines.push(`## ${sec.heading}`);
    lines.push('');
    sec.content.forEach((line) => {
      lines.push(`- ${line}`);
    });
    lines.push('');
  }

  if (result.gapNotes.length > 0) {
    lines.push('## 待补充 / 匹配度说明');
    lines.push('');
    result.gapNotes.forEach((s) => {
      lines.push(`- ${s}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/** 保存简历为 Markdown 文件 */
export async function saveResumeMarkdown(result: GeneratedResume, outPath: string): Promise<string> {
  const md = renderResumeMarkdown(result);
  return writeMarkdownFile(md, outPath);
}
