import { TaskBoard } from './components/task-board';

export default function Home() {
  return (
    <main style={{ padding: '48px 24px', minHeight: '100vh' }}>
      <TaskBoard />
    </main>
  );
}
