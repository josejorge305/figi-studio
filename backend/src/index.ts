import { AutoRouter, cors, error, json } from 'itty-router';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { generateRoutes } from './routes/generate';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  FRONTEND_URL: string;
  APP_DOMAIN: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

const { preflight, corsify } = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});

const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

// Health
router.get('/api/health', () => json({ success: true, status: 'running', version: '1.0.0' }));

// Auth routes
router.post('/api/auth/register', (req, env) => authRoutes.register(req, env));
router.post('/api/auth/login', (req, env) => authRoutes.login(req, env));
router.get('/api/auth/me', (req, env) => authRoutes.me(req, env));

// Project routes
router.get('/api/projects', (req, env) => projectRoutes.list(req, env));
router.post('/api/projects', (req, env) => projectRoutes.create(req, env));
router.get('/api/projects/:id', (req, env) => projectRoutes.get(req, env));
router.delete('/api/projects/:id', (req, env) => projectRoutes.delete(req, env));
router.get('/api/projects/:id/files', (req, env) => projectRoutes.getFiles(req, env));
router.get('/api/projects/:id/messages', (req, env) => projectRoutes.getMessages(req, env));

// AI generation
router.post('/api/projects/:id/generate', (req, env) => generateRoutes.generate(req, env));

// 404
router.all('*', () => error(404, 'Not found'));

export default {
  fetch: router.fetch,
};
