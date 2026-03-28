interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface AnatomyPanelProps {
  files: FileData[];
}

export default function AnatomyPanel({ files }: AnatomyPanelProps) {
  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-3xl mb-3">🏗️</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Build your app to see its architecture here</p>
      </div>
    );
  }

  const frontendFiles = files.filter(f => /\.(html|jsx|tsx)$/.test(f.path));
  const backendFiles = files.filter(f => /\.(ts|js)$/.test(f.path) && (f.path.includes('api') || f.path.includes('worker')));
  const dbFiles = files.filter(f => /\.sql$/.test(f.path));
  const styleFiles = files.filter(f => /\.css$/.test(f.path));
  const otherFiles = files.filter(f => !frontendFiles.includes(f) && !backendFiles.includes(f) && !dbFiles.includes(f) && !styleFiles.includes(f));

  const boxes: { label: string; count: number; color: string; icon: string }[] = [];
  if (frontendFiles.length > 0) boxes.push({ label: 'Frontend', count: frontendFiles.length, color: 'var(--accent-green)', icon: '🌐' });
  if (styleFiles.length > 0) boxes.push({ label: 'Styles', count: styleFiles.length, color: 'var(--accent-purple)', icon: '🎨' });
  if (backendFiles.length > 0) boxes.push({ label: 'Backend', count: backendFiles.length, color: 'var(--accent-blue)', icon: '⚡' });
  if (dbFiles.length > 0) boxes.push({ label: 'Database', count: dbFiles.length, color: 'var(--accent-purple)', icon: '🗃️' });
  if (otherFiles.length > 0) boxes.push({ label: 'Config', count: otherFiles.length, color: 'var(--text-muted)', icon: '⚙️' });

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {boxes.map((box, i) => (
            <div key={box.label} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg"
                style={{ border: `1px solid ${box.color}`, background: 'var(--bg-secondary)', minWidth: 100 }}>
                <span className="text-2xl">{box.icon}</span>
                <span className="text-[12px] font-medium" style={{ color: box.color }}>{box.label}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{box.count} file{box.count !== 1 ? 's' : ''}</span>
              </div>
              {i < boxes.length - 1 && (
                <span className="text-lg" style={{ color: 'var(--text-muted)' }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center pb-3">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Interactive diagram coming soon</span>
      </div>
    </div>
  );
}
