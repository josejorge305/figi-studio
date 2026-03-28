import { useRef, useEffect, useState, useMemo } from 'react';

export type ChatMode = 'build' | 'learn' | 'debug';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  changedFiles?: string[];
  isStreaming?: boolean;
  mode?: ChatMode;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  generating: boolean;
  currentMode: ChatMode;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
  onModeChange: (mode: ChatMode) => void;
}

const FILE_ICONS: Record<string, string> = {
  html: '🌐', jsx: '⚛️', tsx: '⚛️', js: '⚡', ts: '⚡',
  css: '🎨', sql: '🗃️', json: '📦', toml: '⚙️', md: '📝',
};

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
}

const MODE_CONFIG = {
  build: { icon: '🔧', label: 'Build', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  learn: { icon: '🎓', label: 'Learn', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
  debug: { icon: '🐛', label: 'Debug', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
};

export function detectModeClient(message: string, hasError: boolean, hasSelectedCode: boolean): ChatMode {
  if (hasError) return 'debug';
  if (hasSelectedCode) return 'learn';

  const lower = message.toLowerCase();
  if (lower.includes('explain') || lower.includes('what does') || lower.includes('what is') ||
      lower.includes('how does') || lower.includes('teach') || lower.includes('why does') ||
      lower.includes('help me understand') || lower.includes('what are')) return 'learn';
  if (lower.includes('fix') || lower.includes('debug') || lower.includes('broken') ||
      lower.includes('not working') || lower.includes('what went wrong')) return 'debug';
  return 'build';
}

function getMessageBorderColor(msg: Message): string {
  if (msg.role === 'user') return 'rgba(249,115,22,0.2)';
  const mode = msg.mode || 'build';
  return MODE_CONFIG[mode].border;
}

function getMessageLeftBorder(msg: Message): string {
  if (msg.role === 'user') return 'none';
  const mode = msg.mode || 'build';
  return `3px solid ${MODE_CONFIG[mode].color}`;
}

function getStreamingLabel(mode: ChatMode): string {
  switch (mode) {
    case 'learn': return 'Teaching...';
    case 'debug': return 'Debugging...';
    default: return 'Building...';
  }
}

export default function ChatPanel({ messages, input, generating, currentMode, onInputChange, onSend, onSuggestionClick, onModeChange }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-detect mode as user types
  const detectedMode = useMemo(() => {
    if (!input.trim()) return currentMode;
    return detectModeClient(input, false, false);
  }, [input, currentMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border-color)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !generating && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Professor Figi is ready</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Describe what you want to build, ask a question, or paste an error.
            </p>
            <div className="mt-6 space-y-2 w-full max-w-xs">
              {[
                { text: 'Build a landing page for a SaaS product', mode: 'build' as ChatMode },
                { text: 'What is useState and how does it work?', mode: 'learn' as ChatMode },
                { text: 'Create a todo app with add, complete, and delete', mode: 'build' as ChatMode },
              ].map(suggestion => (
                <button key={suggestion.text} onClick={() => { onSuggestionClick(suggestion.text); inputRef.current?.focus(); }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  <span className="text-xs">{MODE_CONFIG[suggestion.mode].icon}</span>
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="text-xl shrink-0 mt-1">
                {msg.mode === 'learn' ? '🎓' : msg.mode === 'debug' ? '🐛' : '🤖'}
              </div>
            )}
            <div className="max-w-[85%]">
              {/* Mode badge for assistant messages */}
              {msg.role === 'assistant' && msg.mode && (
                <div className="mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: MODE_CONFIG[msg.mode].bg, color: MODE_CONFIG[msg.mode].color, border: `1px solid ${MODE_CONFIG[msg.mode].border}` }}>
                    {MODE_CONFIG[msg.mode].icon} {MODE_CONFIG[msg.mode].label} Mode
                  </span>
                </div>
              )}
              <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === 'user' ? 'rgba(249,115,22,0.1)' : 'rgba(51,65,85,0.3)',
                  border: `1px solid ${getMessageBorderColor(msg)}`,
                  borderLeft: getMessageLeftBorder(msg),
                  color: 'var(--text-primary)',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}>
                <span>{msg.content}</span>
                {msg.isStreaming && <span className="streaming-cursor" />}
              </div>
              {msg.changedFiles && msg.changedFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.changedFiles.map(path => (
                    <span key={path} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono"
                      style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.15)', color: 'rgba(249,115,22,0.8)' }}>
                      {getFileIcon(path)} {path}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {generating && !messages.some(m => m.isStreaming) && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="text-xl">{currentMode === 'learn' ? '🎓' : currentMode === 'debug' ? '🐛' : '🤖'}</div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(51,65,85,0.3)', border: `1px solid ${MODE_CONFIG[currentMode].border}`, borderLeft: `3px solid ${MODE_CONFIG[currentMode].color}` }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODE_CONFIG[currentMode].color, animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{getStreamingLabel(currentMode)}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mode indicator + Input */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        {/* Mode selector */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Mode:</span>
          {(['build', 'learn', 'debug'] as ChatMode[]).map(mode => {
            const config = MODE_CONFIG[mode];
            const isActive = (input.trim() ? detectedMode : currentMode) === mode;
            return (
              <button key={mode} onClick={() => onModeChange(mode)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                style={{
                  background: isActive ? config.bg : 'transparent',
                  color: isActive ? config.color : 'var(--text-muted)',
                  border: `1px solid ${isActive ? config.border : 'var(--border-color)'}`,
                }}>
                {config.icon} {config.label}
              </button>
            );
          })}
          {input.trim() && detectedMode !== currentMode && (
            <span className="text-[9px] ml-1" style={{ color: 'var(--text-muted)' }}>
              Auto-detected: {MODE_CONFIG[detectedMode].icon} {MODE_CONFIG[detectedMode].label}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-end rounded-xl p-2"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <textarea ref={inputRef} value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Describe what to build, ask a question, or paste an error..."
            rows={2} disabled={generating}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ minHeight: 44, maxHeight: 120, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }} />
          <button onClick={onSend} disabled={!input.trim() || generating}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-lg"
            style={{
              background: input.trim() && !generating ? MODE_CONFIG[detectedMode].color : 'rgba(255,255,255,0.05)',
              color: 'white',
              cursor: input.trim() && !generating ? 'pointer' : 'not-allowed',
            }}>
            ↑
          </button>
        </div>
        <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
