import type { db } from './prisma/db.js';

type DbClient = typeof db;

export type TaskRow = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

export async function listTasks(database: DbClient): Promise<TaskRow[]> {
  return database.orm.public!.Task!.select('id', 'title', 'done', 'createdAt')
    .orderBy((t) => t.id.desc())
    .all();
}
