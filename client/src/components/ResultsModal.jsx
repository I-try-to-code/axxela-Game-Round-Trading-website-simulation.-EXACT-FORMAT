import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, PlayCircle } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

export function ResultsModal({
  isOpen,
  finalDigits = [],
  finalSum,
  settlementResults,
  leaderboard = [],
  currentUser,
  onReplay,
  onPlayAgain
}) {
  useEffect(() => {
    if (isOpen) {
      soundManager.playGameOver();
      // If user had positive PnL, trigger confetti
      const userRank = leaderboard.find(l => l.id === currentUser?.id);
      if (userRank && userRank.pnl > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const userResult = settlementResults?.[currentUser?.id];
  const userRankEntry = leaderboard.find(l => l.id === currentUser?.id);

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '650px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(255,213,79,0.15)', borderRadius: '50%', marginBottom: '8px' }}>
            <Trophy size={36} color="#ffd54f" />
          </div>
          <h2 className="modal-title">GAME OVER</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '4px' }}>
            Final Settlement Completed
          </p>
        </div>

        {/* Final Number & Sum Card */}
        <div style={{
          background: 'rgba(10, 0, 18, 0.7)',
          border: '1.5px solid var(--magenta-primary)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Serial Number & Settlement Value
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {finalDigits.map((d, i) => (
              <div
                key={i}
                className="digit-box revealed"
                style={{ width: '42px', height: '52px', fontSize: '24px' }}
              >
                {d}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--cyan-primary)' }}>
            Sum: {finalDigits.join(' + ')} = {finalSum}
          </div>
        </div>

        {/* User Summary Stats */}
        {userResult && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            background: 'rgba(40, 0, 56, 0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FINAL RANK</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#ffd54f' }}>
                #{userRankEntry?.rank || 1}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL P/L</div>
              <div style={{
                fontSize: '20px',
                fontWeight: '800',
                color: userResult.finalPnl >= 0 ? '#00e676' : '#ff5252'
              }}>
                {userResult.finalPnl > 0 ? `+${userResult.finalPnl}` : userResult.finalPnl}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REALIZED P/L</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-white)' }}>
                {userResult.realizedPnl > 0 ? `+${userResult.realizedPnl}` : userResult.realizedPnl}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SETTLEMENT</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-white)' }}>
                {userResult.settlementPnl > 0 ? `+${userResult.settlementPnl}` : userResult.settlementPnl}
              </div>
            </div>
          </div>
        )}

        {/* Final Leaderboard */}
        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th style={{ textAlign: 'right' }}>Final PnL</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isUser = entry.id === currentUser?.id;
                return (
                  <tr key={entry.id} className={`leaderboard-row ${isUser ? 'is-user' : ''}`}>
                    <td style={{ fontWeight: '700', color: entry.rank === 1 ? '#ffd54f' : 'inherit' }}>
                      #{entry.rank}
                    </td>
                    <td>
                      <div className="player-cell">
                        <div className="mini-circle">{entry.letter}</div>
                        <span>{entry.nickname} {isUser && '(You)'}</span>
                      </div>
                    </td>
                    <td className={`pnl-cell ${entry.pnl > 0 ? 'pnl-pos' : entry.pnl < 0 ? 'pnl-neg' : 'pnl-zero'}`}>
                      {entry.formattedPnl}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={onReplay}
          >
            <PlayCircle size={18} />
            Replay Game
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={onPlayAgain}
          >
            <RefreshCw size={18} />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
