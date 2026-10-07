/**
 * RoundManager
 * 
 * Orchestrates the 6-round sequence, transitions, and authoritative countdown timer.
 */
export class RoundManager {
  static TOTAL_ROUNDS = 6;
  static DEFAULT_ROUND_DURATION = 90; // 90 seconds by default
  static TRANSITION_DURATION = 4; // 4 seconds for digit reveal animation

  constructor(options = {}) {
    this.roundDuration = options.roundDurationSeconds || RoundManager.DEFAULT_ROUND_DURATION;
    this.currentRound = 1;
    this.timeRemaining = this.roundDuration;
    this.state = 'LOBBY'; // LOBBY, INSTRUCTIONS, TRADING, TRANSITION, SETTLEMENT, FINISHED
    this.isPaused = false;
    this.timerInterval = null;
    this.onTick = options.onTick || (() => {});
    this.onRoundEnd = options.onRoundEnd || (() => {});
    this.onTransitionEnd = options.onTransitionEnd || (() => {});
    this.onGameEnd = options.onGameEnd || (() => {});
  }

  setRoundDuration(seconds) {
    this.roundDuration = Math.max(10, Number(seconds) || 90);
  }

  startRound(roundNumber) {
    this.stopTimer();
    this.currentRound = roundNumber;
    this.timeRemaining = this.roundDuration;
    this.state = 'TRADING';
    this.isPaused = false;

    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      this.timeRemaining -= 1;
      this.onTick({
        round: this.currentRound,
        timeRemaining: this.timeRemaining,
        state: this.state
      });

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.handleRoundFinish();
      }
    }, 1000);
  }

  handleRoundFinish() {
    this.state = 'TRANSITION';
    this.onRoundEnd({
      round: this.currentRound
    });

    if (this.currentRound < RoundManager.TOTAL_ROUNDS) {
      // Transition to next round with countdown
      this.timeRemaining = RoundManager.TRANSITION_DURATION;
      this.timerInterval = setInterval(() => {
        this.timeRemaining -= 1;
        this.onTick({
          round: this.currentRound,
          timeRemaining: this.timeRemaining,
          state: this.state
        });

        if (this.timeRemaining <= 0) {
          this.stopTimer();
          this.onTransitionEnd({
            nextRound: this.currentRound + 1
          });
          this.startRound(this.currentRound + 1);
        }
      }, 1000);
    } else {
      // Round 6 finished: game ends and triggers final settlement
      this.state = 'SETTLEMENT';
      this.onGameEnd({
        finalRound: this.currentRound
      });
      this.state = 'FINISHED';
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  forceNextRound() {
    this.stopTimer();
    if (this.currentRound < RoundManager.TOTAL_ROUNDS) {
      this.startRound(this.currentRound + 1);
    } else {
      this.handleRoundFinish();
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  destroy() {
    this.stopTimer();
  }
}
