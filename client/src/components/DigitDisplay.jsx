import React from 'react';

export function DigitDisplay({ revealedDigits = [], isFinished = false, newlyRevealedIndex = -1 }) {
  // Always render exactly 6 digit boxes
  const slots = Array.from({ length: 6 }, (_, index) => {
    const isRevealed = index < revealedDigits.length;
    const digit = isRevealed ? revealedDigits[index] : null;
    const isNew = index === newlyRevealedIndex;

    return {
      index,
      isRevealed,
      digit,
      isNew
    };
  });

  return (
    <div className="table-center-content">
      <div className="table-logo-text">Digit Sum Trading</div>
      <div className="digits-container">
        {slots.map(slot => (
          <div
            key={slot.index}
            className={`digit-box ${slot.isRevealed ? 'revealed' : 'unrevealed'} ${slot.isNew ? 'newly-revealed' : ''}`}
          >
            {slot.isRevealed ? slot.digit : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
