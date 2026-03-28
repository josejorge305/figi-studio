// =============================================================
// FIGI CODE CURRICULUM MAP — Verified from source March 28, 2026
// URL Pattern: https://figicode.com/learn?lesson={ID}&chapter={CHAPTER_ID}&from=figi-studio
// =============================================================

export const FIGI_CODE_BASE_URL = 'https://figicode.com';

export function lessonUrl(lessonId: string, chapterId?: string): string {
  const chapter = chapterId || lessonId.split('-')[0];
  return `${FIGI_CODE_BASE_URL}/learn?lesson=${lessonId}&chapter=${chapter}&from=figi-studio`;
}

// ─── ERROR → LESSON MAPPING ────────────────────────────────

export interface ErrorMapping {
  pattern: RegExp;
  lessonId: string;
  chapterId: string;
  lessonTitle: string;
  chapterTitle: string;
  description: string;
}

export const ERROR_MAPPINGS: ErrorMapping[] = [
  { pattern: /cannot read propert(y|ies) of (undefined|null)/i, lessonId: 'ch9-l3', chapterId: 'ch9', lessonTitle: 'Common Errors Decoded', chapterTitle: 'Reading Errors Without Panicking', description: 'Learn why this happens and three ways to fix it.' },
  { pattern: /undefined is not a function/i, lessonId: 'ch9-l3', chapterId: 'ch9', lessonTitle: 'Common Errors Decoded', chapterTitle: 'Reading Errors Without Panicking', description: "You're calling something that doesn't exist yet." },
  { pattern: /is not defined|ReferenceError/i, lessonId: 'ch9-l3', chapterId: 'ch9', lessonTitle: 'Common Errors Decoded', chapterTitle: 'Reading Errors Without Panicking', description: 'A variable or function is missing — check your imports.' },
  { pattern: /unexpected token|SyntaxError/i, lessonId: 'ch9-l2', chapterId: 'ch9', lessonTitle: 'Anatomy of an Error Message', chapterTitle: 'Reading Errors Without Panicking', description: 'Learn to read what the error is actually telling you.' },
  { pattern: /TypeError/i, lessonId: 'ch9-l3', chapterId: 'ch9', lessonTitle: 'Common Errors Decoded', chapterTitle: 'Reading Errors Without Panicking', description: "You're using a value in a way it doesn't support." },
  { pattern: /useState|hook|rendered more hooks|rules of hooks/i, lessonId: 'ch8-l1', chapterId: 'ch8', lessonTitle: 'React — Building Blocks for UI', chapterTitle: 'Building the Screen (Frontend)', description: 'React hooks have rules — this lesson covers them.' },
  { pattern: /cannot update.*while rendering|too many re-renders/i, lessonId: 'ch8-l5', chapterId: 'ch8', lessonTitle: 'Build Your First Page', chapterTitle: 'Building the Screen (Frontend)', description: 'Your component is updating state during render — common React trap.' },
  { pattern: /useEffect.*dependency|missing dependency/i, lessonId: 'ch8-l5', chapterId: 'ch8', lessonTitle: 'Build Your First Page', chapterTitle: 'Building the Screen (Frontend)', description: 'useEffect needs the right dependencies to avoid bugs.' },
  { pattern: /unmounted component|memory leak/i, lessonId: 'ch9-l6', chapterId: 'ch9', lessonTitle: 'Debugging AI-Generated Code', chapterTitle: 'Reading Errors Without Panicking', description: 'AI-generated code sometimes forgets cleanup — learn to spot it.' },
  { pattern: /CORS|cross-origin|blocked by CORS/i, lessonId: 'ch7-l5', chapterId: 'ch7', lessonTitle: 'Designing Clean REST APIs', chapterTitle: 'Building the Brain (Backend)', description: "CORS errors mean your backend isn't allowing your frontend to connect." },
  { pattern: /404|not found/i, lessonId: 'ch7-l5', chapterId: 'ch7', lessonTitle: 'Designing Clean REST APIs', chapterTitle: 'Building the Brain (Backend)', description: "The URL you're fetching doesn't match any route on the server." },
  { pattern: /401|unauthorized|forbidden/i, lessonId: 'ch7-l7', chapterId: 'ch7', lessonTitle: 'Add Login with Clerk', chapterTitle: 'Building the Brain (Backend)', description: 'Your request is missing authentication or the token expired.' },
  { pattern: /500|internal server error/i, lessonId: 'ch9-l3', chapterId: 'ch9', lessonTitle: 'Common Errors Decoded', chapterTitle: 'Reading Errors Without Panicking', description: 'Something crashed on the server — check your backend logs.' },
  { pattern: /failed to fetch|network|ERR_CONNECTION/i, lessonId: 'ch8-l4', chapterId: 'ch8', lessonTitle: 'The API Utility (Connecting Screen to Brain)', chapterTitle: 'Building the Screen (Frontend)', description: "Your frontend can't reach the backend — check the URL." },
  { pattern: /timeout|timed out/i, lessonId: 'ch11-l8', chapterId: 'ch11', lessonTitle: 'Cost Control & Rate Limiting', chapterTitle: 'Add AI to Your Apps', description: 'The request took too long — AI calls need timeout handling.' },
  { pattern: /D1|database.*locked|SQLITE/i, lessonId: 'ch7-l3', chapterId: 'ch7', lessonTitle: 'D1 — Your SQL Database', chapterTitle: 'Building the Brain (Backend)', description: 'D1 database issue — this lesson covers setup and common pitfalls.' },
  { pattern: /migration|CREATE TABLE|ALTER TABLE/i, lessonId: 'ch7-l3', chapterId: 'ch7', lessonTitle: 'D1 — Your SQL Database', chapterTitle: 'Building the Brain (Backend)', description: 'Database schema changes need migrations — learn how.' },
  { pattern: /foreign key|constraint/i, lessonId: 'ch7-l0', chapterId: 'ch7', lessonTitle: 'SQL in 5 Minutes', chapterTitle: 'Building the Brain (Backend)', description: 'SQL relationships and constraints explained from scratch.' },
  { pattern: /query.*syntax|SQL.*error/i, lessonId: 'ch7-l0', chapterId: 'ch7', lessonTitle: 'SQL in 5 Minutes', chapterTitle: 'Building the Brain (Backend)', description: 'Your SQL query has a syntax issue — this lesson covers the basics.' },
  { pattern: /npm ERR|npm error|ERESOLVE/i, lessonId: 'ch2-l2', chapterId: 'ch2', lessonTitle: 'Install Node.js', chapterTitle: 'Your Computer is a Dev Machine', description: 'npm install issues usually mean a version conflict.' },
  { pattern: /module not found|cannot find module|import/i, lessonId: 'ch8-l3', chapterId: 'ch8', lessonTitle: 'Set Up Your Frontend Project', chapterTitle: 'Building the Screen (Frontend)', description: 'A file or package is missing — check your imports and installs.' },
  { pattern: /wrangler|deploy.*fail/i, lessonId: 'ch10-l1', chapterId: 'ch10', lessonTitle: 'Deploy Backend + Frontend', chapterTitle: 'Ship It — Go Live', description: 'Deployment issues — this lesson walks through the full process.' },
  { pattern: /vite|build.*error|bundle/i, lessonId: 'ch8-l3', chapterId: 'ch8', lessonTitle: 'Set Up Your Frontend Project', chapterTitle: 'Building the Screen (Frontend)', description: 'Build errors often come from bad imports or missing files.' },
  { pattern: /environment variable|process\.env|\.env/i, lessonId: 'ch8-l3b', chapterId: 'ch8', lessonTitle: 'Environment Variables', chapterTitle: 'Building the Screen (Frontend)', description: 'Env vars need special handling in frontend vs backend.' },
  { pattern: /api key.*invalid|authentication.*fail.*api/i, lessonId: 'ch11-l3', chapterId: 'ch11', lessonTitle: 'Keeping API Keys Safe', chapterTitle: 'Add AI to Your Apps', description: 'API key issues — learn how to manage secrets properly.' },
  { pattern: /rate limit|429|too many requests/i, lessonId: 'ch11-l8', chapterId: 'ch11', lessonTitle: 'Cost Control & Rate Limiting', chapterTitle: 'Add AI to Your Apps', description: "You're hitting the API too fast — add rate limiting." },
  { pattern: /token limit|context.*length|max.*tokens/i, lessonId: 'ch11-l4', chapterId: 'ch11', lessonTitle: 'Build an AI Chat Feature', chapterTitle: 'Add AI to Your Apps', description: 'AI models have token limits — manage conversation length.' },
  { pattern: /streaming|SSE|event.?source/i, lessonId: 'ch11-l5', chapterId: 'ch11', lessonTitle: 'Streaming Responses', chapterTitle: 'Add AI to Your Apps', description: "Streaming makes AI responses feel instant — here's how." },
  { pattern: /merge conflict/i, lessonId: 'ch3-l5', chapterId: 'ch3', lessonTitle: 'Branches: Build Without Breaking', chapterTitle: "Git — Your Code's Save System", description: 'Merge conflicts are normal — this lesson teaches you to resolve them.' },
  { pattern: /detached HEAD|git.*checkout/i, lessonId: 'ch3-l2', chapterId: 'ch3', lessonTitle: 'Git Basics: Add, Commit, Push', chapterTitle: "Git — Your Code's Save System", description: 'Git basics — understand where your code lives.' },
  { pattern: /command not found/i, lessonId: 'ch2-l1', chapterId: 'ch2', lessonTitle: 'Meet Terminal', chapterTitle: 'Your Computer is a Dev Machine', description: "The command isn't installed or isn't in your PATH." },
  { pattern: /permission denied|EACCES/i, lessonId: 'ch2-l3', chapterId: 'ch2', lessonTitle: 'Commands You\'ll Use Every Day', chapterTitle: 'Your Computer is a Dev Machine', description: 'Permission issues — may need sudo or the right directory.' },
  { pattern: /port.*in use|EADDRINUSE/i, lessonId: 'ch7-l2', chapterId: 'ch7', lessonTitle: 'Create Your First Worker', chapterTitle: 'Building the Brain (Backend)', description: 'Another process is using that port — kill it or use a different one.' },
  { pattern: /error/i, lessonId: 'ch9-l2', chapterId: 'ch9', lessonTitle: 'Anatomy of an Error Message', chapterTitle: 'Reading Errors Without Panicking', description: 'Every error tells you what went wrong — learn to read them.' },
];

