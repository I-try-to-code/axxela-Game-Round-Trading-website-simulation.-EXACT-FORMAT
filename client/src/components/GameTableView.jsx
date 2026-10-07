import React from 'react';
import { DigitDisplay } from './DigitDisplay';
import { PlayerBadge } from './PlayerBadge';
import { PracticeAssistant } from './PracticeAssistant';

export function GameTableView({
  revealedDigits = [],
  newlyRevealedIndex = -1,
  players = [],
  myPlayer,
  selectedPartner,
  onSelectPartner,
  openTableOrders = [],
  onSelectOrder,
  isFinished = false,
  practiceStats,
  isPracticeMode
}) {
  return (
    <div className="table-area">
      {/* Practice Assistant Mode HUD */}
      <PracticeAssistant
        practiceStats={practiceStats}
        isEnabled={isPracticeMode}
      />

      {/* Main Oval Table */}
      <div className="oval-table">
        {/* Digits Display in Center */}
        <DigitDisplay
          revealedDigits={revealedDigits}
          newlyRevealedIndex={newlyRevealedIndex}
          isFinished={isFinished}
        />

        {/* Circular Player Seats Around Oval */}
        {players.map((p, index) => {
          const isSelf = p.id === myPlayer?.id;
          const isSelected = selectedPartner?.id === p.id;
          const playerOrders = openTableOrders.filter(o => o.playerId === p.id);

          return (
            <PlayerBadge
              key={p.id || index}
              player={p}
              isSelf={isSelf}
              isSelectedPartner={isSelected}
              onSelect={onSelectPartner}
              seatIndex={index}
              totalSeats={players.length}
              orders={playerOrders}
              onSelectOrder={onSelectOrder}
            />
          );
        })}
      </div>
    </div>
  );
}
