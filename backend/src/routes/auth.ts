import { json } from 'itty-router';
import { Env } from '../index';

// Simple JWT using Web Crypto API (CF Workers compatible)
async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const msg = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${msg}.${sigB64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const msg = `${parts[0]}.${parts[1]}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(msg));
    if (!valid) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

export async function getUser(req: Request, env: Env): Promise<{ id: number; email: string; name: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || typeof payload.userId !== 'number') return null;
  const user = await env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?').bind(payload.userId).first<{ id: number; email: string; name: string }>();
  return user || null;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + 'figi-studio-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export const authRoutes = {
  async register(req: Request, env: Env): Promise<Response> {
    try {
      const { email, password, name } = await req.json() as { email: string; password: string; name?: string };
      if (!email || !password) return json({ success: false, error: 'Email and password required' }, { status: 400 });
      if (password.length < 6) return json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });

      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (existing) return json({ success: false, error: 'Email already registered' }, { status: 409 });

      const passwordHash = await hashPassword(password);
      const result = await env.DB.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).bind(email.toLowerCase(), passwordHash, name || email.split('@')[0]).run();

      const userId = result.meta.last_row_id;
      const token = await signJWT({ userId, email: email.toLowerCase(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }, env.JWT_SECRET);

      return json({ success: true, data: { token, user: { id: userId, email: email.toLowerCase(), name: name || email.split('@')[0] } } });
    } catch (e: unknown) {
      return json({ success: false, error: e instanceof Error ? e.message : 'Registration failed' }, { status: 500 });
    }
  },

  async login(req: Request, env: Env): Promise<Response> {
    try {
      const { email, password } = await req.json() as { email: string; password: string };
      if (!email || !password) return json({ success: false, error: 'Email and password required' }, { status: 400 });

      const user = await env.DB.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
        .bind(email.toLowerCase()).first<{ id: number; email: string; name: string; password_hash: string }>();
      if (!user) return json({ success: false, error: 'Invalid email or password' }, { status: 401 });

      const passwordHash = await hashPassword(password);
      if (passwordHash !== user.password_hash) return json({ success: false, error: 'Invalid email or password' }, { status: 401 });

      const token = await signJWT({ userId: user.id, email: user.email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }, env.JWT_SECRET);
      return json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name } } });
    } catch (e: unknown) {
      return json({ success: false, error: e instanceof Error ? e.message : 'Login failed' }, { status: 500 });
    }
  },

  async me(req: Request, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    return json({ success: true, data: { user } });
  },
};
