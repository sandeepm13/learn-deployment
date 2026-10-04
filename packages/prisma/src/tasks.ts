import type { db } from './prisma/db';

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

export async function createTask(database: DbClient, title: string) {
  return database.orm.public!.Task!.create({ title, done: false });
}

export async function updateTask(
  database: DbClient,
  id: number,
  updates: { title?: string; done?: boolean },
) {
  return database.orm.public!.Task!.where({ id }).update(updates);
}

export async function deleteTask(database: DbClient, id: number) {
  await database.orm.public!.Task!.where({ id }).delete();
}
