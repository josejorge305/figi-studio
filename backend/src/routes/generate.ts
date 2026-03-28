import { json, IRequest } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

const DAILY_GENERATION_LIMIT = 50;

const SYSTEM_PROMPT = `You are Figi, an expert AI app builder for Figi Studio. You build complete full-stack web applications using React + Tailwind (frontend) and Cloudflare Workers + D1 (backend).

RESPONSE FORMAT:
Always respond with valid JSON containing a "files" array and a "message" string:

{
  "message": "Your conversational response explaining what you built/changed",
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>...",
      "language": "html"
    },
    {
      "path": "src/App.jsx",
      "content": "import React from 'react'...",
      "language": "jsx"
    }
  ]
}

FILE GENERATION RULES:
1. For a NEW app, generate ALL files needed:
   - index.html (entry point with React CDN + Tailwind CDN)
   - src/App.jsx (main React component)
   - src/components/*.jsx (UI components)
   - src/styles.css (custom styles if needed)
   - worker/index.js (Cloudflare Worker API routes — only if app needs a backend)
   - worker/schema.sql (D1 database schema — only if app needs data storage)

2. For UPDATES to an existing app, only include files that changed.
   Do NOT re-send unchanged files.

3. ALWAYS use CDN imports in index.html (no bundler needed):
   - React: <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
   - ReactDOM: <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
   - Babel: <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
   - Tailwind: <script src="https://cdn.tailwindcss.com"></script>

4. In index.html, use type="text/babel" for JSX support:
   <script type="text/babel">
     // All component code goes here
   </script>

5. Use INLINE components in the script tag (no import/export — CDN React doesn't support modules).
   Put ALL component code in a single script block or use multiple script tags.

6. Make every app:
   - Mobile-responsive (Tailwind responsive classes)
   - Dark mode by default (bg-gray-900/bg-slate-900, light text)
   - Professional looking (proper spacing, modern fonts)
   - Interactive (forms work, buttons do things, state updates)

7. When the user asks for backend features (auth, database, API):
   - Generate worker/index.js with itty-router patterns
   - Generate worker/schema.sql with CREATE TABLE statements
   - Frontend should call the API using fetch()

8. Add helpful comments explaining what each section does.

CONVERSATION RULES:
- Be conversational and encouraging in your "message" — you are Professor Figi
- Explain what you built and WHY each piece exists
- Reference Figi Code curriculum when relevant ("This is what Chapter 7 teaches — your API is the waiter carrying data to the kitchen")
- If something might break, warn the user and explain the fix
- Suggest next steps ("Want me to add user auth? Or style the dashboard?")

CRITICAL — DO NOT:
- NEVER hardcode API keys or include x-api-key headers in generated frontend code
- NEVER use localStorage, sessionStorage, or IndexedDB in generated apps — use React state (useState/useReducer) for session data instead
- NEVER make direct calls to api.anthropic.com from frontend code — all AI calls must go through the backend API
- If the user asks for persistence, use React state for session data or explain that backend storage via the API is available
- All fetch calls from generated frontends should go to the project's own backend API, never to third-party APIs with hardcoded credentials`;

/**
 * Build a combined preview HTML from all project frontend files.
 * If an index.html exists, use it as the shell.
 * Otherwise, generate a basic shell that loads React/Tailwind CDNs
 * and injects CSS + JSX from the project files.
 */
