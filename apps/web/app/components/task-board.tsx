'use client';

import { useEffect, useState } from 'react';
import {
  createTaskAction,
  deleteTaskAction,
  toggleTaskDoneAction,
} from '../actions/tasks';

type Task = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

function wsUrl(): string {
  const fromEnv = process.env['NEXT_PUBLIC_WS_URL'];
  if (fromEnv) return fromEnv;
  return 'ws://localhost:4001/ws/tasks';
}

type Props = {
  initialTasks: Task[];
  loadError: string | null;
};

export function TaskBoard({ initialTasks, loadError }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(loadError);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const socket = new WebSocket(wsUrl());

    socket.addEventListener('open', () => setWsStatus('live'));
    socket.addEventListener('close', () => setWsStatus('offline'));
    socket.addEventListener('error', () => setWsStatus('offline'));

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(String(event.data)) as { type: string; tasks?: Task[] };
        if (data.type === 'tasks' && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          setError(null);
        }
      } catch {
        setError('Invalid WebSocket message from web-server');
      }
    });

    return () => socket.close();
  }, []);

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await createTaskAction(trimmed);
      setTitle('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add task');
    }
  }

  async function toggleDone(task: Task) {
    setError(null);
    try {
      await toggleTaskDoneAction(task.id, !task.done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update task');
    }
  }

  async function removeTask(id: number) {
    setError(null);
    try {
      await deleteTaskAction(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task');
    }
  }

  const statusLabel =
    wsStatus === 'live'
      ? 'Live (web-server WebSocket)'
      : wsStatus === 'connecting'
        ? 'Connecting WebSocket…'
        : 'WebSocket offline';

  return (
    <section style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>BMS Task Board</h1>
      <p style={{ color: '#555', marginBottom: 8 }}>
        <strong>web</strong> reads/writes PostgreSQL via Prisma ·{' '}
        <strong>http-server</strong> REST API · <strong>web-server</strong> WebSocket
      </p>
      <p style={{ fontSize: 14, color: wsStatus === 'live' ? '#0a7' : '#888', marginBottom: 24 }}>
        {statusLabel}
      </p>

      <form onSubmit={addTask} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task…"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8 }}>
          Add
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: '#b00020', marginBottom: 12 }}>
          {error} — check Postgres (`pnpm db:up`) and `DATABASE_URL` in `apps/web/.env.local`
        </p>
      )}

      {tasks.length === 0 ? (
        <p>No tasks yet. Add one above.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                border: '1px solid #e5e5e5',
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => void toggleDone(task)}
                aria-label={`Mark "${task.title}" done`}
              />
              <span style={{ flex: 1, textDecoration: task.done ? 'line-through' : 'none' }}>
                {task.title}
              </span>
              <button type="button" onClick={() => void removeTask(task.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