export function matchErrorToLesson(errorMessage: string): ErrorMapping | null {
  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.pattern.test(errorMessage)) return mapping;
  }
  return null;
}

// ─── FILE TYPE → LESSON MAPPING ──────────────────────────────

export interface LessonSuggestion {
  lessonId: string;
  chapterId: string;
  lessonTitle: string;
  chapterTitle: string;
  chapterIcon: string;
  chapterColor: string;
  relevance: string;
}

const FILE_LESSONS: Record<string, LessonSuggestion[]> = {
  '.html': [
    { lessonId: 'ch1-l1', chapterId: 'ch1', lessonTitle: 'The Anatomy of Every App', chapterTitle: 'What You\'re Actually Building', chapterIcon: '🧬', chapterColor: '#a855f7', relevance: 'How HTML fits into the app architecture' },
    { lessonId: 'ch8-l3', chapterId: 'ch8', lessonTitle: 'Set Up Your Frontend Project', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'HTML as the entry point for your React app' },
  ],
  '.css': [
    { lessonId: 'ch8-l2', chapterId: 'ch8', lessonTitle: 'Tailwind CSS — Styling Without CSS Files', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'Modern styling with utility-first CSS' },
  ],
  '.scss': [
    { lessonId: 'ch8-l2', chapterId: 'ch8', lessonTitle: 'Tailwind CSS — Styling Without CSS Files', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'Styling approaches for your frontend' },
  ],
  '.jsx': [
    { lessonId: 'ch8-l1', chapterId: 'ch8', lessonTitle: 'React — Building Blocks for UI', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'How React components work' },
    { lessonId: 'ch8-l5', chapterId: 'ch8', lessonTitle: 'Build Your First Page', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'Building real pages with React' },
    { lessonId: 'ch8-l3d', chapterId: 'ch8', lessonTitle: 'Forms That Actually Work', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'Handling user input in React forms' },
  ],
  '.tsx': [
    { lessonId: 'ch8-l1', chapterId: 'ch8', lessonTitle: 'React — Building Blocks for UI', chapterTitle: 'Building the Screen', chapterIcon: '🎨', chapterColor: '#3b82f6', relevance: 'React component fundamentals' },
    { lessonId: 'ch6-l3', chapterId: 'ch6', lessonTitle: 'TypeScript — Spell-Check for Logic', chapterTitle: 'Guardrails — Why Rules Matter', chapterIcon: '🛤️', chapterColor: '#eab308', relevance: 'Why TypeScript makes React safer' },
  ],
  '.js': [
    { lessonId: 'ch2-l3', chapterId: 'ch2', lessonTitle: 'Commands You\'ll Use Every Day', chapterTitle: 'Your Computer is a Dev Machine', chapterIcon: '🖥️', chapterColor: '#f97316', relevance: 'JavaScript runs in Node.js and the browser' },
    { lessonId: 'ch9-l3', chapterId: 'ch9', lessonTitle: 'Common Errors Decoded', chapterTitle: 'Reading Errors Without Panicking', chapterIcon: '🔍', chapterColor: '#f87171', relevance: 'Common JS errors and how to fix them' },
  ],
  '.ts': [
    { lessonId: 'ch6-l3', chapterId: 'ch6', lessonTitle: 'TypeScript — Spell-Check for Logic', chapterTitle: 'Guardrails — Why Rules Matter', chapterIcon: '🛤️', chapterColor: '#eab308', relevance: 'TypeScript adds safety to your code' },
    { lessonId: 'ch7-l2', chapterId: 'ch7', lessonTitle: 'Create Your First Worker', chapterTitle: 'Building the Brain (Backend)', chapterIcon: '🧠', chapterColor: '#f97316', relevance: 'Backend Workers use TypeScript' },
  ],
  '.sql': [
    { lessonId: 'ch7-l0', chapterId: 'ch7', lessonTitle: 'SQL in 5 Minutes', chapterTitle: 'Building the Brain (Backend)', chapterIcon: '🧠', chapterColor: '#f97316', relevance: 'SQL fundamentals from scratch' },
    { lessonId: 'ch7-l3', chapterId: 'ch7', lessonTitle: 'D1 — Your SQL Database', chapterTitle: 'Building the Brain (Backend)', chapterIcon: '🧠', chapterColor: '#f97316', relevance: 'Using D1 with Cloudflare Workers' },
  ],
  '.json': [
    { lessonId: 'ch1-l1', chapterId: 'ch1', lessonTitle: 'The Anatomy of Every App', chapterTitle: 'What You\'re Actually Building', chapterIcon: '🧬', chapterColor: '#a855f7', relevance: 'JSON is the language apps use to talk to each other' },
  ],
  '.md': [
    { lessonId: 'ch4-l4', chapterId: 'ch4', lessonTitle: 'The CLAUDE.md Rulebook', chapterTitle: 'Claude Code — Your AI Co-Pilot', chapterIcon: '🤖', chapterColor: '#ec4899', relevance: 'CLAUDE.md configures how AI works on your project' },
    { lessonId: 'ch6-l2', chapterId: 'ch6', lessonTitle: 'The CLAUDE.md Deep Dive', chapterTitle: 'Guardrails — Why Rules Matter', chapterIcon: '🛤️', chapterColor: '#eab308', relevance: 'Advanced CLAUDE.md patterns' },
  ],
  '.toml': [
    { lessonId: 'ch7-l1', chapterId: 'ch7', lessonTitle: 'Cloudflare Workers Explained', chapterTitle: 'Building the Brain (Backend)', chapterIcon: '🧠', chapterColor: '#f97316', relevance: 'wrangler.toml configures your Cloudflare project' },
    { lessonId: 'ch10-l1', chapterId: 'ch10', lessonTitle: 'Deploy Backend + Frontend', chapterTitle: 'Ship It — Go Live', chapterIcon: '🚀', chapterColor: '#22c55e', relevance: 'Deployment configuration lives here' },
  ],
};

