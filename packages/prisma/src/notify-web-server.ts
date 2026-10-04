export async function notifyTaskListChanged(): Promise<void> {
  const url =
    process.env['WEB_SERVER_NOTIFY_URL'] ?? 'http://localhost:4001/internal/broadcast';
  try {
    await fetch(url, { method: 'POST' });
  } catch (error) {
    console.warn('Could not notify web-server:', error);
  }
}
