interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface LearnPanelProps {
  files: FileData[];
}

interface Lesson {
  chapter: string;
  title: string;
  icon: string;
  link: string;
}

export default function LearnPanel({ files }: LearnPanelProps) {
  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-3xl mb-3">🎓</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Start building to see relevant lessons here</p>
      </div>
    );
  }

  const lessons: Lesson[] = [];
  const hasHtml = files.some(f => f.path.endsWith('.html'));
  const hasCss = files.some(f => f.path.endsWith('.css'));
  const hasJs = files.some(f => /\.(js|jsx|ts|tsx)$/.test(f.path));
  const hasApi = files.some(f => f.path.includes('api') || f.path.includes('worker'));
  const hasSql = files.some(f => f.path.endsWith('.sql'));

  if (hasHtml) lessons.push({ chapter: 'Ch8', title: 'Building the Screen — Learn about HTML structure', icon: '🌐', link: 'https://figicode.com/learn/ch8/l1' });
  if (hasCss) lessons.push({ chapter: 'Ch8-L4', title: 'Styling with Tailwind CSS', icon: '🎨', link: 'https://figicode.com/learn/ch8/l4' });
  if (hasJs) lessons.push({ chapter: 'Ch9', title: 'React Fundamentals', icon: '⚛️', link: 'https://figicode.com/learn/ch9/l1' });
  if (hasApi) lessons.push({ chapter: 'Ch7', title: 'Building the Brain — Backend with Workers', icon: '⚡', link: 'https://figicode.com/learn/ch7/l1' });
  if (hasSql) lessons.push({ chapter: 'Ch7-L5', title: 'Database with D1', icon: '🗃️', link: 'https://figicode.com/learn/ch7/l5' });

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <span className="text-sm">🎓</span>
        <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Related Lessons</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {lessons.map(lesson => (
          <a key={lesson.chapter} href={lesson.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
            <span className="text-lg">{lesson.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-medium" style={{ color: 'var(--accent-purple)' }}>{lesson.chapter}</span>
              <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{lesson.title}</p>
            </div>
            <span className="text-[11px] shrink-0" style={{ color: 'var(--accent-orange)' }}>Open in Figi Code →</span>
          </a>
        ))}
      </div>
      <div className="text-center py-2 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        <a href="https://figicode.com" target="_blank" rel="noopener noreferrer"
          className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Powered by Figi Code Academy
        </a>
      </div>
    </div>
  );
}
