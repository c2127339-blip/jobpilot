#!/usr/bin/env node
/**
 * interview-question-cli 入口（双命令）。
 * 用法：
 *   iq resume <jd> [resume] [--demo | --key | --provider | --out]  生成简历
 *   iq questions [resume] [jd] [--demo | --key | --provider | --out] 生成面试问题
 */
import { parseArgs } from './args.js';
import { runResume, runQuestions } from './run.js';
import {
  renderTerminal,
  saveMarkdown,
  renderResumeTerminal,
  saveResumeMarkdown,
} from './output.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'resume') {
    try {
      const result = await runResume({
        jd: args.jd,
        resume: args.resume,
        options: args.options,
      });

      renderResumeTerminal(result);

      if (args.options.out) {
        const saved = await saveResumeMarkdown(result, args.options.out);
        console.log(`\n✅ 已保存到 ${saved}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ ${message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  if (args.command === 'questions') {
    try {
      const result = await runQuestions({
        resume: args.resume,
        jd: args.jd,
        options: args.options,
      });

      renderTerminal(result);

      if (args.options.out) {
        const saved = await saveMarkdown(result, args.options.out);
        console.log(`\n✅ 已保存到 ${saved}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ ${message}\n`);
      process.exitCode = 1;
    }
    return;
  }
}

main();
