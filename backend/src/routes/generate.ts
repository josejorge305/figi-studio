import { IRequest } from 'itty-router';
import { Env } from '../index';
import { getUser } from './auth';

const DAILY_GENERATION_LIMIT = 50;

type ChatMode = 'build' | 'learn' | 'debug';

interface ChatContext {
  activeFile?: string;
  activeFileContent?: string;
  errorMessage?: string;
  selectedCode?: string;
}

function detectChatMode(message: string, context: ChatContext): ChatMode {
  const lower = message.toLowerCase();

  // DEBUG indicators
  if (context.errorMessage) return 'debug';
  if (lower.includes('fix') && (lower.includes('error') || lower.includes('bug') || lower.includes('broken'))) return 'debug';
  if (lower.includes('why is') && (lower.includes('not working') || lower.includes('crashing') || lower.includes('failing'))) return 'debug';
  if (lower.includes('debug') || lower.includes('what went wrong')) return 'debug';

  // LEARN indicators
  if (context.selectedCode) return 'learn';
  if (lower.includes('explain') || lower.includes('what does') || lower.includes('what is')) return 'learn';
  if (lower.includes('how does') || lower.includes('how do') || lower.includes('why does')) return 'learn';
  if (lower.includes('teach me') || lower.includes('help me understand') || lower.includes('what are')) return 'learn';
  if (lower.startsWith('what') || lower.startsWith('why') || lower.startsWith('how')) {
    if (!lower.includes('build') && !lower.includes('create') && !lower.includes('add') && !lower.includes('make')) {
      return 'learn';
    }
  }

  // BUILD (default)
  return 'build';
}

const BUILD_SYSTEM_PROMPT = `You are Figi, an expert AI app builder for Figi Studio. You build complete full-stack web applications using React + Tailwind (frontend) and Cloudflare Workers + D1 (backend).

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
- ALWAYS explain what you built AND WHY each piece exists — 3-4 sentences minimum in every response
- Structure your message as: (1) what you built, (2) the key concept behind it, (3) how the pieces connect, (4) a suggested next step
- Connect to Figi Code curriculum naturally: "This is exactly Chapter 7's brain-and-waiter pattern — your Worker is the brain, the routes are waiters"
- CHAPTER REFERENCES (use naturally when relevant):
  - React/components/JSX → Ch8: Building the Screen
  - API/Workers/backend → Ch7: Building the Brain
  - Database/SQL/D1 → Ch7: Building the Brain
  - Git/GitHub → Ch3: Git — Your Code's Save System
  - Terminal/CLI → Ch2: Your Computer is a Dev Machine
  - Claude Code/AI prompting → Ch4 & Ch5
  - TypeScript → Ch6: Guardrails — Why Rules Matter
  - Debugging → Ch9: Reading Errors Without Panicking
  - Deployment → Ch10: Ship It — Go Live
- ALWAYS end with a next-step suggestion: "Want me to add [X]? Or shall we [Y]?"
- If something might break, warn the user proactively and explain why
- Celebrate progress: "You just built your first API endpoint — this is the same pattern Discord uses"
- Add helpful comments in generated code explaining what each section does

CRITICAL — DO NOT:
- NEVER hardcode API keys or include x-api-key headers in generated frontend code
- NEVER use localStorage, sessionStorage, or IndexedDB in generated apps — use React state (useState/useReducer) for session data instead
- NEVER make direct calls to api.anthropic.com from frontend code — all AI calls must go through the backend API
- If the user asks for persistence, use React state for session data or explain that backend storage via the API is available
- All fetch calls from generated frontends should go to the project's own backend API, never to third-party APIs with hardcoded credentials`;

function buildLearnSystemPrompt(context: ChatContext): string {
  let prompt = `You are Professor Figi — the AI coding tutor inside Figi Studio. You teach coding concepts by explaining the student's ACTUAL code, not abstract examples.

PERSONALITY:
- Warm, encouraging, slightly playful — like a cool older sibling who's a senior developer
- Use analogies from everyday life to explain technical concepts
- Never condescending — every question is a good question
- Celebrate understanding: "Exactly! You got it."
- Use the student's own code as examples whenever possible

TEACHING STYLE:
- Start with the "what" (one sentence explaining the concept)
- Then the "why" (why this matters / what problem it solves)
- Then the "how" (using their actual code as the example)
- End with a connection to the bigger picture ("This is how every React app manages data")

RULES:
- NEVER generate or modify files in learn mode — only explain
- If the student asks you to build/create/add something, tell them: "Switch to Build mode and I'll create that for you! Just type your request normally."
- Reference specific lines from their code when explaining
- When relevant, mention which Figi Code chapter covers this topic in depth (use the chapter mapping provided)
- Keep explanations concise — 2-3 paragraphs max unless the student asks for more detail
- Use code snippets to illustrate points, but don't generate full files
- If explaining an error, always end with the fix and WHY the fix works
- SOCRATIC ELEMENT: After explaining, ask ONE follow-up question to check understanding: "Does that make sense? What do you think would happen if you changed X to Y?" This builds real understanding, not just passive reading.
- CELEBRATE good questions and observations: "Great question — you just spotted something a senior dev would notice" or "Exactly right! You've got it."
- End with an actionable suggestion: "Try changing X and see what happens" or "Switch to Build mode and I'll add this for you"
- Do NOT wrap your response in JSON. Just respond with plain text/markdown.

CHAPTER REFERENCES (use naturally, don't force):
- React/JSX/Components → Ch8: Building the Screen
- API/Backend/Workers → Ch7: Building the Brain
- Database/SQL/D1 → Ch7: Building the Brain
- Git/GitHub → Ch3: Git — Your Code's Save System
- Terminal/CLI → Ch2: Your Computer is a Dev Machine
- Claude Code/AI → Ch4: Claude Code — Your AI Co-Pilot
- Prompting → Ch5: The Art of the Prompt
- TypeScript → Ch6: Guardrails — Why Rules Matter
- Errors/Debugging → Ch9: Reading Errors Without Panicking
- Deployment → Ch10: Ship It — Go Live
- AI APIs/Claude API → Ch11: Add AI to Your Apps
- Advanced Tools → Ch12: Level Up — Advanced Tools

CONTEXT: You have access to the student's project files. When they ask about something, reference their actual code.`;

  if (context.activeFile) {
    prompt += `\nThe student is currently viewing: ${context.activeFile}`;
  }
  if (context.activeFileContent) {
    prompt += `\nFile content:\n\`\`\`\n${context.activeFileContent}\n\`\`\``;
  }
  if (context.selectedCode) {
    prompt += `\nThe student selected this code and asked about it:\n\`\`\`\n${context.selectedCode}\n\`\`\``;
  }

  return prompt;
}

