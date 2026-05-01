import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 7121);
const ROOT_DIR = __dirname;

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
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^([\\/])+/, '');
  const resolvedPath = path.resolve(ROOT_DIR, normalizedPath || 'index.html');

  if (!resolvedPath.startsWith(ROOT_DIR)) {
    return null;
  }

  if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
    return path.join(resolvedPath, 'index.html');
  }

  return resolvedPath;
}

const server = createServer(async (request, response) => {
  const requestPath = request.url === '/' ? '/index.html' : request.url || '/index.html';
  const filePath = resolvePath(requestPath);

  if (!filePath) {
    sendText(response, 403, 'Forbidden');
    return;
  }

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
  console.log(`Start Page running at http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('Server failed to start:', error.message);
  process.exit(1);
});
