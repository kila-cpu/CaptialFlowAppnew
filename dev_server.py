"""Local stand-in for server.js (this machine has no Node). Same routes and API.

    python3 dev_server.py 8795
"""
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
INSPECTIONS = {}
KV = {}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def log_message(self, *a):
        pass

    def _json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'null')

    def _parts(self):
        return [p for p in self.path.split('?')[0].split('/') if p]

    def do_GET(self):
        p = self._parts()
        if self.path == '/healthz':
            return self._json(200, 'ok')
        if p[:1] == ['api']:
            if p[1] == 'whoami':
                return self._json(200, {'ip': self.client_address[0]})
            if p[1] == 'inspections':
                if len(p) == 2:
                    return self._json(200, list(INSPECTIONS.values()))
                return self._json(200, INSPECTIONS[p[2]]) if p[2] in INSPECTIONS else self._json(404, {})
            if p[1] == 'kv':
                return self._json(200, KV.get(p[2]))
        if not os.path.isfile(os.path.join(PUBLIC, self.path.split('?')[0].lstrip('/'))):
            self.path = '/index.html'
        return super().do_GET()

    def do_PUT(self):
        p = self._parts()
        body = self._body()
        if p[1] == 'inspections':
            if body.pop('_fromInspector', False):
                ips = body.setdefault('ips', [])
                if self.client_address[0] not in ips:
                    ips.append(self.client_address[0])
            INSPECTIONS[p[2]] = body
        elif p[1] == 'kv':
            KV[p[2]] = body
        self._json(200, body)

    def do_DELETE(self):
        INSPECTIONS.clear()
        KV.clear()
        self._json(200, {'ok': True})


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8795
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
