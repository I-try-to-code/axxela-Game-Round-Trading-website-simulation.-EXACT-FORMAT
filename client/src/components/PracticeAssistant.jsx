import React from 'react';
import { HelpCircle } from 'lucide-react';

export function PracticeAssistant({ practiceStats, isEnabled }) {
  if (!isEnabled || !practiceStats) return null;

  const { expectedValue, minPossible, maxPossible, knownSum, remainingCount } = practiceStats;

  return (
    <div className="practice-hud" title={`Calculation: ${knownSum} (known) + ${remainingCount} × 4.5 (unknown) = ${expectedValue}`}>
      <div>
        <div className="practice-metric-label">Fair Value (EV)</div>
        <div className="practice-metric-value">{expectedValue}</div>
      </div>
      <div>
        <div className="practice-metric-label">Min / Max</div>
        <div className="practice-metric-value" style={{ color: 'var(--text-dim)' }}>
          {minPossible} – {maxPossible}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>
        <HelpCircle size={16} />
      </div>
    </div>
  );
}
