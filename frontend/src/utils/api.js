const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function getToken() {
  return localStorage.getItem('figi_studio_token');
}

export function setToken(token) {
  localStorage.setItem('figi_studio_token', token);
}

export function clearToken() {
  localStorage.removeItem('figi_studio_token');
  localStorage.removeItem('figi_studio_user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('figi_studio_user') || 'null');
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('figi_studio_user', JSON.stringify(user));
}

export const api = {
  get: (path) =>
    fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }).then((r) => r.json()),

  post: (path, data) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};