function buildPreview(files: Array<{ path: string; content: string; language?: string }>): string {
  const indexHtml = files.find(f => f.path === 'index.html');

  if (indexHtml?.content) {
    // Use the generated index.html as-is — it should already include CDN scripts
    return indexHtml.content;
  }

  // No index.html — build a shell from component files
  const cssFiles = files.filter(f => f.path.endsWith('.css') && !f.path.startsWith('worker/'));
  const jsFiles = files.filter(
    f => (f.path.endsWith('.jsx') || f.path.endsWith('.js') || f.path.endsWith('.tsx') || f.path.endsWith('.ts'))
      && !f.path.startsWith('worker/')
  );

  const css = cssFiles.map(f => f.content).join('\n');
  const js = jsFiles.map(f => f.content).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>${css}</style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div id="root"></div>
  <script type="text/babel">${js}</script>
</body>
</html>`;
}

export const generateRoutes = {
  async generate(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .bind(req.params.id, user.id).first<{ id: number; name: string; description: string; subdomain: string; preview_url: string }>();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    try {
      // --- Rate limiting: 50 generations per user per day ---
      const today = new Date().toISOString().split('T')[0];
      const usage = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM messages WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND role = 'user' AND created_at >= ?"
      ).bind(user.id, today + 'T00:00:00').first<{ count: number }>();

      if (usage && usage.count >= DAILY_GENERATION_LIMIT) {
        return json({
          success: false,
          error: `Daily generation limit reached (${DAILY_GENERATION_LIMIT}/day). Upgrade for unlimited.`,
        }, { status: 429 });
      }

      const { message } = await req.json() as { message: string };
      if (!message?.trim()) return json({ success: false, error: 'Message required' }, { status: 400 });

      // Save user message
      await env.DB.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
        .bind(project.id, 'user', message.trim()).run();

      // Get conversation history for context
      const { results: history } = await env.DB.prepare(
        'SELECT role, content FROM messages WHERE project_id = ? ORDER BY created_at ASC LIMIT 20'
      ).bind(project.id).all<{ role: string; content: string }>();

      // Get existing files for context
      const { results: existingFiles } = await env.DB.prepare(
        'SELECT path, content FROM files WHERE project_id = ? ORDER BY path ASC'
      ).bind(project.id).all<{ path: string; content: string }>();

      // Build context about existing files — include full content for small files, truncated for large ones
      const fileContext = existingFiles.length > 0
        ? `\n\nEXISTING PROJECT FILES:\n${existingFiles.map(f => {
            const content = f.content || '';
            const truncated = content.length > 1500 ? content.slice(0, 1500) + '\n... (truncated)' : content;
            return `--- ${f.path} ---\n${truncated}`;
          }).join('\n\n')}`
        : '';

      // Build messages for Claude
      const claudeMessages = [
        ...history.slice(0, -1).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        {
          role: 'user' as const,
          content: `Project: "${project.name}" — ${project.description || 'No description'}${fileContext}\n\nUser request: ${message.trim()}`
        }
      ];

      // Call Claude
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
          messages: claudeMessages,
        }),
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.text();
        throw new Error(`Claude API error: ${err}`);
      }

      const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> };
      const rawText = claudeData.content[0]?.text || '';

      // Parse JSON response from Claude
      let parsed: { message: string; files: Array<{ path: string; content: string; language: string }> };
      try {
        // Try to extract JSON from the response (Claude may wrap it in markdown code fences)
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || rawText;
        parsed = JSON.parse(jsonStr);
      } catch {
        // Fallback if Claude doesn't return valid JSON
        parsed = {
          message: rawText.slice(0, 500),
          files: [],
        };
      }

      // Upsert each generated file to D1
      for (const file of parsed.files || []) {
        await env.DB.prepare(`
          INSERT INTO files (project_id, path, content, language, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(project_id, path) DO UPDATE SET content = excluded.content, language = excluded.language, updated_at = excluded.updated_at
        `).bind(project.id, file.path, file.content, file.language || 'text').run();
      }

      // Update project status
      await env.DB.prepare(
        "UPDATE projects SET status = 'active', updated_at = datetime('now') WHERE id = ?"
      ).bind(project.id).run();

      // Save assistant message
      await env.DB.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
        .bind(project.id, 'assistant', parsed.message).run();

      // Build combined preview from ALL project files (not just the ones from this generation)
      const { results: allProjectFiles } = await env.DB.prepare(
        'SELECT path, content, language FROM files WHERE project_id = ? ORDER BY path ASC'
      ).bind(project.id).all<{ path: string; content: string; language: string }>();

      const previewHtml = buildPreview(allProjectFiles);

      return json({
        success: true,
        data: {
          message: parsed.message,
          files: (parsed.files || []).map(f => ({ path: f.path, language: f.language || 'text' })),
          preview_html: previewHtml,
        }
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Generation failed';
      await env.DB.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
        .bind(project.id, 'assistant', `Sorry, something went wrong: ${errMsg}`).run();
      return json({ success: false, error: errMsg }, { status: 500 });
    }
  },
};
