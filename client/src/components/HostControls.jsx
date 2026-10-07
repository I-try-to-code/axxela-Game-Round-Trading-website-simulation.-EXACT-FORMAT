import React, { useState } from 'react';
import { Settings, Play, Pause, SkipForward, RotateCcw, Eye } from 'lucide-react';

export function HostControls({
  isHost,
  onPause,
  onResume,
  onNextRound,
  onResetGame,
  isPaused,
  isTrading
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isHost) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Host & Developer Controls"
      >
        <Settings size={18} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '44px',
          right: '0',
          background: 'rgba(24, 0, 34, 0.95)',
          border: '1.5px solid var(--magenta-primary)',
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          zIndex: 100,
          width: '180px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dim)', letterSpacing: '1px' }}>
            HOST CONTROLS
          </div>

          {isPaused ? (
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 10px' }}
              onClick={onResume}
            >
              <Play size={14} /> Resume Game
            </button>
          ) : (
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 10px' }}
              onClick={onPause}
              disabled={!isTrading}
            >
              <Pause size={14} /> Pause Game
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 10px' }}
            onClick={onNextRound}
          >
            <SkipForward size={14} /> Next Round
          </button>

          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 10px', color: '#ff5252' }}
            onClick={onResetGame}
          >
            <RotateCcw size={14} /> Reset Game
          </button>
        </div>
      )}
    </div>
  );
}
