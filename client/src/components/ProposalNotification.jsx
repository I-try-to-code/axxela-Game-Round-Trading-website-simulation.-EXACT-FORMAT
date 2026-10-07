import React, { useEffect } from 'react';
import { soundManager } from '../audio/soundEffects';

export function ProposalNotification({ incomingProposals = [], onAccept, onReject }) {
  useEffect(() => {
    if (incomingProposals.length > 0) {
      soundManager.playProposalReceived();
    }
  }, [incomingProposals.length]);

  if (incomingProposals.length === 0) return null;

  return (
    <div className="incoming-proposals-container">
      {incomingProposals.map((prop) => {
        // If initiator wanted to BUY, they want to buy from YOU (you sell)
        // If initiator wanted to SELL, they want to sell to YOU (you buy)
        const isInitiatorBuying = prop.side === 'BUY';
        const actionText = isInitiatorBuying
          ? `wants to BUY from you @ ${prop.price}`
          : `wants to SELL to you @ ${prop.price}`;

        return (
          <div key={prop.id} className="proposal-alert-card">
            <div className="proposal-text">
              <strong>Player {prop.fromPlayerLetter}</strong> {actionText}
            </div>
            <div className="proposal-actions">
              <button
                className="btn-accept"
                onClick={() => {
                  soundManager.playTradeExecuted();
                  onAccept(prop.id);
                }}
              >
                Accept
              </button>
              <button
                className="btn-reject"
                onClick={() => onReject(prop.id)}
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
