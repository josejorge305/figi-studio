import { IRequest } from 'itty-router';
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

MULTI-PAGE APPS:
When building apps with navigation or multiple pages (like a landing page with Features, Pricing, About links):
- Generate a SEPARATE HTML file for EACH page: index.html, features.html, pricing.html, about.html, etc.
- Every page must be a complete, standalone HTML file (not a fragment)
- Navigation links between pages should use relative href (e.g., href="features.html")
- Every page should share the same header/nav and footer for consistency
- Every page should include the same CSS file(s)
- Populate every page with realistic placeholder content relevant to the topic — NOT "Coming soon" or "Lorem ipsum"
- If you generate 5+ files, briefly list what each file does in your response message

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

function parseGeneratedResponse(rawText: string): { message: string; files: Array<{ path: string; content: string; language: string }> } {
  try {
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || rawText;
    return JSON.parse(jsonStr);
  } catch {
    return { message: rawText.slice(0, 500), files: [] };
  }
}

export const generateRoutes = {
  async generate(req: IRequest, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .bind(req.params.id, user.id).first<{ id: number; name: string; description: string }>();
    if (!project) return new Response(JSON.stringify({ success: false, error: 'Project not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    try {
      const today = new Date().toISOString().split('T')[0];
      const usage = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM messages WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND role = 'user' AND created_at >= ?"
      ).bind(user.id, today + 'T00:00:00').first<{ count: number }>();

      if (usage && usage.count >= DAILY_GENERATION_LIMIT) {
        return new Response(JSON.stringify({ success: false, error: `Daily limit reached (${DAILY_GENERATION_LIMIT}/day).` }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      }

      const { message } = await req.json() as { message: string };
      if (!message?.trim()) return new Response(JSON.stringify({ success: false, error: 'Message required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

      const { results: history } = await env.DB.prepare(
        'SELECT role, content FROM messages WHERE project_id = ? ORDER BY created_at ASC LIMIT 20'
      ).bind(project.id).all<{ role: string; content: string }>();

      const { results: existingFiles } = await env.DB.prepare(
        'SELECT path, content FROM files WHERE project_id = ? ORDER BY path ASC'
      ).bind(project.id).all<{ path: string; content: string }>();

      const fileContext = existingFiles.length > 0
        ? `\n\nEXISTING PROJECT FILES:\n${existingFiles.map(f => {
            const content = f.content || '';
            const truncated = content.length > 1500 ? content.slice(0, 1500) + '\n... (truncated)' : content;
            return `--- ${f.path} ---\n${truncated}`;
          }).join('\n\n')}`
        : '';

      const claudeMessages = [
        ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        {
          role: 'user' as const,
          content: `Project: "${project.name}" — ${project.description || 'No description'}${fileContext}\n\nUser request: ${message.trim()}`
        }
      ];

      // Call Claude with streaming
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
          stream: true,
        }),
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.text();
        throw new Error(`Claude API error: ${err}`);
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      async function sendSSE(event: string, data: unknown) {
        await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      const projectId = project.id;
      const userMessage = message.trim();
      const db = env.DB;

      const processStream = async () => {
        let fullText = '';
        const reader = claudeRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          await sendSSE('start', { timestamp: Date.now() });

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullText += parsed.delta.text;
                  await sendSSE('delta', { text: parsed.delta.text });
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          // Stream complete — parse files
          const result = parseGeneratedResponse(fullText);

          // Save user message
          await db.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
            .bind(projectId, 'user', userMessage).run();

          // Save assistant message
          await db.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
            .bind(projectId, 'assistant', result.message).run();

          // Upsert files
          for (const file of result.files || []) {
            await db.prepare(`
              INSERT INTO files (project_id, path, content, language, updated_at)
              VALUES (?, ?, ?, ?, datetime('now'))
              ON CONFLICT(project_id, path) DO UPDATE SET content = excluded.content, language = excluded.language, updated_at = excluded.updated_at
            `).bind(projectId, file.path, file.content, file.language || 'text').run();
          }

          // Update project status
          await db.prepare("UPDATE projects SET status = 'active', updated_at = datetime('now') WHERE id = ?")
            .bind(projectId).run();

          // Fetch all files for preview
          const allFiles = await db.prepare(
            'SELECT id, path, content, language FROM files WHERE project_id = ?'
          ).bind(projectId).all();

          await sendSSE('complete', {
            message: result.message,
            files: allFiles.results,
            generatedFiles: (result.files || []).map(f => f.path),
          });

        } catch (err) {
          await sendSSE('error', { message: (err as Error).message });
        } finally {
          await writer.close();
        }
      };

      processStream();

      const origin = req.headers.get('Origin') || '*';
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Generation failed';
      return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  },
};
