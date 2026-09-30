// Simulasi Vercel Node function: bundle api/auth/session.ts (CJS) lalu invoke
const { build } = require('esbuild');

async function main() {
  const entry = process.argv[2];
  const out = process.argv[3];

  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: out,
    logLevel: 'error',
  });

  // delete require cache & load
  delete require.cache[require.resolve(out)];
  const mod = require(out);
  const handler = mod.default;

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
}

main().catch((e) => { console.error('FUNCTION GAGAL:', e?.message ?? e); process.exit(1); });
