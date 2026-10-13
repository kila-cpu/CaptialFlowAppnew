// Zero-dependency server for Railway.
// Serves ./public, plus a tiny in-memory API so an inspection link opened on a
// phone shows up on the office dashboard on another device. Data resets on redeploy.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 25 * 1024 * 1024; // photos travel as compressed data URLs

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// id -> inspection record, plus a few shared key/value docs (team list)
const inspections = new Map();
const kv = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (fwd ? fwd.split(',')[0] : req.socket.remoteAddress || '').trim();
  return ip.replace(/^::ffff:/, '');
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on('data', c => {
    size += c.length;
    if (size > MAX_BODY) { req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    try { cb(null, JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); }
    catch (e) { cb(e); }
  });
}

function handleApi(req, res, urlPath) {
  const parts = urlPath.split('/').filter(Boolean); // ['api', 'inspections', id?]

  if (parts[1] === 'whoami') return json(res, 200, { ip: clientIp(req) });

  if (parts[1] === 'inspections') {
    const id = parts[2];
    if (req.method === 'GET' && !id) return json(res, 200, [...inspections.values()]);
    if (req.method === 'GET') {
      return inspections.has(id) ? json(res, 200, inspections.get(id)) : json(res, 404, { error: 'not found' });
    }
    if (req.method === 'PUT' && id) {
      return readBody(req, (err, body) => {
        if (err || !body) return json(res, 400, { error: 'bad body' });
        // the inspector's device stamps its IP on the record, as on the report
        if (body._fromInspector) {
          const ip = clientIp(req);
          body.ips = body.ips || [];
          if (ip && !body.ips.includes(ip)) body.ips.push(ip);
          delete body._fromInspector;
        }
        body.updatedAt = Date.now();
        inspections.set(id, body);
        json(res, 200, body);
      });
    }
    if (req.method === 'DELETE' && !id) { inspections.clear(); kv.clear(); return json(res, 200, { ok: true }); }
  }

  if (parts[1] === 'kv' && parts[2]) {
    const key = parts[2];
    if (req.method === 'GET') return json(res, 200, kv.has(key) ? kv.get(key) : null);
    if (req.method === 'PUT') {
      return readBody(req, (err, body) => {
        if (err) return json(res, 400, { error: 'bad body' });
        kv.set(key, body);
        json(res, 200, body);
      });
    }
  }

  json(res, 404, { error: 'unknown endpoint' });
}

function sendIndex(res) {
  fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200); return res.end('ok'); }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.startsWith('/api/')) return handleApi(req, res, urlPath);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) return sendIndex(res); // /i/<token> links fall back to the single-page app
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log('Capitalflow inspections demo listening on port ' + PORT));
