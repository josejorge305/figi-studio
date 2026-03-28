import { AutoRouter, cors, error, json } from 'itty-router';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { generateRoutes } from './routes/generate';
import { githubRoutes } from './routes/github';
import { cloudflareRoutes } from './routes/cloudflare';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  FRONTEND_URL: string;
  APP_DOMAIN: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

const ALLOWED_ORIGINS = [
  'https://figi-studio.pages.dev',
  'https://figicode.com',
  'https://figi-studio.figicode.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const { preflight, corsify } = cors({
  origin: (origin: string) => ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
router.get('/api/projects/:id/preview', (req, env) => projectRoutes.preview(req, env));

// File CRUD routes
router.post('/api/projects/:id/files', (req, env) => projectRoutes.createFile(req, env));
router.put('/api/projects/:id/files/:fileId', (req, env) => projectRoutes.updateFile(req, env));
router.patch('/api/projects/:id/files/:fileId', (req, env) => projectRoutes.renameFile(req, env));
router.delete('/api/projects/:id/files/:fileId', (req, env) => projectRoutes.deleteFile(req, env));

// AI generation
router.post('/api/projects/:id/generate', (req, env) => generateRoutes.generate(req, env));

// GitHub routes
router.get('/api/github/auth-url', (req, env) => githubRoutes.authUrl(req, env));
router.post('/api/github/callback', (req, env) => githubRoutes.callback(req, env));
router.get('/api/github/status', (req, env) => githubRoutes.status(req, env));
router.delete('/api/github/disconnect', (req, env) => githubRoutes.disconnect(req, env));
router.post('/api/projects/:id/github/init', (req, env) => githubRoutes.initRepo(req, env));
router.post('/api/projects/:id/github/commit', (req, env) => githubRoutes.commitAndPush(req, env));
router.get('/api/projects/:id/github/status', (req, env) => githubRoutes.repoStatus(req, env));

// Cloudflare routes
router.post('/api/cloudflare/connect', (req, env) => cloudflareRoutes.connect(req, env));
router.get('/api/cloudflare/status', (req, env) => cloudflareRoutes.status(req, env));
router.delete('/api/cloudflare/disconnect', (req, env) => cloudflareRoutes.disconnect(req, env));
router.post('/api/projects/:id/deploy', (req, env) => cloudflareRoutes.deploy(req, env));
router.get('/api/projects/:id/deployments', (req, env) => cloudflareRoutes.deployments(req, env));

// 404
router.all('*', () => error(404, 'Not found'));

export default {
  fetch: router.fetch,
};
