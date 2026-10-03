import { config as loadEnv } from 'dotenv';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: resolve(fileURLToPath(import.meta.url), '../../../../packages/prisma/.env') });

const { db, listTasks } = await import('@repo/db');

const port = Number(process.env['HTTP_PORT'] ?? 4000);
const webOrigin = process.env['WEB_ORIGIN'] ?? 'http://localhost:3000';
const webServerNotifyUrl =
  process.env['WEB_SERVER_NOTIFY_URL'] ?? 'http://localhost:4001/internal/broadcast';

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': webOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

async function notifyWebServer() {
  try {
    await fetch(webServerNotifyUrl, { method: 'POST' });
  } catch (error) {
    console.warn('Could not notify web-server:', error);
  }
}

const server = createServer((req, res) => {
  void handle(req, res);
});

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null);
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      sendJson(res, 200, { ok: true, service: 'http-server' });
      return;
    }

    if (req.method === 'GET' && path === '/api/tasks') {
      const tasks = await listTasks(db);
      sendJson(res, 200, { tasks });
      return;
    }

    if (req.method === 'POST' && path === '/api/tasks') {
      const body = (await readJson(req)) as { title?: string };
      const title = body.title?.trim();
      if (!title) {
        sendJson(res, 400, { error: 'title is required' });
        return;
      }
      const task = await db.orm.public!.Task!.create({ title, done: false });
      await notifyWebServer();
      sendJson(res, 201, { task });
      return;
    }

    const taskMatch = /^\/api\/tasks\/(\d+)$/.exec(path);
    if (taskMatch) {
      const id = Number(taskMatch[1]);

      if (req.method === 'PATCH') {
        const body = (await readJson(req)) as { title?: string; done?: boolean };
        const updates: { title?: string; done?: boolean } = {};
        if (typeof body.title === 'string') {
          const title = body.title.trim();
          if (!title) {
            sendJson(res, 400, { error: 'title cannot be empty' });
            return;
          }
          updates.title = title;
        }
        if (typeof body.done === 'boolean') {
          updates.done = body.done;
        }
        if (Object.keys(updates).length === 0) {
          sendJson(res, 400, { error: 'send title or done' });
          return;
        }
        const task = await db.orm.public!.Task!.where({ id }).update(updates);
        await notifyWebServer();
        sendJson(res, 200, { task });
        return;
      }

      if (req.method === 'DELETE') {
        await db.orm.public!.Task!.where({ id }).delete();
        await notifyWebServer();
        sendJson(res, 200, { ok: true });
        return;
      }
    }

    sendJson(res, 404, { error: 'not found' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, {
      error: 'internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

server.listen(port, () => {
  console.log(`http-server listening on http://localhost:${port}`);
});
