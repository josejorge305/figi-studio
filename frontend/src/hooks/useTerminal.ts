import { useState, useCallback, useRef } from 'react';

export interface TerminalLine {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'system' | 'command' | 'ai';
  message: string;
  detail?: string;
}

export function useTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      timestamp: new Date(),
      type: 'system',
      message: 'Figi Studio v1.0 — Ready',
    },
    {
      id: 'init-2',
      timestamp: new Date(),
      type: 'info',
      message: 'Type a prompt or select a template to start building.',
    },
  ]);

  const idCounter = useRef(0);

  const log = useCallback((type: TerminalLine['type'], message: string, detail?: string) => {
    idCounter.current++;
    setLines(prev => [...prev, {
      id: `log-${idCounter.current}-${Date.now()}`,
      timestamp: new Date(),
      type,
      message,
      detail,
    }]);
  }, []);

  const clear = useCallback(() => {
    setLines([{
      id: `clear-${Date.now()}`,
      timestamp: new Date(),
      type: 'system',
      message: 'Terminal cleared.',
    }]);
  }, []);

  return { lines, log, clear };
}
