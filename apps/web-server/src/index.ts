import { config as loadEnv } from 'dotenv';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';

loadEnv({ path: resolve(fileURLToPath(import.meta.url), '../../../../packages/prisma/.env') });

const { db, listTasks } = await import('@repo/db');

const port = Number(process.env['PORT'] ?? process.env['WS_PORT'] ?? 4001);
const webOrigin = process.env['WEB_ORIGIN'] ?? 'http://localhost:3000';

const server = createServer((req, res) => {
  void handleHttp(req, res);
});

const wss = new WebSocketServer({ noServer: true });

async function pushTasks(ws: WebSocket) {
  const tasks = await listTasks(db);
  ws.send(JSON.stringify({ type: 'tasks', tasks }));
}

async function broadcastTasks() {
  const tasks = await listTasks(db);
  const payload = JSON.stringify({ type: 'tasks', tasks });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  const path = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
  if (path !== '/ws/tasks') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws) => {
  void pushTasks(ws).catch((error) => {
    console.error('websocket initial push failed', error);
    ws.close();
  });
});

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': webOrigin,
  });
  res.end(JSON.stringify(body));
}

async function handleHttp(req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, { ok: true, service: 'web-server', websocket: '/ws/tasks' });
    return;
  }

  if (req.method === 'POST' && path === '/internal/broadcast') {
    try {
      await broadcastTasks();
      sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: 'broadcast failed' });
    }
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

server.listen(port, () => {
  console.log(`web-server (WebSocket) listening on ws://localhost:${port}/ws/tasks`);
});
