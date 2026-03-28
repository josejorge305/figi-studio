import { useEffect, useRef } from 'react';
import type { TerminalLine } from '../../hooks/useTerminal';

interface TerminalPanelProps {
  lines: TerminalLine[];
  onClear: () => void;
}

function getLineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'success': return '#22c55e';
    case 'error': return '#ef4444';
    case 'warning': return '#eab308';
    case 'command': return '#f97316';
    case 'ai': return '#a855f7';
    case 'system': return '#06b6d4';
    case 'info':
    default: return '#9ca3af';
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TerminalPanel({ lines, onClear }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div style={{
      height: '100%',
      background: '#0a0a0a',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      overflow: 'auto',
      padding: '8px 12px',
      position: 'relative',
    }}>
      {/* Clear button */}
      <button
        onClick={onClear}
        style={{
          position: 'sticky',
          top: 0,
          float: 'right',
          background: 'transparent',
          border: '1px solid #2a2d37',
          borderRadius: '4px',
          color: '#6b7280',
          fontSize: '10px',
          padding: '2px 8px',
          cursor: 'pointer',
          zIndex: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#252830'; e.currentTarget.style.color = '#9ca3af'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
        title="Clear terminal"
      >
        Clear
      </button>

      {/* Terminal lines */}
      {lines.map(line => (
        <div key={line.id} style={{ marginBottom: '2px', lineHeight: '1.6' }}>
          <span style={{ color: '#4a4d57' }}>[{formatTime(line.timestamp)}]</span>
          {' '}
          <span style={{ color: getLineColor(line.type) }}>{line.message}</span>
          {line.detail && (
            <div style={{ color: '#6b7280', paddingLeft: '20px', fontSize: '11px' }}>
              {line.detail}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />

      {/* Fake prompt line */}
      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#22c55e' }}>$</span>
        <span style={{ color: '#4a4d57', fontStyle: 'italic', fontSize: '11px' }}>
          Actions are logged automatically
        </span>
        <span className="terminal-cursor" style={{
          display: 'inline-block',
          width: '7px',
          height: '14px',
          background: '#22c55e',
          animation: 'blink 1s step-end infinite',
        }} />
      </div>
    </div>
  );
}
