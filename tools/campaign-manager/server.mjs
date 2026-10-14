import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import {
  createCampaign,
  deleteCampaign,
  deleteEntity,
  exportCampaign,
  getCampaign,
  getState,
  importCampaign,
  saveEntity,
  saveImage,
  updateCampaign,
} from './store.mjs';

const MANAGER_ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(MANAGER_ROOT, '..', '..');
const PUBLIC_ROOT = join(MANAGER_ROOT, 'public');
const TOKEN = randomBytes(24).toString('hex');
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const jobs = new Map();
const children = new Set();

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request exceeds the 12 MB limit.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function assertToken(request) {
  if (request.headers['x-manager-token'] !== TOKEN) throw new Error('Invalid manager token.');
}

function jobSnapshot() {
  return Object.fromEntries(
    [...jobs.entries()].map(([key, job]) => [key, { ...job, process: undefined }]),
  );
}

function appendLog(job, text) {
  job.logs = `${job.logs}${text}`.slice(-20_000);
  job.updatedAt = new Date().toISOString();
}

function startJob(kind) {
  const current = jobs.get(kind);
  if (current?.status === 'running') return current;
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const argsByKind = {
    install: ['ci'],
    build: ['run', 'build'],
    preview: ['run', 'start', '--', '--host', '127.0.0.1', '--port', '4200'],
  };
  const args = argsByKind[kind];
  if (!args) throw new Error('Unknown project action.');
  const job = {
    kind,
    status: 'running',
    logs: `$ npm ${args.join(' ')}\n`,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: kind === 'preview' ? 'http://127.0.0.1:4200' : undefined,
  };
  const child = spawn(npm, args, {
    cwd: PROJECT_ROOT,
    windowsHide: true,
    env: { ...process.env, BROWSER: 'none' },
  });
  job.process = child;
  jobs.set(kind, job);
  children.add(child);
  child.stdout.on('data', (data) => appendLog(job, data.toString()));
  child.stderr.on('data', (data) => appendLog(job, data.toString()));
  child.on('error', (error) => {
    appendLog(job, `\n${error.message}\n`);
    job.status = 'failed';
  });
  child.on('close', (code) => {
    children.delete(child);
    if (kind === 'preview' && code === 0) job.status = 'stopped';
    else if (kind === 'preview' && job.status === 'running') job.status = 'failed';
    else job.status = code === 0 ? 'success' : 'failed';
    job.exitCode = code;
    job.updatedAt = new Date().toISOString();
  });
  return job;
}

async function projectStatus() {
  let dependenciesReady = false;
  try {
    await stat(join(PROJECT_ROOT, 'node_modules', '@angular', 'core'));
    dependenciesReady = true;
  } catch {
    // Expected on a fresh clone.
  }
  return { dependenciesReady, jobs: jobSnapshot() };
}

async function serveStatic(response, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const path = resolve(PUBLIC_ROOT, requested);
  const rel = relative(PUBLIC_ROOT, path);
  if (rel.startsWith('..') || rel === '..') return false;
  try {
    let content = await readFile(path);
    if (requested === 'index.html') {
      content = Buffer.from(content.toString('utf8').replace('__MANAGER_TOKEN__', TOKEN));
    }
    response.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
    return true;
  } catch {
    return false;
  }
}

async function serveCampaignAsset(response, pathname) {
  const prefix = '/campaign-assets/';
  if (!pathname.startsWith(prefix)) return false;
  const requested = decodeURIComponent(pathname.slice(prefix.length));
  const root = join(PROJECT_ROOT, 'src', 'campaigns');
  const path = resolve(root, requested);
  const rel = relative(root, path);
  if (!requested || rel.startsWith('..') || rel === '..') return false;
  const contentType = TYPES[extname(path).toLowerCase()];
  if (!contentType?.startsWith('image/')) return false;
  try {
    const content = await readFile(path);
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
    return true;
  } catch {
    return false;
  }
}

async function routeApi(request, response, url) {
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (request.method === 'GET' && url.pathname === '/api/state') {
    sendJson(response, 200, { ...(await getState(PROJECT_ROOT)), ...(await projectStatus()) });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/jobs') {
    sendJson(response, 200, await projectStatus());
    return;
  }
  if (request.method === 'POST') assertToken(request);
  if (request.method === 'PUT') assertToken(request);
  if (request.method === 'DELETE') assertToken(request);

  if (request.method === 'POST' && url.pathname === '/api/campaigns') {
    sendJson(response, 201, await createCampaign(PROJECT_ROOT, await readBody(request)));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/import') {
    sendJson(response, 201, await importCampaign(PROJECT_ROOT, await readBody(request)));
    return;
  }
  if (request.method === 'POST' && parts[1] === 'actions' && parts.length === 3) {
    sendJson(response, 202, { job: { ...startJob(parts[2]), process: undefined } });
    return;
  }
  if (parts[1] !== 'campaigns' || parts.length < 3) {
    sendJson(response, 404, { error: 'API route not found.' });
    return;
  }

  const campaignId = parts[2];
  if (request.method === 'GET' && parts.length === 3) {
    sendJson(response, 200, await getCampaign(PROJECT_ROOT, campaignId));
    return;
  }
  if (request.method === 'PUT' && parts.length === 3) {
    sendJson(
      response,
      200,
      await updateCampaign(PROJECT_ROOT, campaignId, await readBody(request)),
    );
    return;
  }
  if (request.method === 'DELETE' && parts.length === 3) {
    const body = await readBody(request);
    await deleteCampaign(PROJECT_ROOT, campaignId, body.confirmation);
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method === 'GET' && parts[3] === 'export' && parts.length === 4) {
    sendJson(response, 200, await exportCampaign(PROJECT_ROOT, campaignId));
    return;
  }
  if (request.method === 'POST' && parts[3] === 'images' && parts.length === 4) {
    sendJson(response, 201, await saveImage(PROJECT_ROOT, campaignId, await readBody(request)));
    return;
  }
  const type = parts[3];
  if (request.method === 'POST' && parts.length === 4) {
    sendJson(
      response,
      201,
      await saveEntity(PROJECT_ROOT, campaignId, type, await readBody(request)),
    );
    return;
  }
  if (request.method === 'PUT' && parts.length === 5) {
    sendJson(
      response,
      200,
      await saveEntity(PROJECT_ROOT, campaignId, type, await readBody(request), parts[4]),
    );
    return;
  }
  if (request.method === 'DELETE' && parts.length === 5) {
    await deleteEntity(PROJECT_ROOT, campaignId, type, parts[4]);
    sendJson(response, 200, { ok: true });
    return;
  }
  sendJson(response, 404, { error: 'API route not found.' });
}

function openBrowser(url) {
  const command =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

export function startServer({ port = 4173, open = false } = {}) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    try {
      if (url.pathname.startsWith('/api/')) await routeApi(request, response, url);
      else if (request.method === 'GET' && (await serveCampaignAsset(response, url.pathname)))
        return;
      else if (!(await serveStatic(response, url.pathname))) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
      }
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`Campaign Manager ready at ${url}`);
    console.log('Press Ctrl+C to stop it.');
    if (open) openBrowser(url);
  });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < 4183) {
      startServer({ port: port + 1, open });
    } else {
      console.error(error);
      process.exitCode = 1;
    }
  });
  return server;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) startServer({ open: process.argv.includes('--open') });

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
