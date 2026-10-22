import { rawToken, API_BASE } from './client';

export interface AssistantStatus { configured: boolean; daily_limit: number; used_today: number }
export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface ChatReply { reply: string; used_today: number; daily_limit: number; remaining: number }

/** Error that keeps the HTTP status and machine code, so the widget can tell "not configured" from "quota used up". */
export class AssistantError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  constructor(message: string, status: number, code?: string, retryAfter?: number) { super(message); this.status = status; this.code = code; this.retryAfter = retryAfter; }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = rawToken();
  const res = await fetch(`${API_BASE}/api/assistant${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) throw new AssistantError((json.error as string) ?? `HTTP ${res.status}`, res.status, json.code as string | undefined, json.retry_after_seconds as number | undefined);
  return json as T;
}

export const assistant = {
  status: () => call<AssistantStatus>('GET', '/status'),
  chat: (message: string, history: ChatTurn[]) => call<ChatReply>('POST', '/chat', { message, history }),
};
