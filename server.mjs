import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(__dirname, '.env'));

import { handleProviderApi } from './src/assistant/server/provider-api.js';
import { handleDashboardApi } from './src/server/dashboard/dashboard.js';

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 7121;
const HOST = process.env.HOST || DEFAULT_HOST;
const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
const ROOT_DIR = fileURLToPath(new URL('./dist', import.meta.url));
const ENTRY_FILE = path.join(ROOT_DIR, 'index.html');

if (!existsSync(ENTRY_FILE)) {
  console.error('未找到生产构建。请先运行 "npm run build" 再执行 "npm start"。');
  process.exit(1);
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function resolvePath(urlPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return { statusCode: 400, message: '请求无效' };
  }

  const normalizedPath = path.normalize(decodedPath.replace(/^([\\/])+/, ''));
  const resolvedPath = path.resolve(ROOT_DIR, normalizedPath || 'index.html');
  const relativePath = path.relative(ROOT_DIR, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return { statusCode: 403, message: '禁止访问' };
  }

  return { filePath: resolvedPath };
}

const server = createServer(async (request, response) => {

  if (await handleDashboardApi(request, response)) {
    return;
  }

  if (await handleProviderApi(request, response)) {
    return;
  }

  const requestPath = request.url === '/' ? '/index.html' : request.url;
  const resolved = resolvePath(requestPath);

  if (!resolved.filePath) {
    sendText(response, resolved.statusCode, resolved.message);
    return;
  }

  const { filePath } = resolved;

  try {
    await access(filePath);
  } catch {
    sendText(response, 404, '未找到');
    return;
  }

  response.writeHead(200, { 'Content-Type': getContentType(filePath) });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`Start Page listening on http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('服务器启动失败：', error.message);
  process.exit(1);
});
