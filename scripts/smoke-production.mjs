import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 3105;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    DATABASE_PATH: ':memory:'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The process may still be starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not become ready.\n${output}`);
}

try {
  await waitForServer();

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');

  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<title>menu\.pictures<\/title>/);

  const clientRoute = await fetch(`${baseUrl}/saved`);
  assert.equal(clientRoute.status, 200);
  assert.match(await clientRoute.text(), /<div id="root"><\/div>/);

  console.log('Production smoke test passed: API, homepage, and SPA fallback are available.');
} finally {
  server.kill('SIGTERM');
}
