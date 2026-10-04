import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: resolve(fileURLToPath(import.meta.url), '../.env') });

const { db, listTasks } = await import('../src/index.ts');

const samples = [
  { title: 'Start Docker Postgres', done: true },
  { title: 'Run pnpm db:init', done: false },
  { title: 'Deploy BMS to cloud', done: false },
];

for (const row of samples) {
  await db.orm.public!.Task!.create(row);
}

const tasks = await listTasks(db);

const headers = ['id', 'title', 'done', 'createdAt'];
const rows = tasks.map((t) => [
  String(t.id),
  t.title,
  t.done ? 'yes' : 'no',
  t.createdAt,
]);

const widths = headers.map((h, i) =>
  Math.max(h.length, ...rows.map((r) => r[i].length)),
);

function pad(s: string, w: number) {
  return s.padEnd(w);
}

const line = (cells: string[]) =>
  '| ' + cells.map((c, i) => pad(c, widths[i])).join(' | ') + ' |';

console.log(line(headers));
console.log('| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
for (const row of rows) {
  console.log(line(row));
}

await db.close();