export function getLessonsForFile(filePath: string): LessonSuggestion[] {
  const ext = '.' + (filePath.split('.').pop()?.toLowerCase() || '');
  return FILE_LESSONS[ext] || [];
}

export function getLessonsForProject(files: { path: string }[]): LessonSuggestion[] {
  const seen = new Set<string>();
  const suggestions: LessonSuggestion[] = [];
  for (const file of files) {
    for (const lesson of getLessonsForFile(file.path)) {
      if (!seen.has(lesson.lessonId)) {
        seen.add(lesson.lessonId);
        suggestions.push(lesson);
      }
    }
  }
  return suggestions;
}

// ─── CURRICULUM BADGES FOR FILE EXPLORER ──────────────────────

export interface CurriculumBadge {
  label: string;
  chapterId: string;
  color: string;
}

export function getBadgeForPath(path: string): CurriculumBadge | null {
  const lower = path.toLowerCase();
  const name = lower.split('/').pop() || lower;

  // Specific files first
  if (name === 'claude.md' || name === '.claude.md') return { label: 'Ch11', chapterId: 'ch11', color: '#8b5cf6' };
  if (name === 'wrangler.toml') return { label: 'Ch10', chapterId: 'ch10', color: '#22c55e' };
  if (name === 'package.json') return { label: 'Ch2', chapterId: 'ch2', color: '#f97316' };

  // Folder patterns
  if (lower.includes('component') || lower.includes('page') || lower.includes('view') || lower.includes('ui')) return { label: 'Ch8', chapterId: 'ch8', color: '#3b82f6' };
  if (lower.includes('api') || lower.includes('worker') || lower.includes('server') || lower.includes('route') || lower.includes('handler')) return { label: 'Ch7', chapterId: 'ch7', color: '#f97316' };
  if (lower.includes('db') || lower.includes('database') || lower.includes('migration') || lower.includes('schema')) return { label: 'Ch7', chapterId: 'ch7', color: '#f97316' };
  if (lower.includes('style') || lower.includes('css') || lower.includes('theme')) return { label: 'Ch8', chapterId: 'ch8', color: '#3b82f6' };
  if (lower.includes('test') || lower.includes('spec')) return { label: 'Ch9', chapterId: 'ch9', color: '#f87171' };
  if (lower.includes('config') || lower.includes('env')) return { label: 'Ch6', chapterId: 'ch6', color: '#eab308' };
  if (lower.includes('auth') || lower.includes('login') || lower.includes('session')) return { label: 'Ch7', chapterId: 'ch7', color: '#f97316' };

  return null;
}

