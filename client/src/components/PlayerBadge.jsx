import React from 'react';

export function PlayerBadge({
  player,
  isSelf,
  isSelectedPartner,
  onSelect,
  seatIndex = 0,
  totalSeats = 6,
  orders = [],
  onSelectOrder
}) {
  // Dynamic position around the oval table
  // Seat 0 (Player A / Self) starts at bottom center and wraps counter-clockwise
  const angle = Math.PI / 2 - (seatIndex * 2 * Math.PI) / Math.max(2, totalSeats);
  const rx = 50; // horizontal radius in %
  const ry = 50; // vertical radius in %
  const leftPercent = 50 + rx * Math.cos(angle);
  const topPercent = 50 + ry * Math.sin(angle);

  const dynamicStyle = {
    left: `${leftPercent}%`,
    top: `${topPercent}%`,
    transform: 'translate(-50%, -50%)'
  };

  // Determine pill alignment based on seat quadrant
  let pillsStyle = {};
  if (leftPercent > 70) {
    pillsStyle = { left: '105%', top: '50%', transform: 'translateY(-50%)', alignItems: 'flex-start' };
  } else if (leftPercent < 30) {
    pillsStyle = { right: '105%', top: '50%', transform: 'translateY(-50%)', alignItems: 'flex-end' };
  } else if (topPercent < 35) {
    pillsStyle = { bottom: '110%', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' };
  } else {
    pillsStyle = { top: '110%', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' };
  }

  // Two-letter initials or single letter
  const displayName = player.nickname?.length >= 2 && !player.nickname.startsWith('Player ')
    ? player.nickname.substring(0, 2).toUpperCase()
    : player.letter;

  return (
    <div
      className={`player-marker ${isSelf ? 'is-self' : ''} ${isSelectedPartner ? 'selected-partner' : ''}`}
      style={dynamicStyle}
      onClick={() => {
        if (!isSelf && typeof onSelect === 'function') {
          onSelect(player);
        }
      }}
      title={isSelf ? "This is your seat" : `Click to select Player ${player.letter}`}
    >
      <span className="player-letter">{displayName}</span>

      {isSelf && <span className="player-tag self-tag">YOU</span>}
      {!isSelf && player.isBot && <span className="player-tag bot-tag">BOT</span>}

      {/* Broadcasted Working Order Badges (up to 2 per player) */}
      {orders.length > 0 && (
        <div className="player-order-pills-container" style={pillsStyle}>
          {orders.map((ord) => (
            <div
              key={ord.id}
              className={`order-marker-pill ${ord.side.toLowerCase()}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isSelf && typeof onSelectOrder === 'function') {
                  onSelectOrder(ord, player);
                }
              }}
              title={
                isSelf
                  ? `Your working order: ${ord.side} @ ${ord.price}`
                  : `Click to ${ord.side === 'BUY' ? 'SELL to' : 'BUY from'} ${player.letter} @ ${ord.price}`
              }
            >
              {ord.side === 'BUY' ? `Buy @ ${ord.price}` : `Sell @ ${ord.price}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
