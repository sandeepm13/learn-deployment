import { getTasksFromDatabase } from '../lib/db-tasks';
import { TaskBoard } from './components/task-board';

export default async function Home() {
  let initialTasks: Awaited<ReturnType<typeof getTasksFromDatabase>> = [];
  let loadError: string | null = null;

  try {
    initialTasks = await getTasksFromDatabase();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : 'Could not load tasks from the database';
  }

  return (
    <main style={{ padding: '48px 24px', minHeight: '100vh' }}>
      <TaskBoard initialTasks={initialTasks} loadError={loadError} />
    </main>
  );
}
