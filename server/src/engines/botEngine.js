/**
 * BotEngine
 * 
 * Controls AI bot participants.
 * Strictly adheres to information privacy: bots only use the CURRENTLY REVEALED digits.
 * Implements 5 distinct personalities:
 * - BOT_RANDOM
 * - BOT_FAIR_VALUE
 * - BOT_CONSERVATIVE
 * - BOT_AGGRESSIVE
 * - BOT_MARKET_PLAYER
 */
export class BotEngine {
  static PERSONALITIES = [
    'BOT_FAIR_VALUE',
    'BOT_CONSERVATIVE',
    'BOT_AGGRESSIVE',
    'BOT_MARKET_PLAYER',
    'BOT_RANDOM'
  ];

  constructor(tradeEngine, positionEngine) {
    this.tradeEngine = tradeEngine;
    this.positionEngine = positionEngine;
  }

  /**
   * Computes expected value from ONLY public revealed digits.
   */
  getPublicFairValue(revealedDigits) {
    const knownSum = revealedDigits.reduce((acc, d) => acc + d, 0);
    const unrevealedCount = 6 - revealedDigits.length;
    return knownSum + unrevealedCount * 4.5;
  }

  /**
   * Evaluates an incoming trade proposal targeted at a bot.
   * 
   * @param {Object} bot - The bot player object ({ id, letter, botType })
   * @param {Object} proposal - The incoming proposal
   * @param {Array<number>} revealedDigits - Currently disclosed digits
   * @returns {'ACCEPT'|'REJECT'} Decision
   */
  evaluateProposal(bot, proposal, revealedDigits) {
    const currentPosition = this.positionEngine.getPosition(bot.id);
    const ev = this.getPublicFairValue(revealedDigits);
    const price = proposal.price;

    // Proposal side is what the INITIATOR wants to do.
    // If initiator wants to BUY, bot would be SELLING.
    // If initiator wants to SELL, bot would be BUYING.
    const botSide = proposal.side === 'BUY' ? 'SELL' : 'BUY';

    // Check position limits
    if (botSide === 'SELL' && !this.positionEngine.canSell(bot.id, 1)) {
      return 'REJECT'; // Cannot sell, would exceed -2
    }
    if (botSide === 'BUY' && !this.positionEngine.canBuy(bot.id, 1)) {
      return 'REJECT'; // Cannot buy, would exceed +2
    }

    const type = bot.botType || 'BOT_FAIR_VALUE';

    switch (type) {
      case 'BOT_CONSERVATIVE': {
        // Needs high edge (+-2.5 from EV)
        if (botSide === 'SELL' && price >= ev + 2.0) return 'ACCEPT';
        if (botSide === 'BUY' && price <= ev - 2.0) return 'ACCEPT';
        return 'REJECT';
      }

      case 'BOT_AGGRESSIVE': {
        // Willing to trade near EV (+-0.5 edge)
        if (botSide === 'SELL' && price >= ev - 0.5) return 'ACCEPT';
        if (botSide === 'BUY' && price <= ev + 0.5) return 'ACCEPT';
        return 'REJECT';
      }

      case 'BOT_MARKET_PLAYER': {
        // Prioritizes flattening inventory if skewed, else trades within +-1.0
        if (currentPosition > 0 && botSide === 'SELL' && price >= ev - 1.0) {
          return 'ACCEPT'; // Glad to sell off long position
        }
        if (currentPosition < 0 && botSide === 'BUY' && price <= ev + 1.0) {
          return 'ACCEPT'; // Glad to cover short position
        }
        if (botSide === 'SELL' && price >= ev + 0.5) return 'ACCEPT';
        if (botSide === 'BUY' && price <= ev - 0.5) return 'ACCEPT';
        return 'REJECT';
      }

      case 'BOT_RANDOM': {
        // Random noise around EV (+-4.0)
        const diff = botSide === 'SELL' ? (price - ev) : (ev - price);
        const acceptProb = Math.max(0.1, Math.min(0.9, 0.5 + diff * 0.1));
        return Math.random() < acceptProb ? 'ACCEPT' : 'REJECT';
      }

      case 'BOT_FAIR_VALUE':
      default: {
        // Standard rational trader: sells if price >= EV, buys if price <= EV
        if (botSide === 'SELL' && price >= ev) return 'ACCEPT';
        if (botSide === 'BUY' && price <= ev) return 'ACCEPT';
        return 'REJECT';
      }
    }
  }

  /**
   * Generates a proactive proposal from a bot to another player.
   * 
   * @param {Object} bot - Bot player
   * @param {Array<Object>} allPlayers - All players in the room
   * @param {Array<number>} revealedDigits - Current revealed digits
   * @param {number} currentRound - Current round number
   * @returns {Object|null} Proposal parameters or null if bot decides not to quote
   */
  generateProactiveProposal(bot, allPlayers, revealedDigits, currentRound) {
    const currentPosition = this.positionEngine.getPosition(bot.id);
    const ev = this.getPublicFairValue(revealedDigits);

    // Pick a potential target (prefer humans or other players)
    const targets = allPlayers.filter(p => p.id !== bot.id);
    if (targets.length === 0) return null;

    const target = targets[Math.floor(Math.random() * targets.length)];

    // Decide whether to BUY or SELL
    let side = 'BUY';
    const canBuy = this.positionEngine.canBuy(bot.id, 1);
    const canSell = this.positionEngine.canSell(bot.id, 1);

    if (!canBuy && !canSell) return null;
    if (canBuy && !canSell) side = 'BUY';
    else if (!canBuy && canSell) side = 'SELL';
    else {
      // If long, prefer selling to take profit; if short, prefer buying
      if (currentPosition > 0) side = Math.random() < 0.7 ? 'SELL' : 'BUY';
      else if (currentPosition < 0) side = Math.random() < 0.7 ? 'BUY' : 'SELL';
      else side = Math.random() < 0.5 ? 'BUY' : 'SELL';
    }

    // Determine proposed price based on personality
    let price = Math.round(ev);
    const type = bot.botType || 'BOT_FAIR_VALUE';

    if (type === 'BOT_CONSERVATIVE') {
      price = side === 'BUY' ? Math.round(ev - 2) : Math.round(ev + 2);
    } else if (type === 'BOT_AGGRESSIVE') {
      price = side === 'BUY' ? Math.round(ev - 0.5) : Math.round(ev + 0.5);
    } else if (type === 'BOT_MARKET_PLAYER') {
      price = side === 'BUY' ? Math.round(ev - 1) : Math.round(ev + 1);
    } else if (type === 'BOT_RANDOM') {
      const offset = (Math.random() * 6 - 3);
      price = Math.round(ev + offset);
    } else {
      // FAIR_VALUE
      price = side === 'BUY' ? Math.floor(ev) : Math.ceil(ev);
    }

    // Clamp price to reasonable range (0 to 54)
    price = Math.max(0, Math.min(54, price));

    return {
      fromPlayerId: bot.id,
      fromPlayerLetter: bot.letter,
      toPlayerId: target.id,
      toPlayerLetter: target.letter,
      side,
      price,
      round: currentRound
    };
  }
}
