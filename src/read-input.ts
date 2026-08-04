/**
 * 读取简历 / JD 文件。
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** 支持的文件扩展名 */
const SUPPORTED_EXT = ['.txt', '.md', '.markdown'];

/** 自定义错误：文件不可读 */
export class FileReadError extends Error {
  constructor(public filePath: string, reason: string) {
    super(`无法读取文件 "${filePath}"：${reason}`);
    this.name = 'FileReadError';
  }
}

/**
 * 读取并校验简历 / JD 文件内容。
 * @throws FileReadError 文件不存在、扩展名不支持或读取失败时
 */
export async function readInputFile(filePath: string): Promise<string> {
  const abs = resolve(filePath);
  const ext = extnameOf(abs);
  if (ext && !SUPPORTED_EXT.includes(ext)) {
    throw new FileReadError(
      filePath,
      `仅支持 ${SUPPORTED_EXT.join(' / ')} 格式（当前为 ${ext || '未知'}）`,
    );
  }

  let content: string;
  try {
    content = await readFile(abs, 'utf-8');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new FileReadError(filePath, reason);
  }

  if (!content.trim()) {
    throw new FileReadError(filePath, '文件内容为空');
  }
  return content.trim();
}

function extnameOf(p: string): string {
  const idx = p.lastIndexOf('.');
  if (idx <= p.lastIndexOf('/')) return '';
  return p.slice(idx).toLowerCase();
}
