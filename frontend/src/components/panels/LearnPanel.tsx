import { useMemo } from 'react';
import { getLessonsForFile, getLessonsForProject, getFigiUSuggestions, lessonUrl, FIGI_CODE_BASE_URL } from '../../data/curriculumMap';
import type { LessonSuggestion } from '../../data/curriculumMap';

interface FileData {
  id: number;
  path: string;
  language: string;
  content?: string;
  updated_at: string;
}

interface LearnPanelProps {
  files: FileData[];
  fileContents: Record<string, string>;
  selectedFile: string | null;
}

export default function LearnPanel({ files, fileContents, selectedFile }: LearnPanelProps) {
  const lessons = useMemo<LessonSuggestion[]>(() => {
    if (selectedFile) return getLessonsForFile(selectedFile);
    return getLessonsForProject(files);
  }, [files, selectedFile]);

  const figiU = useMemo(() => {
    const enrichedFiles = files.map(f => ({ path: f.path, content: fileContents[f.path] || f.content || '' }));
    return getFigiUSuggestions(enrichedFiles);
  }, [files, fileContents]);

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-3xl mb-3">🎓</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Start building to see relevant lessons here</p>
      </div>
    );
  }

  const contextLabel = selectedFile ? selectedFile.split('/').pop() : 'your project';

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <span className="text-sm">🎓</span>
        <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Related Lessons</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Based on: {contextLabel}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {lessons.length > 0 ? (
          lessons.map(lesson => (
            <div key={lesson.lessonId}
              className="rounded-lg p-3 transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${lesson.chapterColor}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px]">{lesson.chapterIcon}</span>
                <span className="text-[10px] font-medium" style={{ color: lesson.chapterColor }}>
                  {lesson.chapterId.toUpperCase().replace('-', '')} · {lesson.chapterTitle}
                </span>
              </div>
              <p className="text-[12px] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {lesson.lessonTitle}
              </p>
              <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                {lesson.relevance}
              </p>
              <a href={lessonUrl(lesson.lessonId, lesson.chapterId)} target="_blank" rel="noopener noreferrer"
                className="text-[11px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-orange)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                Open in Figi Code →
              </a>
            </div>
          ))
        ) : (
          <p className="text-center py-4" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            No specific lessons for this file type yet.
          </p>
        )}

        {/* Figi U Deep Dives */}
        {figiU.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-3 pb-1">
              <span className="text-sm">🎓</span>
              <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Figi U Deep Dives</span>
            </div>
            {figiU.map(s => (
              <div key={s.title}
                className="rounded-lg p-3 transition-colors"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderLeft: '4px solid var(--accent-purple)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--accent-purple)' }}>{s.category}</span>
                </div>
                <p className="text-[12px] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>{s.relevance}</p>
                <a href={`${FIGI_CODE_BASE_URL}/learn?view=figi-u&from=figi-studio`} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-purple)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Start in Figi U →
                </a>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="text-center py-2 shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        <a href={FIGI_CODE_BASE_URL} target="_blank" rel="noopener noreferrer"
          className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Powered by Figi Code Academy · 110+ courses · figicode.com
        </a>
      </div>
    </div>
  );
}
