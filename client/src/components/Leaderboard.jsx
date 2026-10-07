import React from 'react';

export function Leaderboard({ leaderboard = [], currentUserId }) {
  return (
    <div className="sidebar-section">
      <div className="section-header">
        <span className="section-title">Leaderboard</span>
      </div>

      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Player</th>
            <th style={{ textAlign: 'right' }}>PnL</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => {
            const isUser = entry.id === currentUserId;
            let pnlClass = 'pnl-zero';
            if (entry.pnl > 0) pnlClass = 'pnl-pos';
            else if (entry.pnl < 0) pnlClass = 'pnl-neg';

            return (
              <tr key={entry.id} className={`leaderboard-row ${isUser ? 'is-user' : ''}`}>
                <td>
                  <div className="player-cell">
                    <div className="mini-circle">{entry.letter}</div>
                    <span>{entry.nickname} {isUser && '(You)'}</span>
                  </div>
                </td>
                <td className={`pnl-cell ${pnlClass}`}>
                  {entry.formattedPnl}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
