export function startSseHeartbeat(
  write: (chunk: string) => void,
  intervalMs = 15_000
): () => void {
  const timer = setInterval(() => write(': keepalive\n\n'), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
