import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 7121;
const HOST = process.env.HOST || DEFAULT_HOST;
const ROOT_DIR = __dirname;

function resolvePort(rawPort) {
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid PORT "${rawPort}". Expected an integer between 1 and 65535.`);
    process.exit(1);
  }

  return port;
}

const PORT = resolvePort(process.env.PORT);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
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
    return { statusCode: 400, message: 'Bad Request' };
  }

  const normalizedPath = path.normalize(decodedPath.replace(/^([\\/])+/, ''));
  const resolvedPath = path.resolve(ROOT_DIR, normalizedPath || 'index.html');
  const relativePath = path.relative(ROOT_DIR, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return { statusCode: 403, message: 'Forbidden' };
  }

  if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
    return { filePath: path.join(resolvedPath, 'index.html') };
  }

  return { filePath: resolvedPath };
}

const server = createServer(async (request, response) => {
  const requestPath = request.url === '/' ? '/index.html' : request.url || '/index.html';
  const resolved = resolvePath(requestPath);

  if (!resolved.filePath) {
    sendText(response, resolved.statusCode, resolved.message);
    return;
  }

  const { filePath } = resolved;

  try {
    await access(filePath);
  } catch {
    if (request.headers.accept && request.headers.accept.includes('text/html')) {
      const fallbackPath = path.join(ROOT_DIR, 'index.html');
      try {
        const content = await readFile(fallbackPath);
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(content);
        return;
      } catch {
        sendText(response, 404, 'Not Found');
        return;
      }
    }

    sendText(response, 404, 'Not Found');
    return;
  }

  response.writeHead(200, { 'Content-Type': getContentType(filePath) });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`Start Page listening on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server failed to start:', error.message);
  process.exit(1);
});
