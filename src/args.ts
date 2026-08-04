/**
 * 命令行参数定义与解析。
 */
import { Command } from 'commander';

export interface GenerateOptions {
  /** 演示模式：用内置示例数据，无需 API key */
  demo?: boolean;
  /** API key（覆盖 .env 中的 DEEPSEEK_API_KEY） */
  key?: string;
  /** LLM 提供商：deepseek（默认）/ openai */
  provider: string;
  /** 输出文件路径（同时保存为 .md） */
  out?: string;
}

/** CLI 解析结果：命令 + 位置参数 + 选项 */
export interface CliArgs {
  command: 'generate';
  /** resume 路径（可选，demo 模式下忽略） */
  resume?: string;
  /** jd 路径（可选，demo 模式下忽略） */
  jd?: string;
  options: GenerateOptions;
}

/**
 * 解析命令行参数。
 * @param argv 原始参数数组（通常为 process.argv.slice(2)）
 */
export function parseArgs(argv: string[]): CliArgs {
  const program = new Command();

  program
    .name('iq')
    .description(
      'Interview Question Generator：根据简历 + JD 自动生成个性化面试问题',
    )
    .version('0.1.0');

  const generate = program
    .command('generate')
    .description('根据简历 + JD 生成面试问题')
    .argument('[resume]', '简历文件路径（.txt / .md）')
    .argument('[jd]', 'JD 文件路径（.txt / .md）')
    .option('--demo', '演示模式：用内置示例数据，无需 API key')
    .option('--key <key>', 'API key（默认读取 .env 或环境变量 DEEPSEEK_API_KEY）')
    .option('--provider <provider>', 'LLM 提供商：deepseek（默认）/ openai', 'deepseek')
    .option('--out <path>', '输出文件路径，同时保存为 Markdown')
    .action(() => {
      // 执行逻辑统一由 index.ts 通过返回的 CliArgs 驱动
    });

  // commander 的 parse 约定 argv 为 [execPath, 脚本路径, ...实际参数]，
  // 因此用占位前缀补齐前两项，再把真实参数拼在后面。
  program.parse([process.execPath, 'iq', ...argv]);

  return {
    command: 'generate',
    resume: generate.args[0] as string | undefined,
    jd: generate.args[1] as string | undefined,
    options: generate.opts() as GenerateOptions,
  };
}
