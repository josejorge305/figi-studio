import { useState, useEffect } from 'react';
import { matchErrorToLesson, lessonUrl } from '../../data/curriculumMap';
import type { ErrorMapping } from '../../data/curriculumMap';

interface ErrorBridgeProps {
  errorMessage: string | null;
  onFixIt: (errorMessage: string) => void;
  onDismiss: () => void;
}

export default function ErrorBridge({ errorMessage, onFixIt, onDismiss }: ErrorBridgeProps) {
  const [mapping, setMapping] = useState<ErrorMapping | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!errorMessage) {
      setVisible(false);
      return;
    }
    const match = matchErrorToLesson(errorMessage);
    setMapping(match);
    setVisible(true);

    // Auto-dismiss after 30s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 30000);
    return () => clearTimeout(timer);
  }, [errorMessage, onDismiss]);

  if (!errorMessage || !visible) return null;

  return (
    <div
      className="fixed z-40 animate-fade-in"
      style={{
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 560,
        width: 'calc(100% - 32px)',
        background: '#1a1d27',
        borderLeft: '4px solid #ef4444',
        border: '1px solid #2a2d37',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        padding: '12px 16px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Error message */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-[12px] shrink-0">❌</span>
        <p className="text-[12px] flex-1" style={{ color: '#ef4444', wordBreak: 'break-word' }}>
          {errorMessage.length > 120 ? errorMessage.slice(0, 120) + '...' : errorMessage}
        </p>
        <button onClick={() => { setVisible(false); onDismiss(); }}
          className="text-[14px] shrink-0 leading-none"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
          ✕
        </button>
      </div>

      {/* Lesson match */}
      {mapping && (
        <div className="mb-3 pl-5">
          <p className="text-[11px]" style={{ color: mapping.chapterId.startsWith('ch8') ? '#3b82f6' : mapping.chapterId.startsWith('ch7') ? '#f97316' : '#f87171' }}>
            🎓 {mapping.chapterId.toUpperCase()}: {mapping.lessonTitle}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {mapping.description}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pl-5">
        <button
          onClick={() => { onFixIt(errorMessage); setVisible(false); onDismiss(); }}
          className="text-[11px] px-3 py-1 rounded transition-colors"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}>
          🔧 Ask Figi to Fix
        </button>
        {mapping && (
          <a
            href={lessonUrl(mapping.lessonId, mapping.chapterId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-3 py-1 rounded transition-colors"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.25)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.15)'}>
            📚 Learn About It
          </a>
        )}
      </div>
    </div>
  );
}
