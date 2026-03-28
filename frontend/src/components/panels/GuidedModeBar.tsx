interface GuidedStep {
  step: number;
  title: string;
  figiSays: string;
  buildPrompt: string;
  designStyle?: string;
  afterExplanation: string;
  conceptsIntroduced: string[];
}

interface GuidedPath {
  id: string;
  name: string;
  icon: string;
  steps: GuidedStep[];
  xp_reward: number;
}

interface GuidedState {
  path: GuidedPath;
  currentStep: number;
  status: 'intro' | 'building' | 'explaining' | 'ready_for_next' | 'complete';
}

interface GuidedModeBarProps {
  guidedState: GuidedState;
  onSendPrompt: () => void;
  onNextStep: () => void;
  generating: boolean;
}

export default function GuidedModeBar({ guidedState, onSendPrompt, onNextStep, generating }: GuidedModeBarProps) {
  const { path, currentStep, status } = guidedState;
  const totalSteps = path.steps.length;

  if (status === 'complete') {
    return (
      <div className="shrink-0 p-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(249,115,22,0.1))', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Path Complete! {path.icon} {path.name}
          </h3>
          <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>
            You earned {path.xp_reward} XP! Amazing work.
          </p>
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: '#a855f7' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-4 py-3" style={{ background: 'rgba(168,85,247,0.06)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs">🎓</span>
          <span className="text-[11px] font-semibold" style={{ color: '#a855f7' }}>
            {path.icon} {path.name}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Step {currentStep} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep || (stepNum === currentStep && (status === 'ready_for_next'));
          const isCurrent = stepNum === currentStep && !isCompleted;
          return (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{
              background: isCompleted ? '#a855f7' : isCurrent ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.1)',
            }} />
          );
        })}
      </div>

      {/* Action button */}
      {status === 'intro' && (
        <button onClick={onSendPrompt} disabled={generating}
          className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all"
          style={{
            background: generating ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)',
            color: '#a855f7',
            border: '1px solid rgba(168,85,247,0.3)',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.5 : 1,
          }}>
          {generating ? 'Building...' : 'Send Build Prompt →'}
        </button>
      )}
      {status === 'building' && (
        <div className="text-center py-1">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Building step {currentStep}...</span>
        </div>
      )}
      {status === 'ready_for_next' && (
        <button onClick={onNextStep}
          className="w-full py-2 rounded-lg text-[12px] font-semibold transition-all"
          style={{
            background: 'rgba(168,85,247,0.15)',
            color: '#a855f7',
            border: '1px solid rgba(168,85,247,0.3)',
            cursor: 'pointer',
          }}>
          {currentStep >= totalSteps ? 'Complete Path 🎉' : `Next Step: ${path.steps[currentStep]?.title} →`}
        </button>
      )}
    </div>
  );
}