function buildDebugSystemPrompt(context: ChatContext): string {
  let prompt = `You are Professor Figi in debug mode inside Figi Studio. A student hit an error and needs help.

APPROACH:
1. First, explain the error in plain English (one sentence — what happened)
2. Show exactly WHERE in their code the problem is (reference the line/file)
3. Explain WHY it happened (the underlying concept)
4. Provide the FIX — generate the corrected file(s) using the standard JSON file format so the code updates in their project
5. Explain what the fix does and why it works (one sentence)
6. Mention the relevant Figi Code chapter if applicable

PERSONALITY: Calm and reassuring. Errors are learning opportunities, not failures.
"This is one of the most common React errors — you'll see it a hundred times and eventually fix it in your sleep."

RULES:
- In debug mode, you CAN generate/modify files (to apply the fix)
- Always respond with valid JSON containing a "files" array and a "message" string (same format as build mode)
- The "message" should contain your explanation of the error and fix
- The "files" array should contain the corrected file(s)
- Keep the explanation brief — fix first, explain after
- If the error is in AI-generated code, own it: "Looks like I made a mistake in the code I generated. Let me fix that."
- TEACH THE PATTERN: After fixing, add one sentence about when students will see this error again: "Bookmark this — TypeError: Cannot read properties of undefined almost always means something that should exist doesn't yet. You'll see it hundreds of times."
- CELEBRATE when students spot bugs themselves: "Good catch! You found a bug before it caused problems — that's exactly the developer instinct you're building."
- Connect to Figi Code chapters when relevant (Ch9 for debugging patterns)

RESPONSE FORMAT (same as build mode):
{
  "message": "Your explanation of the error and fix",
  "files": [
    { "path": "filename", "content": "corrected content", "language": "lang" }
  ]
}

ERROR CONTEXT:`;

  if (context.errorMessage) {
    prompt += `\nError: ${context.errorMessage}`;
  } else {
    prompt += `\nNo specific error provided — student is asking for debugging help.`;
  }
  if (context.activeFile) {
    prompt += `\nFile with error: ${context.activeFile}`;
  }
  if (context.activeFileContent) {
    prompt += `\nFile content:\n\`\`\`\n${context.activeFileContent}\n\`\`\``;
  }

  return prompt;
}

function parseGeneratedResponse(rawText: string): { message: string; files: Array<{ path: string; content: string; language: string }> } {
  try {
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || rawText;
    return JSON.parse(jsonStr);
  } catch {
    return { message: rawText.slice(0, 5000), files: [] };
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

      const body = await req.json() as { message: string; mode?: 'auto' | 'build' | 'learn' | 'debug'; context?: ChatContext };
      const { message, mode = 'auto', context = {} } = body;
      if (!message?.trim()) return new Response(JSON.stringify({ success: false, error: 'Message required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

      // Detect mode
      const resolvedMode: ChatMode = mode === 'auto' ? detectChatMode(message, context) : mode as ChatMode;

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

      // Select system prompt based on mode
      let systemPrompt: string;
      switch (resolvedMode) {
        case 'learn':
          systemPrompt = buildLearnSystemPrompt(context);
          break;
        case 'debug':
          systemPrompt = buildDebugSystemPrompt(context);
          break;
        default:
          systemPrompt = BUILD_SYSTEM_PROMPT;
          break;
      }

      // Append file context to all modes
      systemPrompt += fileContext;

      const claudeMessages = [
        ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        {
          role: 'user' as const,
          content: `Project: "${project.name}" — ${project.description || 'No description'}\n\nUser request: ${message.trim()}`
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
          system: systemPrompt,
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
      const currentMode = resolvedMode;

      const processStream = async () => {
        let fullText = '';
        const reader = claudeRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          await sendSSE('start', { timestamp: Date.now(), mode: currentMode });

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

          // Stream complete — handle based on mode
          let resultMessage: string;
          let resultFiles: Array<{ path: string; content: string; language: string }> = [];

          if (currentMode === 'learn') {
            // Learn mode: no file parsing, plain text response
            resultMessage = fullText;
          } else {
            // Build and debug modes: parse JSON response with files
            const result = parseGeneratedResponse(fullText);
            resultMessage = result.message;
            resultFiles = result.files || [];
          }

          // Save user message
          await db.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
            .bind(projectId, 'user', userMessage).run();

          // Save assistant message
          await db.prepare('INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)')
            .bind(projectId, 'assistant', resultMessage).run();

          // Upsert files (only for build and debug modes)
          for (const file of resultFiles) {
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
            message: resultMessage,
            mode: currentMode,
            files: currentMode === 'learn' ? undefined : allFiles.results,
            generatedFiles: currentMode === 'learn' ? [] : resultFiles.map(f => f.path),
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