// ─── FIGI U SUGGESTIONS ─────────────────────────────────────

export interface FigiUSuggestion {
  title: string;
  category: string;
  relevance: string;
}

export function getFigiUSuggestions(files: { path: string; content?: string }[]): FigiUSuggestion[] {
  const suggestions: FigiUSuggestion[] = [];
  const paths = files.map(f => f.path.toLowerCase()).join(' ');
  const contents = files.map(f => f.content || '').join(' ').toLowerCase();

  if (paths.includes('.jsx') || paths.includes('.tsx') || contents.includes('usestate'))
    suggestions.push({ title: 'React Patterns & Hooks Deep Dive', category: 'Frontend', relevance: 'Your project uses React — master advanced patterns' });
  if (contents.includes('fetch(') || contents.includes('api'))
    suggestions.push({ title: 'Build a REST API', category: 'Backend', relevance: 'Your app makes API calls — learn API design best practices' });
  if (contents.includes('create table') || contents.includes('d1') || paths.includes('.sql'))
    suggestions.push({ title: 'Database Design Patterns', category: 'Backend', relevance: 'Your project uses a database — learn schema design' });
  if (contents.includes('stripe') || contents.includes('payment'))
    suggestions.push({ title: 'Add Payments with Stripe', category: 'Business', relevance: 'Your app handles payments — learn Stripe integration' });
  if (contents.includes('auth') || contents.includes('login') || contents.includes('jwt'))
    suggestions.push({ title: 'User Authentication Deep Dive', category: 'Security', relevance: 'Your app has auth — learn security best practices' });
  if (contents.includes('tailwind') || paths.includes('.css'))
    suggestions.push({ title: 'CSS Animations & Advanced Styling', category: 'Frontend', relevance: "Level up your app's visual design" });
  if (contents.includes('anthropic') || contents.includes('claude') || contents.includes('openai'))
    suggestions.push({ title: 'Building AI-Powered Features', category: 'AI', relevance: 'Your app uses AI — learn advanced integration patterns' });

  return suggestions;
}
