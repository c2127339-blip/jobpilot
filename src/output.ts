/**
 * 输出渲染：终端彩色 Markdown + 保存为 .md 文件。
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk, { type ChalkInstance } from 'chalk';
import type { GeneratedQuestions } from './types.js';

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
  const abs = resolve(outPath);
  const md = renderMarkdown(result);
  await writeFile(abs, md, 'utf-8');
  return abs;
}
