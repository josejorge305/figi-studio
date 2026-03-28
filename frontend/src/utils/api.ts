const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function getToken(): string | null {
  return localStorage.getItem('figi_studio_token');
}

function getHeaders(includeAuth = true): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    return await res.json();
  } catch {
    return { success: false, error: 'Invalid response from server' };
  }
}

export const api = {
  get: async <T>(path: string) => handleResponse<T>(await fetch(`${BASE}${path}`, { headers: getHeaders() })),
  post: async <T>(path: string, data?: unknown, auth = true) => handleResponse<T>(await fetch(`${BASE}${path}`, { method: 'POST', headers: getHeaders(auth), body: JSON.stringify(data) })),
  put: async <T>(path: string, data?: unknown) => handleResponse<T>(await fetch(`${BASE}${path}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) })),
  patch: async <T>(path: string, data?: unknown) => handleResponse<T>(await fetch(`${BASE}${path}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) })),
  delete: async <T>(path: string) => handleResponse<T>(await fetch(`${BASE}${path}`, { method: 'DELETE', headers: getHeaders() })),
};

export function setToken(token: string) { localStorage.setItem('figi_studio_token', token); }
export function clearToken() { localStorage.removeItem('figi_studio_token'); }
export function hasToken(): boolean { return !!getToken(); }
