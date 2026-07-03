/**
 * Read a fetch() Response body as a Server-Sent Events stream and dispatch
 * parsed JSON payloads per event name. Buffers across chunk boundaries.
 */
export async function readSSE(
  response: Response,
  onEvent: (event: string, data: unknown) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) {
          event = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          data += line.slice(6);
        }
      }
      if (data && data !== '[DONE]') {
        try {
          onEvent(event, JSON.parse(data));
        } catch {
          // Ignore malformed payloads
        }
      }
    }
  }
}
