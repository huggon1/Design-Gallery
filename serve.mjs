import http from 'node:http';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {dirname, resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const argument = process.argv.indexOf('--port');
const port = argument < 0 ? 4317 : Number(process.argv[argument + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Use --port 1..65535');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.woff2':'font/woff2'};
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.'))) throw Error('Hidden path');
    const base = root;
    const relative = pathname.slice(1);
    let path = resolve(base, relative || 'index.html');
    if (path !== base && !path.startsWith(base + sep)) throw Error('Outside root');
    let info = await stat(path);
    if (info.isDirectory()) { path = resolve(path, 'index.html'); info = await stat(path); }
    const headers = {'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff', 'Accept-Ranges':'bytes'};
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = Math.min(Number(range[2] || info.size - 1), info.size - 1);
      if (start > end || start >= info.size) { res.writeHead(416, {'Content-Range':`bytes */${info.size}`}); res.end(); return; }
      res.writeHead(206, {...headers, 'Content-Range':`bytes ${start}-${end}/${info.size}`, 'Content-Length': end-start+1});
      if (req.method === 'HEAD') res.end(); else createReadStream(path, {start,end}).pipe(res);
    } else {
      res.writeHead(200, {...headers, 'Content-Length':info.size});
      if (req.method === 'HEAD') res.end(); else createReadStream(path).pipe(res);
    }
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    res.end('场景文件暂时无法读取，请返回画廊后重试。');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Design Gallery http://127.0.0.1:${port}/`));
