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

// Templates (static)
router.get('/api/templates', () => json({
  success: true,
  data: {
    templates: [
      { id: 'todo-app', name: 'Todo App', description: 'Task manager with add, complete, and delete. Great for learning React state.', icon: '✅', category: 'Starter', prompt: 'Build me a todo app where I can add tasks, mark them complete, and delete them. Use a dark theme with smooth animations. Include a task counter showing completed vs total.', designStyle: 'neumorphism' },
      { id: 'landing-page', name: 'SaaS Landing Page', description: 'Product landing page with hero, features, pricing, testimonials, and footer.', icon: '🚀', category: 'Business', prompt: 'Build a modern SaaS product landing page with a bold hero section, 3-column features grid, pricing table with 3 tiers (Free, Pro, Enterprise), testimonials section with 3 quotes, and a footer with links. Include separate pages for Features, Pricing, and About with working navigation between all pages. Make it visually stunning.', designStyle: 'glassmorphism' },
      { id: 'portfolio', name: 'Developer Portfolio', description: 'Personal portfolio to showcase your projects and skills.', icon: '👤', category: 'Personal', prompt: 'Build a developer portfolio website with a hero section showing name and title, an about section, a projects grid showing 4 project cards with images and descriptions, a skills section with technology icons, and a contact form. Use a dark professional theme.', designStyle: 'material' },
      { id: 'dashboard', name: 'Analytics Dashboard', description: 'Data dashboard with charts, stats cards, and sidebar navigation.', icon: '📊', category: 'Business', prompt: 'Build an analytics dashboard with a sidebar navigation, top stat cards showing key metrics (revenue, users, growth, conversion), a main chart area showing a line graph, a recent activity table, and a notification panel. Use a dark theme with accent colors for data visualization.', designStyle: 'material' },
      { id: 'blog', name: 'Blog Platform', description: 'Blog with post listing, individual post pages, and categories.', icon: '📝', category: 'Content', prompt: 'Build a blog platform with a home page showing a grid of blog post cards (title, excerpt, date, category tag), separate full post pages for each of 4 articles with realistic content, a sidebar with categories and recent posts, and a header with navigation. Generate separate HTML files for each post page.', designStyle: 'claymorphism' },
      { id: 'ecommerce', name: 'Online Store', description: 'Product catalog with grid layout, product details, and cart.', icon: '🛒', category: 'Business', prompt: 'Build an online store with a product grid showing 8 products with images, names, and prices. Include a product detail page with larger image, description, size/color selectors, and add-to-cart button. Add a shopping cart sidebar that slides in showing added items with quantity controls and a checkout total. Use a clean modern design.', designStyle: 'neo-brutalism' },
    ],
  },
}));

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
