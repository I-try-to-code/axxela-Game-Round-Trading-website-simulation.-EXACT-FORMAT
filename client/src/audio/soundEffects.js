/**
 * SoundEffects & Audio Engine
 * Uses the Web Audio API to synthesize responsive audio cues with zero external asset dependencies.
 * Also integrates SpeechSynthesis for spoken instruction narration.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isSpeaking = false;

    // Load mute preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trading_game_muted');
      this.isMuted = saved === 'true';
    }
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading_game_muted', String(this.isMuted));
    }
    if (this.isMuted && this.speechSynth) {
      this.speechSynth.cancel();
      this.isSpeaking = false;
    }
    return this.isMuted;
  }

  playTone(freq, duration = 0.15, type = 'sine', gainVal = 0.12) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy
    }
  }

  playRoundStart() {
    if (this.isMuted) return;
    this.playTone(523.25, 0.25, 'triangle', 0.2); // C5
    setTimeout(() => this.playTone(659.25, 0.35, 'triangle', 0.2), 150); // E5
    setTimeout(() => this.playTone(783.99, 0.5, 'triangle', 0.25), 300); // G5
  }

  playDigitReveal() {
    if (this.isMuted) return;
    this.playTone(440, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(880, 0.2, 'sine', 0.25), 100);
    setTimeout(() => this.playTone(1320, 0.3, 'triangle', 0.2), 200);
  }

  playOrderPlaced() {
    if (this.isMuted) return;
    this.playTone(600, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(900, 0.1, 'sine', 0.15), 60);
  }

  playProposalReceived() {
    if (this.isMuted) return;
    this.playTone(700, 0.12, 'sine', 0.25);
    setTimeout(() => this.playTone(1050, 0.2, 'sine', 0.25), 120);
  }

  playTradeExecuted() {
    if (this.isMuted) return;
    // Cheerful double chime
    this.playTone(784, 0.15, 'triangle', 0.25); // G5
    setTimeout(() => this.playTone(987.77, 0.18, 'triangle', 0.25), 120); // B5
    setTimeout(() => this.playTone(1318.5, 0.4, 'sine', 0.3), 240); // E6
  }

  playWarningTick() {
    if (this.isMuted) return;
    this.playTone(400, 0.06, 'square', 0.08);
  }

  playGameOver() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.4, 'triangle', 0.2), idx * 180);
    });
  }

  speakInstructions(onComplete) {
    if (this.isMuted || !this.speechSynth) return;

    this.speechSynth.cancel();
    this.isSpeaking = true;

    const text = `Welcome to the Trading Game. 
    Here are the core rules:
    An Indian currency note has a six-digit serial number. The game objective is to predict the sum total of these six digits.
    There are six trading windows.
    In the first trading window, participants trade without any digit disclosed.
    Subsequently, each round begins with one digit disclosed, after which a 90-second trading window opens.
    A trade occurs when buyer and seller agree on the price.
    Each participant is allotted an alphabet letter.
    Buy adds 1 to your position. Sell subtracts 1.
    You can also initiate a trade by selling first.
    At any point, your maximum open position is plus 2 or minus 2 only.
    There is no restriction on the total number of transactions.
    The last trading window is after the fifth digit is disclosed.
    The game ends when the sixth digit is revealed and all remaining open positions are settled.
    Your objective is to maximize profit across all trades. Good luck!`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      if (typeof onComplete === 'function') onComplete();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.speechSynth.speak(utterance);
  }

  stopSpeaking() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
      this.isSpeaking = false;
    }
  }
}

export const soundManager = new SoundEngine();
