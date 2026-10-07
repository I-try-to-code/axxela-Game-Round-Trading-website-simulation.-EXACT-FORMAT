import React from 'react';
import { X } from 'lucide-react';

export function WorkingOrders({ workingOrders = [], onCancelOrder }) {
  return (
    <div className="sidebar-section">
      <div className="section-divider">
        <span className="section-divider-title">Working Orders</span>
      </div>

      {workingOrders.length === 0 ? (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>
          No active working orders
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Action</th>
              <th style={{ width: '40%' }}>Price</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Cancel</th>
            </tr>
          </thead>
          <tbody>
            {workingOrders.map((order) => {
              const isBuy = order.side === 'BUY';
              return (
                <tr key={order.id}>
                  <td>
                    <span style={{
                      color: isBuy ? '#00e676' : '#ff5252',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}>
                      {isBuy ? 'Buy' : 'Sell'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '14px' }}>
                    {order.price}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-cancel"
                      onClick={() => onCancelOrder(order.id)}
                      title="Cancel working order"
                      style={{
                        marginLeft: 'auto',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(213,0,0,0.3)',
                        border: '1px solid #ff5252',
                        color: '#ff5252',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
