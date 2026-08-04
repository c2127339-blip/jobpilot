/**
 * JobPilot Web · 静态文件服务器。
 * 仅用 Node 内置 http/fs，零依赖。
 * 浏览器访问 http://localhost:8787
 *
 * 注意：本服务只托管静态文件；LLM 调用全部在浏览器端完成，
 * 用户的 API key 不会经过此服务器。
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 8787;
const WEB_DIR = fileURLToPath(new URL('./web', import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');

  // 路径安全：防止目录穿越
  const filePath = normalize(join(WEB_DIR, relPath));
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    const mime = MIME[extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    // 未找到 → 返回 index.html（SPA 兜底）
    try {
      const index = await readFile(join(WEB_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(index);
    } catch {
      res.writeHead(500);
      res.end('Server error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  ✈️  JobPilot Web 已启动`);
  console.log(`  请用浏览器打开：http://localhost:${PORT}\n`);
  console.log(`  提示：先执行 npm run web:build 生成前端资源（若 bundle.js 不存在）`);
  console.log(`  关闭服务：Ctrl+C\n`);
});
