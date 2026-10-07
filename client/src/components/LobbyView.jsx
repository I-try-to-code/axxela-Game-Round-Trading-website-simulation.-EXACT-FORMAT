import React, { useState } from 'react';
import { Users, Play, BookOpen, Copy, Check, Sparkles } from 'lucide-react';

export function LobbyView({
  roomCode,
  players = [],
  myPlayer,
  isHost,
  onStartGame,
  onShowInstructions,
  isPracticeMode,
  isDeterministicDemo,
  roundDurationSeconds,
  maxPlayers = 6,
  networkInfo
}) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatLetters = ALL_LETTERS.slice(0, maxPlayers || 6);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/?join=${roomCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '580px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '4px'
          }}>
            PRACTICE ROOM LOBBY
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '8px 20px',
            borderRadius: '30px',
            border: '1.5px solid var(--magenta-primary)',
            boxShadow: '0 0 20px var(--magenta-glow)'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ROOM CODE:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: '800', color: 'var(--cyan-primary)', letterSpacing: '2px' }}>
              {roomCode}
            </span>
            <button
              className="icon-btn"
              style={{ padding: '6px', borderRadius: '50%' }}
              onClick={handleCopyCode}
              title="Copy room code"
            >
              {copied ? <Check size={16} color="#00e676" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Network Share Link for Friends */}
        <div style={{
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '11px', color: 'var(--cyan-primary)', fontWeight: '700' }}>
              SHARE LINK WITH FRIENDS
            </div>
            <div style={{
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {window.location.origin}/?join={roomCode}
            </div>
          </div>
          <button
            className="icon-btn"
            style={{ padding: '6px 12px', borderRadius: '6px', display: 'flex', gap: '6px', fontSize: '12px' }}
            onClick={handleCopyLink}
          >
            {copiedLink ? <Check size={14} color="#00e676" /> : <Copy size={14} />}
            {copiedLink ? 'Copied' : 'Copy Link'}
          </button>
        </div>

        {/* User Identity Highlight */}
        {myPlayer && (
          <div style={{
            background: 'rgba(255, 213, 79, 0.1)',
            border: '1px solid rgba(255, 213, 79, 0.4)',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '13px', color: '#ffd54f', fontWeight: '700' }}>
              YOUR IDENTIFIER
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              background: '#ffd54f',
              color: '#000',
              padding: '2px 12px',
              borderRadius: '6px'
            }}>
              PLAYER {myPlayer.letter}
            </span>
          </div>
        )}

        {/* Players List */}
        <div style={{
          background: 'rgba(20, 0, 30, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '14px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            fontSize: '12px',
            color: 'var(--text-dim)',
            fontWeight: '700'
          }}>
            <span>SEATS & PARTICIPANTS ({players.length}/{maxPlayers})</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Empty seats filled by AI bots
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {seatLetters.map((letter) => {
              const player = players.find(p => p.letter === letter);
              const isMe = player?.id === myPlayer?.id;

              return (
                <div
                  key={letter}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isMe
                      ? 'rgba(255, 213, 79, 0.15)'
                      : player
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isMe ? '1px solid #ffd54f' : '1px solid rgba(255, 255, 255, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="mini-circle" style={{ background: player ? 'var(--cyan-dark)' : 'rgba(255,255,255,0.1)' }}>
                      {letter}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>
                      {player ? (isMe ? `${player.nickname} (You)` : player.nickname) : `Seat ${letter} (Auto Bot)`}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: player ? (isMe ? '#ffd54f' : '#00e676') : 'var(--text-muted)'
                  }}>
                    {player ? (player.isHost ? 'HOST' : 'READY') : 'AI BOT'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Config Summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: '12px',
          color: 'var(--text-dim)',
          padding: '4px'
        }}>
          <div>⏱ <strong>{roundDurationSeconds}s</strong> rounds</div>
          <div>🎯 <strong>{isPracticeMode ? 'Practice Mode' : 'Competitive Mode'}</strong></div>
          {isDeterministicDemo && <div>🎲 <strong>Demo Seed (27)</strong></div>}
        </div>

        {/* Host Start Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={onShowInstructions}
          >
            <BookOpen size={16} />
            Instructions
          </button>

          {isHost ? (
            <button
              className="btn-start-game"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={onStartGame}
            >
              <Play size={16} />
              Start Game
            </button>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              color: 'var(--text-dim)',
              fontWeight: '600'
            }}>
              Waiting for Host to start...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
