import { json } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

const SYSTEM_PROMPT = `You are Professor Figi, an expert full-stack developer and teacher inside Figi Studio — an AI-powered app builder.

When a user describes what they want to build or change, you:
1. Generate complete, working code files
2. Briefly explain what you built and why (1-2 sentences max per file)
3. Always use the Figi Code stack: Cloudflare Workers (TypeScript) + D1 (SQLite) + React 18 + Tailwind CSS

RESPONSE FORMAT — always respond with valid JSON matching this exact structure:
{
  "message": "Brief explanation of what you built (2-3 sentences, encouraging, in Professor Figi's voice)",
  "files": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "complete file content here",
      "language": "typescript"
    }
  ],
  "preview_ready": true
}

RULES:
- Always generate COMPLETE files, never partial snippets
- Use Tailwind CSS for all styling — dark theme (#0b1120 background, #FF8C42 orange accents)
- React components use hooks, no class components
- Backend uses TypeScript strict mode
- All API responses: { success: boolean, data?: any, error?: string }
- Include proper error handling and loading states
- For new apps, always generate at minimum: index.html (or App.tsx), a main component, and basic styling
- Keep explanations warm and encouraging like a teacher, not robotic
- For simple frontend apps, just generate HTML/CSS/JS in a single index.html
- For full-stack apps, generate separate frontend and backend files`;

export const generateRoutes = {
  async generate(req: Request & { params: { id: string } }, env: Env): Promise<Response> {
    const user = await getUser(req, env);
    if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .bind(req.params.id, user.id).first<{ id: number; name: string; description: string; subdomain: string; preview_url: string }>();
    if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });

    try {
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

      // Build context about existing files
      const fileContext = existingFiles.length > 0
        ? `\n\nEXISTING PROJECT FILES:\n${existingFiles.map(f => `--- ${f.path} ---\n${f.content?.slice(0, 500)}${(f.content?.length || 0) > 500 ? '...' : ''}`).join('\n\n')}`
        : '';

      // Build messages for Claude
      const messages = [
        ...history.slice(0, -1).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        {
          role: 'user' as const,
          content: `Project: "${project.name}" — ${project.description}${fileContext}\n\nUser request: ${message.trim()}`
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
          model: 'claude-sonnet-4-5',
          max_tokens: 8096,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.text();
        throw new Error(`Claude API error: ${err}`);
      }

      const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> };
      const rawText = claudeData.content[0]?.text || '';

      // Parse JSON response from Claude
      let parsed: { message: string; files: Array<{ path: string; content: string; language: string }>; preview_ready: boolean };
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] || rawText);
      } catch {
        // Fallback if Claude doesn't return valid JSON
        parsed = {
          message: rawText.slice(0, 500),
          files: [],
          preview_ready: false,
        };
      }

      // Save files to DB
      for (const file of parsed.files || []) {
        await env.DB.prepare(`
          INSERT INTO files (project_id, path, content, language, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(project_id, path) DO UPDATE SET content = excluded.content, language = excluded.language, updated_at = excluded.updated_at
        `).bind(project.id, file.path, file.content, file.language || 'text').run();
      }

      // Update project status and preview URL
      const previewUrl = `https://${project.subdomain}.figistudio.dev`;
      await env.DB.prepare(
        "UPDATE projects SET status = 'active', preview_url = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(previewUrl, project.id).run();

      // Save assistant message
      await env.DB.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
        .bind(project.id, 'assistant', parsed.message).run();

      return json({
        success: true,
        data: {
          message: parsed.message,
          files: parsed.files || [],
          preview_url: previewUrl,
          preview_ready: parsed.preview_ready || false,
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
