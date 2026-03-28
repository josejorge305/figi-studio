import { useRef, useEffect } from 'react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  changedFiles?: string[];
  isStreaming?: boolean;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  generating: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestionClick: (text: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  html: '🌐', jsx: '⚛️', tsx: '⚛️', js: '⚡', ts: '⚡',
  css: '🎨', sql: '🗃️', json: '📦', toml: '⚙️', md: '📝',
};

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
}

export default function ChatPanel({ messages, input, generating, onInputChange, onSend, onSuggestionClick }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
              Describe what you want to build. I'll generate the code and show it live.
            </p>
            <div className="mt-6 space-y-2 w-full max-w-xs">
              {['Build a landing page for a SaaS product', 'Create a todo app with add, complete, and delete', 'Make a weather dashboard UI'].map(suggestion => (
                <button key={suggestion} onClick={() => { onSuggestionClick(suggestion); inputRef.current?.focus(); }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && <div className="text-xl shrink-0 mt-1">🤖</div>}
            <div className="max-w-[85%]">
              <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === 'user' ? 'rgba(249,115,22,0.1)' : 'rgba(51,65,85,0.3)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(249,115,22,0.2)' : 'var(--border-color)'}`,
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
            <div className="text-xl">🤖</div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(51,65,85,0.3)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-orange)', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Building...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex gap-2 items-end rounded-xl p-2"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <textarea ref={inputRef} value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Describe what to build or change..."
            rows={2} disabled={generating}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ minHeight: 44, maxHeight: 120, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }} />
          <button onClick={onSend} disabled={!input.trim() || generating}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-lg"
            style={{
              background: input.trim() && !generating ? 'var(--accent-orange)' : 'rgba(255,255,255,0.05)',
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
