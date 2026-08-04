/**
 * 命令行参数定义与解析（双命令：resume / questions）。
 */
import { Command } from 'commander';

/** 公共选项（两个命令共用） */
export interface CommonOptions {
  /** 演示模式：用内置示例数据，无需 API key */
  demo?: boolean;
  /** API key（覆盖 .env 中的 DEEPSEEK_API_KEY） */
  key?: string;
  /** LLM 提供商：deepseek（默认）/ openai */
  provider: string;
  /** 输出文件路径（同时保存为 .md） */
  out?: string;
}

/** CLI 解析结果：判别联合（resume / questions） */
export type CliArgs =
  | {
      command: 'resume';
      /** JD 文件路径（真实模式必需，demo 模式可省略） */
      jd?: string;
      /** 现有简历路径（可选：有此参数则合并改写，否则生成模板） */
      resume?: string;
      options: CommonOptions;
    }
  | {
      command: 'questions';
      /** 简历文件路径（可选，demo 模式下忽略） */
      resume?: string;
      /** JD 文件路径（可选，demo 模式下忽略） */
      jd?: string;
      options: CommonOptions;
    };

/**
 * 解析命令行参数。
 * @param argv 原始参数数组（通常为 process.argv.slice(2)）
 */
export function parseArgs(argv: string[]): CliArgs {
  const program = new Command();

  program
    .name('iq')
    .description(
      'Interview Question CLI：根据 JD 生成定制简历 + 面试问题',
    )
    .version('0.2.0');

  // 记录用户实际触发的子命令
  let invoked: 'resume' | 'questions' | undefined;
  // 记录子命令的原始位置参数（commander 会把参数也当作选项处理）
  const positional: Record<string, string[]> = { resume: [], questions: [] };

  program
    .command('resume')
    .description('根据 JD 生成简历（有第二个参数则基于现有简历合并改写，否则生成模板）')
    .argument('[jd]', 'JD 文件路径（.txt / .md）')
    .argument('[resume]', '现有简历文件路径（可选）')
    .option('--demo', '演示模式：用内置示例数据，无需 API key')
    .option('--key <key>', 'API key（默认读取 .env 或环境变量 DEEPSEEK_API_KEY）')
    .option('--provider <provider>', 'LLM 提供商：deepseek（默认）/ openai', 'deepseek')
    .option('--out <path>', '输出文件路径，同时保存为 Markdown')
    .action(() => {
      invoked = 'resume';
    });

  program
    .command('questions')
    .description('根据简历 + JD 生成面试问题')
    .argument('[resume]', '简历文件路径（.txt / .md）')
    .argument('[jd]', 'JD 文件路径（.txt / .md）')
    .option('--demo', '演示模式：用内置示例数据，无需 API key')
    .option('--key <key>', 'API key（默认读取 .env 或环境变量 DEEPSEEK_API_KEY）')
    .option('--provider <provider>', 'LLM 提供商：deepseek（默认）/ openai', 'deepseek')
    .option('--out <path>', '输出文件路径，同时保存为 Markdown')
    .action(() => {
      invoked = 'questions';
    });

  // commander 的 parse 约定 argv 为 [execPath, 脚本路径, ...实际参数]，
  // 因此用占位前缀补齐前两项，再把真实参数拼在后面。
  program.parse([process.execPath, 'iq', ...argv]);

  // 子命令名会出现在 program.args 中（.parse 后），据此取出位置参数
  if (invoked === 'resume') {
    const args = program.args.filter((a) => a !== 'resume');
    const opts = program.commands[0].opts() as CommonOptions;
    return {
      command: 'resume',
      jd: args[0] as string | undefined,
      resume: args[1] as string | undefined,
      options: opts,
    };
  }

  const args = program.args.filter((a) => a !== 'questions');
  const opts = program.commands[1].opts() as CommonOptions;
  return {
    command: 'questions',
    resume: args[0] as string | undefined,
    jd: args[1] as string | undefined,
    options: opts,
  };
}
