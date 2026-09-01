/**
 * OCE Flow — front-end <-> Django bridge.
 *
 * The prototype store (`store.tsx`) currently persists to localStorage so it
 * runs standalone in the browser. To go multi-client on the LAN, swap the
 * store's persistence for this client: each function below mirrors one store
 * action to one REST endpoint, and `connectLive` streams server pushes so a
 * paper reaches the intended recipient instantly.
 *
 * Usage sketch inside StoreProvider:
 *   const api = createApi(import.meta.env.VITE_API_URL ?? '/api');
 *   // login -> api.login(...) then keep the token
 *   // replace setDb(papers) mutations with `await api.createPaper(...)` etc.
 *   // call connectLive(token, evt => applyServerEvent(evt)) once after login
 */

export interface LiveEvent {
  kind: string;
  ref?: string;
  docId?: number;
  [key: string]: unknown;
}

export function createApi(baseUrl: string) {
  let token: string | null = null;

  const headers = (json = true): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Token ${token}` } : {}),
  });

  async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(baseUrl + path, { ...init, headers: headers(!(init.body instanceof FormData)) });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || `${res.status} ${res.statusText}`);
    }
    return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
  }

  const get = <T>(p: string) => req<T>(p);
  const post = <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  const patch = <T>(p: string, body: unknown) =>
    req<T>(p, { method: 'PATCH', body: JSON.stringify(body) });
  const del = (p: string) => req<void>(p, { method: 'DELETE' });

  return {
    setToken: (t: string | null) => { token = t; },

    // ---- auth ----
    login: (username: string, password: string) =>
      post<{ token: string; user: unknown }>('/auth/login', { username, password }),
    logout: () => post<void>('/auth/logout'),
    signup: (data: Record<string, unknown>) => post<void>('/auth/signup', data),
    forgotPassword: (username: string) => post<void>('/auth/forgot-password', { username }),
    me: () => get<unknown>('/me'),

    // ---- papers (each mirrors a store action) ----
    listPapers: () => get<unknown[]>('/papers/'),
    createPaper: (data: Record<string, unknown>) => post<unknown>('/papers/', data),
    deletePaper: (id: number) => del(`/papers/${id}/`),
    movePaper: (id: number, stage: string, note?: string, employeeId?: number) =>
      post(`/papers/${id}/move/`, { stage, note, employeeId }),
    routePaper: (id: number, targets: string[], note?: string) =>
      post(`/papers/${id}/route/`, { targets, note }),
    ackPaper: (id: number) => post(`/papers/${id}/ack/`),
    setProgress: (id: number, value: number) => post(`/papers/${id}/progress/`, { value }),
    assignPaper: (id: number, ids: number[]) => post(`/papers/${id}/assign/`, { ids }),
    submitToHead: (id: number) => post(`/papers/${id}/submit_head/`),
    returnToEmployee: (id: number) => post(`/papers/${id}/return_head/`),
    addNote: (id: number, text: string) => post(`/papers/${id}/notes/`, { text }),
    uploadAttachment: (id: number, file: File, lat?: number, lng?: number) => {
      const fd = new FormData();
      fd.append('file', file);
      if (lat != null) fd.append('lat', String(lat));
      if (lng != null) fd.append('lng', String(lng));
      return req<unknown>(`/papers/${id}/attachments/`, { method: 'POST', body: fd });
    },
    removeAttachment: (id: number, attId: number) => del(`/papers/${id}/attachments/${attId}/`),

    // ---- divisions / OIC ----
    listDivisions: () => get<unknown[]>('/divisions/'),
    updateDivision: (id: number, data: { name?: string; desc?: string }) => patch(`/divisions/${id}/meta/`, data),
    setOic: (id: number, userId: number, temporary: boolean, note?: string) =>
      post(`/divisions/${id}/set_oic/`, { userId, temporary, note }),
    removeOic: (id: number) => post(`/divisions/${id}/remove_oic/`),

    // ---- users (admin) ----
    listUsers: () => get<unknown[]>('/users/'),
    approveUser: (id: number) => post(`/users/${id}/approve/`),
    denyUser: (id: number) => post(`/users/${id}/deny/`),
    resetPassword: (id: number) => post(`/users/${id}/reset_password/`),

    // ---- notifications ----
    listNotifications: () => get<unknown[]>('/notifications/'),
    markAllRead: () => post<void>('/notifications/mark_all/'),
    markRead: (id: number) => post<void>(`/notifications/${id}/mark/`),

    // ---- messaging ----
    listChannels: () => get<unknown[]>('/channels/'),
    listMessages: (channelId: number) => get<unknown[]>(`/channels/${channelId}/messages/`),
    sendMessage: (channelId: number, text: string, docs?: number[]) =>
      post(`/channels/${channelId}/send/`, { text, docs }),
    manageMember: (channelId: number, userId: number, add: boolean) =>
      post(`/channels/${channelId}/manage_member/`, { userId, add }),

    // ---- logs & customization ----
    listLogs: () => get<unknown[]>('/logs/'),
    getCustom: () => get<Record<string, unknown>>('/custom'),
    updateCustom: (data: Record<string, unknown>) =>
      req<Record<string, unknown>>('/custom', { method: 'PUT', body: JSON.stringify(data), headers: headers() }),
  };
}

/**
 * Open the live channel. Returns a close function.
 * Server -> client events arrive as `LiveEvent` (paper.created, paper.routed,
 * notification, message, ...). Apply them to the store to update the board,
 * bell and taskbar in real time.
 */
export function connectLive(wsUrl: string, token: string, onEvent: (e: LiveEvent) => void): () => void {
  // Token auth over WS: pass it as a query param; the Channels consumer reads it.
  const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
  ws.onmessage = (m) => {
    try { onEvent(JSON.parse(m.data) as LiveEvent); } catch { /* ignore malformed */ }
  };
  return () => ws.close();
}
