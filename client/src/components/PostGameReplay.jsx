import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, X } from 'lucide-react';
import { DigitDisplay } from './DigitDisplay';

export function PostGameReplay({
  isOpen,
  onClose,
  finalDigits = [],
  allTrades = [],
  players = []
}) {
  const [replayRound, setReplayRound] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  // Compute revealed digits for this replay round
  const revealedForRound = finalDigits.slice(0, Math.min(replayRound - 1, 5));
  const isSettlement = replayRound === 7;
  const currentRevealed = isSettlement ? finalDigits : revealedForRound;

  // Filter trades for selected round
  const roundTrades = allTrades.filter(t => isSettlement ? true : t.round === replayRound);

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '750px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="modal-title">POST-GAME REPLAY</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Analyze round-by-round decisions and price discovery
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Round Header & Digit Display */}
        <div style={{
          background: 'rgba(20, 0, 30, 0.7)',
          border: '1px solid rgba(165,0,101,0.5)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ffd54f' }}>
            {isSettlement ? 'FINAL SETTLEMENT' : `ROUND ${replayRound}`}
          </div>

          <DigitDisplay
            revealedDigits={currentRevealed}
            isFinished={isSettlement}
          />
        </div>

        {/* Replay Controls Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button
            className="icon-btn"
            onClick={() => setReplayRound(prev => Math.max(1, prev - 1))}
            disabled={replayRound <= 1}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5, 6, 7].map(r => (
              <button
                key={r}
                className={`icon-btn ${replayRound === r ? 'active' : ''}`}
                style={{
                  width: '36px',
                  height: '36px',
                  background: replayRound === r ? 'var(--cyan-primary)' : 'rgba(255,255,255,0.08)',
                  color: replayRound === r ? '#000' : '#fff',
                  fontWeight: '800'
                }}
                onClick={() => setReplayRound(r)}
              >
                {r === 7 ? 'End' : `R${r}`}
              </button>
            ))}
          </div>

          <button
            className="icon-btn"
            onClick={() => setReplayRound(prev => Math.min(7, prev + 1))}
            disabled={replayRound >= 7}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Executed Trades in Selected Round */}
        <div style={{
          background: 'rgba(30, 0, 42, 0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '14px',
          maxHeight: '220px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '8px' }}>
            {isSettlement ? 'All Executed Game Trades' : `Trades Executed in Round ${replayRound}`} ({roundTrades.length})
          </div>

          {roundTrades.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
              No trades were executed in this round
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {roundTrades.map((t, idx) => (
                  <tr key={idx}>
                    <td>R{t.round}</td>
                    <td style={{ color: '#00e676', fontWeight: '700' }}>
                      Player {t.buyerLetter}
                    </td>
                    <td style={{ color: '#ff5252', fontWeight: '700' }}>
                      Player {t.sellerLetter}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '800' }}>
                      {t.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
