'use server';

import { revalidatePath } from 'next/cache';
import {
  createTaskInDatabase,
  deleteTaskFromDatabase,
  updateTaskInDatabase,
} from '../../lib/db-tasks';

export async function createTaskAction(title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('title is required');
  }
  await createTaskInDatabase(trimmed);
  revalidatePath('/');
}

export async function toggleTaskDoneAction(id: number, done: boolean) {
  await updateTaskInDatabase(id, { done });
  revalidatePath('/');
}

export async function deleteTaskAction(id: number) {
  await deleteTaskFromDatabase(id);
  revalidatePath('/');
}
