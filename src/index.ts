#!/usr/bin/env node
/**
 * interview-question-cli 入口。
 * 用法：iq generate [resume] [jd] [--demo | --key | --provider | --out]
 */
import { parseArgs } from './args.js';
import { runGenerate } from './run.js';
import { renderTerminal, saveMarkdown } from './output.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'generate') {
    try {
      const result = await runGenerate({
        resume: args.resume,
        jd: args.jd,
        options: args.options,
      });

      renderTerminal(result);

      // --out 指定时同时保存文件；demo 模式未指定 out 时默认打印即可
      if (args.options.out) {
        const saved = await saveMarkdown(result, args.options.out);
        console.log(`\n✅ 已保存到 ${saved}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ ${message}\n`);
      process.exitCode = 1;
    }
  }
}

main();
