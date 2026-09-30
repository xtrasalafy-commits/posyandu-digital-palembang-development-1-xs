// Simulasi Vercel Node function: bundle api/auth/session.ts (CJS) lalu invoke
import { build } from 'esbuild';

const entry = process.argv[2];
const out = process.argv[3];

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs', // @vercel/node historical output
  target: 'node20',
  outfile: out,
  logLevel: 'error',
  banner: undefined,
});

const mod = await import(out + '?t=' + Date.now());
const handler = mod.default;

// Mock req/res
const req = { method: 'GET', headers: {} };
const res = {
  statusCode: 200,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { console.log('STATUS:', this.statusCode); console.log('BODY:', JSON.stringify(body)); return this; },
  setHeader(k, v) { this.headers[k] = v; },
};

await handler(req, res);
console.log('FUNCTION BERJALAN OK');
