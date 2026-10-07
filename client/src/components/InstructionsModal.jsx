import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, ChevronRight, ChevronLeft, Play } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

export function InstructionsModal({
  isOpen,
  onClose,
  isHost,
  onStartGame,
  roomCode,
  playerLetter
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      soundManager.stopSpeaking();
    };
  }, []);

  if (!isOpen) return null;

  const handleSpeakerClick = () => {
    if (isSpeaking) {
      soundManager.stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      soundManager.speakInstructions(() => {
        setIsSpeaking(false);
      });
    }
  };

  const slides = [
    {
      title: "Game Rules: Trading game: Sum total of a currency note:",
      content: (
        <>
          <p>
            1. An Indian currency note has a <strong>6 digits serial number</strong>. The game is to predict the sum total of these 6 digits.
          </p>
          <p>
            2. The game has <strong>6 rounds or trading windows</strong>. In the first trading window, participants trade <strong>without any digit being disclosed</strong>. Subsequently, each round begins with <strong>one digit being disclosed</strong> after which the trading window is opened. After the disclosure, <strong>90 seconds</strong> are allocated to participants to trade with each other.
          </p>
          <p>
            3. A trade is said to happen when the buyer and the seller <strong>agree over the price</strong>.
          </p>
          <p>
            4. Each participant is allotted an alphabet.
          </p>
          <p>
            5. The <strong>last round of trading</strong> is after the 5th digit is disclosed. The game <strong>ends</strong> when the 6th digit is revealed.
          </p>
        </>
      )
    },
    {
      title: "Game Rules: Trading game: Sum total of a currency note:",
      content: (
        <>
          <p>
            1. Try to sell <strong>HIGH & buy LOW</strong>.
          </p>
          <p>
            2. You can <strong>ALSO initiate a trade by selling first</strong>.
          </p>
          <p>
            3. Assuming you have bought (or sold) ONCE during a round of trading but failed to Sell (or buy), it would be said that you have an "Open Position" and we would call it <strong>+1 (or -1)</strong>. If you have bought (or sold) TWICE but failed to sell (or buy), then the open position would be called <strong>+2 (or -2)</strong>. Remember: Buy is +1 and Sell is -1.
          </p>
          <p>
            4. There are <strong>no restrictions on the number of transactions</strong> in any given round.
          </p>
          <p>
            5. At any point during the 6 rounds you can have a <strong>max open position of +2 or -2 only</strong>.
          </p>
          <p>
            6. Your AIM is to <strong>maximize profit</strong> from all the trades that you make throughout the six rounds.
          </p>
        </>
      )
    }
  ];

  return (
    <div className="instructions-overlay">
      <div className="instructions-header">
        <div className="instructions-title-row">
          <h1 className="instructions-title">INSTRUCTIONS</h1>
          <button
            className={`speaker-pill-btn ${isSpeaking ? 'speaking' : ''}`}
            onClick={handleSpeakerClick}
            title={isSpeaking ? "Stop narration" : "Listen to audio instructions"}
          >
            {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
        <p className="instructions-subtitle">Please listen carefully</p>
      </div>

      <div className="instructions-content">
        {/* Left: Presentation Slide */}
        <div className="rules-slide-card">
          <div className="slide-left">
            <span className="slide-title-label">{slides[currentSlide].title}</span>
            <div className="chalk-graphics">
              <div className="chalk-stick-1" />
              <div className="chalk-stick-2" />
            </div>
            <div className="slide-nav-row">
              <button
                className="icon-btn"
                onClick={() => setCurrentSlide(prev => (prev === 0 ? 1 : 0))}
                style={{ padding: '4px 8px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <div
                className={`slide-dot ${currentSlide === 0 ? 'active' : ''}`}
                onClick={() => setCurrentSlide(0)}
              />
              <div
                className={`slide-dot ${currentSlide === 1 ? 'active' : ''}`}
                onClick={() => setCurrentSlide(1)}
              />
              <button
                className="icon-btn"
                onClick={() => setCurrentSlide(prev => (prev === 1 ? 0 : 1))}
                style={{ padding: '4px 8px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="slide-right">
            {slides[currentSlide].content}
          </div>
        </div>

        {/* Right: Waiting state card with analog clock */}
        <div className="waiting-card">
          <div className="clock-icon-wrapper">
            <div className="clock-hand-hour" />
            <div className="clock-hand-minute" />
          </div>

          <div className="waiting-card-title">
            {isHost
              ? "Ready to begin the trading round!"
              : "Waiting for host to start the Demo round!"}
          </div>

          {roomCode && (
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              Room: <strong style={{ color: 'var(--cyan-primary)' }}>{roomCode}</strong>
              {playerLetter && <> | You: <strong style={{ color: '#ffd54f' }}>{playerLetter}</strong></>}
            </div>
          )}

          {isHost ? (
            <button
              className="btn-start-game"
              onClick={() => {
                soundManager.stopSpeaking();
                onStartGame();
              }}
            >
              Start Game
            </button>
          ) : (
            <button
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={onClose}
            >
              Enter Table View
            </button>
          )}

          {isHost && (
            <button
              className="btn-secondary"
              style={{ width: '100%', fontSize: '12px', padding: '8px' }}
              onClick={onClose}
            >
              Close Instructions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
