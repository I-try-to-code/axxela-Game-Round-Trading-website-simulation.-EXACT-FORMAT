import React from 'react';

export function TradesHistory({ trades = [] }) {
  return (
    <div className="sidebar-section">
      <div className="section-divider">
        <span className="section-divider-title">Trades</span>
      </div>

      {trades.length === 0 ? (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
          No trades executed yet
        </div>
      ) : (
        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Price</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td style={{ fontWeight: '700' }}>
                    Player {trade.partnerLetter}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                    {trade.price}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge-action ${trade.action.toLowerCase()}`}>
                      {trade.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
