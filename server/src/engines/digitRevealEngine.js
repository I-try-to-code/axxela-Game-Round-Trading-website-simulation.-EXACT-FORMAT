/**
 * DigitRevealEngine
 * 
 * Manages the generation and progressive disclosure of the six-digit serial number.
 * Ensures clients NEVER receive future unrevealed digits.
 */
export class DigitRevealEngine {
  constructor(options = {}) {
    // If deterministic demo mode, use the reference sequence: 5 7 2 4 1 8
    if (options.isDeterministicDemo) {
      this.hiddenDigits = [5, 7, 2, 4, 1, 8];
    } else if (Array.isArray(options.digits) && options.digits.length === 6) {
      this.hiddenDigits = [...options.digits];
    } else {
      this.hiddenDigits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
    }
  }

  /**
   * Returns the secret digits (SERVER-SIDE ONLY).
   * MUST NEVER BE SENT OVER WEBSOCKETS OR HTTP TO PLAYERS DURING THE GAME.
   */
  getSecretDigits() {
    return [...this.hiddenDigits];
  }

  /**
   * Returns revealed digits for a given round.
   * Round 1: [] (0 digits)
   * Round 2: [D1] (1 digit)
   * Round 3: [D1, D2] (2 digits)
   * Round 4: [D1, D2, D3] (3 digits)
   * Round 5: [D1, D2, D3, D4] (4 digits)
   * Round 6: [D1, D2, D3, D4, D5] (5 digits)
   * After Round 6 (Game End): [D1, D2, D3, D4, D5, D6] (all 6 digits)
   */
  getRevealedDigitsForRound(round, isFinished = false) {
    if (isFinished || round > 6) {
      return [...this.hiddenDigits];
    }
    if (round <= 1) {
      return [];
    }
    const count = Math.min(round - 1, 5);
    return this.hiddenDigits.slice(0, count);
  }

  /**
   * Returns the final sum of all six digits (0-54).
   */
  getFinalSum() {
    return this.hiddenDigits.reduce((sum, d) => sum + d, 0);
  }

  /**
   * Computes expected fair value for a given round (for Practice Mode & Bot AI).
   * Unknown digits have expected value of 4.5.
   */
  getExpectedValue(round, isFinished = false) {
    const revealed = this.getRevealedDigitsForRound(round, isFinished);
    const knownSum = revealed.reduce((sum, d) => sum + d, 0);
    const remainingCount = 6 - revealed.length;
    const expectedValue = knownSum + remainingCount * 4.5;
    const minPossible = knownSum + remainingCount * 0;
    const maxPossible = knownSum + remainingCount * 9;

    return {
      revealed,
      knownSum,
      remainingCount,
      expectedValue,
      minPossible,
      maxPossible
    };
  }
}
