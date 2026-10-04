import 'server-only';

import {
  createTask,
  db,
  deleteTask,
  listTasks,
  notifyTaskListChanged,
  updateTask,
  type TaskRow,
} from '@repo/db';

export type Task = TaskRow;

/** Web app: read tasks directly from PostgreSQL via Prisma. */
export async function getTasksFromDatabase(): Promise<Task[]> {
  return listTasks(db);
}

export async function createTaskInDatabase(title: string): Promise<void> {
  await createTask(db, title);
  await notifyTaskListChanged();
}

export async function updateTaskInDatabase(
  id: number,
  updates: { title?: string; done?: boolean },
): Promise<void> {
  await updateTask(db, id, updates);
  await notifyTaskListChanged();
}

export async function deleteTaskFromDatabase(id: number) {
  await deleteTask(db, id);
  await notifyTaskListChanged();
}
