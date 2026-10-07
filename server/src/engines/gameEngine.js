import { randomUUID } from 'node:crypto';
import { DigitRevealEngine } from './digitRevealEngine.js';
import { PositionEngine } from './positionEngine.js';
import { PnlEngine } from './pnlEngine.js';
import { TradeEngine } from './tradeEngine.js';
import { RoundManager } from './roundManager.js';
import { LeaderboardEngine } from './leaderboardEngine.js';
import { BotEngine } from './botEngine.js';
import { SettlementEngine } from './settlementEngine.js';

export const PLAYER_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * GameEngine
 * 
 * Authoritative coordinator for a single trading game session.
 * Manages all domain engines, player seats, lifecycle events, and client synchronization.
 */
export class GameEngine {
  constructor(options = {}) {
    this.id = options.id || randomUUID();
    this.roomId = options.roomId;
    this.roomCode = options.roomCode;
    this.hostId = options.hostId;
    this.isPracticeMode = options.isPracticeMode || false;
    this.isDeterministicDemo = options.isDeterministicDemo || false;
    this.maxPlayers = options.maxPlayers || 6;
    this.roundDurationSeconds = options.roundDurationSeconds || 90;

    // Sub-engines
    this.digitEngine = new DigitRevealEngine({
      isDeterministicDemo: this.isDeterministicDemo,
      digits: options.demoDigits
    });
    this.positionEngine = new PositionEngine();
    this.pnlEngine = new PnlEngine();
    this.tradeEngine = new TradeEngine(this.positionEngine, this.pnlEngine);
    this.botEngine = new BotEngine(this.tradeEngine, this.positionEngine);

    // Players list: Array<{ id, letter, nickname, isBot, botType, socketId, connected }>
    this.players = [];

    // State
    this.status = 'LOBBY'; // LOBBY, INSTRUCTIONS, TRADING, TRANSITION, SETTLEMENT, FINISHED
    this.settlementResults = null;
    this.botActivityInterval = null;

    // Callbacks to notify socket layer
    this.emitEvent = options.emitEvent || (() => {});

    // Initialize Round Manager
    this.roundManager = new RoundManager({
      roundDurationSeconds: this.roundDurationSeconds,
      onTick: (tickData) => this.handleTick(tickData),
      onRoundEnd: (data) => this.handleRoundEnd(data),
      onTransitionEnd: (data) => this.handleTransitionEnd(data),
      onGameEnd: (data) => this.handleGameEnd(data)
    });
  }

  /**
   * Adds a human player or assigns a seat.
   */
  addPlayer({ id, nickname, socketId, isHost = false }) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error("Game room is full");
    }

    const assignedLetter = PLAYER_LETTERS[this.players.length];
    const player = {
      id: id || randomUUID(),
      letter: assignedLetter,
      nickname: nickname || `Player ${assignedLetter}`,
      isBot: false,
      botType: null,
      socketId,
      connected: true,
      isHost: isHost || this.players.length === 0
    };

    this.players.push(player);
    this.positionEngine.initPlayer(player.id);
    this.pnlEngine.initPlayer(player.id);

    return player;
  }

  /**
   * Fills remaining empty seats up to maxPlayers with AI bots.
   */
  fillEmptySeatsWithBots() {
    let personalityIndex = 0;
    while (this.players.length < this.maxPlayers) {
      const assignedLetter = PLAYER_LETTERS[this.players.length];
      const botType = BotEngine.PERSONALITIES[personalityIndex % BotEngine.PERSONALITIES.length];
      personalityIndex++;

      const bot = {
        id: `bot-${assignedLetter.toLowerCase()}-${randomUUID().substring(0, 6)}`,
        letter: assignedLetter,
        nickname: `BOT ${assignedLetter}`,
        isBot: true,
        botType,
        socketId: null,
        connected: true,
        isHost: false
      };

      this.players.push(bot);
      this.positionEngine.initPlayer(bot.id);
      this.pnlEngine.initPlayer(bot.id);
    }
  }

  /**
   * Transitions from Lobby to Instructions phase.
   */
  showInstructions() {
    this.status = 'INSTRUCTIONS';
    this.emitEvent('game:instructions', {
      gameId: this.id,
      status: this.status
    });
  }

  /**
   * Starts the actual game at Round 1.
   */
  startGame() {
    // Fill remaining seats with bots if not full
    this.fillEmptySeatsWithBots();

    this.status = 'TRADING';
    this.roundManager.startRound(1);
    this.startBotActivityLoop();

    this.emitEvent('game:start', {
      gameId: this.id,
      round: 1,
      timeRemaining: this.roundManager.timeRemaining,
      revealedDigits: this.digitEngine.getRevealedDigitsForRound(1, false),
      players: this.getPublicPlayers()
    });
  }

  /**
   * Background loop for bot trade participation and market quoting.
   */
  startBotActivityLoop() {
    if (this.botActivityInterval) clearInterval(this.botActivityInterval);

    this.botActivityInterval = setInterval(() => {
      if (this.status !== 'TRADING') return;

      const revealedDigits = this.digitEngine.getRevealedDigitsForRound(this.roundManager.currentRound, false);
      const ev = this.digitEngine.getExpectedValue(this.roundManager.currentRound, false).expectedValue;
      const bots = this.players.filter(p => p.isBot);
      if (bots.length === 0) return;

      const randomBot = bots[Math.floor(Math.random() * bots.length)];

      // 1. First check if there's any attractive open table order from someone else to TAKE!
      const openOrders = this.tradeEngine.getAllOpenWorkingOrders().filter(o => o.playerId !== randomBot.id);
      let tookOrder = false;

      for (const order of openOrders) {
        // If order is BUY @ P, maker wants to buy. Bot would SELL. Attractive if P >= ev
        if (order.side === 'BUY' && this.positionEngine.canSell(randomBot.id, 1)) {
          if (order.price >= ev) {
            try {
              const res = this.tradeEngine.takeWorkingOrder(order.id, randomBot.id, randomBot.letter);
              this.broadcastTradeExecution(res);
              tookOrder = true;
              break;
            } catch (e) {}
          }
        }
        // If order is SELL @ P, maker wants to sell. Bot would BUY. Attractive if P <= ev
        else if (order.side === 'SELL' && this.positionEngine.canBuy(randomBot.id, 1)) {
          if (order.price <= ev) {
            try {
              const res = this.tradeEngine.takeWorkingOrder(order.id, randomBot.id, randomBot.letter);
              this.broadcastTradeExecution(res);
              tookOrder = true;
              break;
            } catch (e) {}
          }
        }
      }

      if (tookOrder) return;

      // 2. If bot has < 2 working orders, quote an attractive or competitive order!
      const botOrdersCount = this.tradeEngine.getActiveWorkingOrdersCount(randomBot.id);
      if (botOrdersCount < 2 && Math.random() < 0.7) {
        const canBuy = this.positionEngine.canBuy(randomBot.id, 1);
        const canSell = this.positionEngine.canSell(randomBot.id, 1);
        if (!canBuy && !canSell) return;

        let side = 'BUY';
        if (canBuy && !canSell) side = 'BUY';
        else if (!canBuy && canSell) side = 'SELL';
        else side = Math.random() < 0.5 ? 'BUY' : 'SELL';

        // Calculate price with small spread around EV
        const offset = Math.floor(Math.random() * 4) + 1; // 1 to 4
        let price = side === 'BUY' ? Math.round(ev - offset) : Math.round(ev + offset);
        price = Math.max(1, Math.min(54, price));

        try {
          const order = this.tradeEngine.createWorkingOrder({
            playerId: randomBot.id,
            playerLetter: randomBot.letter,
            side,
            price,
            round: this.roundManager.currentRound
          });
          this.emitEvent('order:created', { order });
        } catch (e) {}
      }

      // 3. Periodically cancel stale bot orders so prices refresh
      if (Math.random() < 0.3) {
        const myOrders = this.tradeEngine.getWorkingOrdersForPlayer(randomBot.id);
        if (myOrders.length > 0 && Date.now() - myOrders[0].createdAt > 12000) {
          try {
            this.tradeEngine.cancelWorkingOrder(myOrders[0].id, randomBot.id);
            this.emitEvent('order:cancelled', { orderId: myOrders[0].id });
          } catch (e) {}
        }
      }
    }, 2800);
  }

  /**
   * Place a broadcasted working order on the table.
   * Maximum 2 working orders allowed per player at a time!
   */
  createWorkingOrder(playerId, side, price) {
    if (this.status !== 'TRADING') {
      throw new Error("Trading is currently closed");
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");

    const order = this.tradeEngine.createWorkingOrder({
      playerId: player.id,
      playerLetter: player.letter,
      side,
      price,
      round: this.roundManager.currentRound
    });

    this.emitEvent('order:created', { order });
    return order;
  }

  /**
   * Take another player's working order from the table.
   */
  takeOrder(takerId, orderId) {
    if (this.status !== 'TRADING') {
      throw new Error("Trading is currently closed");
    }

    const taker = this.players.find(p => p.id === takerId);
    if (!taker) throw new Error("Player not found");

    const result = this.tradeEngine.takeWorkingOrder(orderId, taker.id, taker.letter);
    this.broadcastTradeExecution(result);
    return result;
  }

  /**
   * Cancel an open working order.
   */
  cancelOrder(cancellingPlayerId, orderId) {
    const order = this.tradeEngine.cancelWorkingOrder(orderId, cancellingPlayerId);
    this.emitEvent('order:cancelled', { orderId });
    return order;
  }

  /**
   * Backward compatibility for proposals.
   */
  createProposal(fromPlayerId, toPlayerLetter, side, price) {
    return this.createWorkingOrder(fromPlayerId, side, price);
  }

  acceptProposal(orderId, acceptingPlayerId) {
    return this.takeOrder(acceptingPlayerId, orderId);
  }

  cancelProposal(orderId, cancellingPlayerId) {
    return this.cancelOrder(cancellingPlayerId, orderId);
  }

  rejectProposal(orderId) {
    return { id: orderId };
  }

  /**
   * Broadcasts updates when a trade successfully executes.
   */
  broadcastTradeExecution(result) {
    const { trade, posResult, pnlResult } = result;

    this.emitEvent('trade:executed', {
      trade,
      leaderboard: this.getLeaderboard(),
      positions: {
        [trade.buyerId]: posResult.buyerPosition,
        [trade.sellerId]: posResult.sellerPosition
      },
      pnl: {
        [trade.buyerId]: pnlResult.buyerTotalRealized,
        [trade.sellerId]: pnlResult.sellerTotalRealized
      }
    });
  }

  nextRound() {
    if (this.roundManager.currentRound < RoundManager.TOTAL_ROUNDS) {
      const nextRound = this.roundManager.currentRound + 1;
      this.roundManager.startRound(nextRound);
      const revealedDigits = this.digitEngine.getRevealedDigitsForRound(nextRound, false);
      this.emitEvent('game:roundStart', {
        round: nextRound,
        timeRemaining: this.roundManager.roundDuration,
        revealedDigits,
        newlyRevealedDigit: revealedDigits[revealedDigits.length - 1]
      });
    } else {
      this.roundManager.handleRoundFinish();
    }
  }

  /**
   * Authoritative timer tick handler.
   */
  handleTick(tickData) {
    this.emitEvent('game:timer', {
      round: tickData.round,
      timeRemaining: tickData.timeRemaining,
      state: tickData.state
    });
  }

  /**
   * Round finishes (90s elapsed).
   */
  handleRoundEnd({ round }) {
    this.status = 'TRANSITION';
    // Expire open proposals for this round
    this.tradeEngine.expireRoundProposals(round);

    this.emitEvent('game:roundEnd', {
      finishedRound: round,
      revealedDigits: this.digitEngine.getRevealedDigitsForRound(round, false)
    });
  }

  /**
   * Transition ends and next round starts.
   */
  handleTransitionEnd({ nextRound }) {
    this.status = 'TRADING';
    const revealedDigits = this.digitEngine.getRevealedDigitsForRound(nextRound, false);

    this.emitEvent('game:roundStart', {
      round: nextRound,
      timeRemaining: this.roundManager.roundDuration,
      revealedDigits,
      newlyRevealedDigit: revealedDigits[revealedDigits.length - 1]
    });
  }

  /**
   * Round 6 terminates: reveal 6th digit and settle remaining positions.
   */
  handleGameEnd() {
    this.status = 'FINISHED';
    if (this.botActivityInterval) clearInterval(this.botActivityInterval);

    // Reveal ALL 6 digits
    const finalDigits = this.digitEngine.getRevealedDigitsForRound(6, true);
    const finalSum = this.digitEngine.getFinalSum();

    // Settle open lots
    const openLotsMap = new Map();
    const realizedPnlMap = new Map();

    for (const player of this.players) {
      openLotsMap.set(player.id, this.pnlEngine.getOpenLots(player.id));
      realizedPnlMap.set(player.id, this.pnlEngine.getRealizedPnL(player.id));
    }

    this.settlementResults = SettlementEngine.settleAll(finalSum, openLotsMap, realizedPnlMap);

    this.emitEvent('game:settlement', {
      finalDigits,
      finalSum,
      settlementResults: this.settlementResults,
      leaderboard: this.getLeaderboard()
    });
  }

  /**
   * Generates sanitized client state for a given player.
   * GUARANTEES: Future hidden digits are NEVER leaked!
   */
  getClientState(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const isFinished = this.status === 'FINISHED';
    const revealedDigits = this.digitEngine.getRevealedDigitsForRound(this.roundManager.currentRound, isFinished);

    let practiceStats = null;
    if (this.isPracticeMode) {
      practiceStats = this.digitEngine.getExpectedValue(this.roundManager.currentRound, isFinished);
    }

    return {
      gameId: this.id,
      roomCode: this.roomCode,
      status: this.status,
      currentRound: this.roundManager.currentRound,
      timeRemaining: this.roundManager.timeRemaining,
      roundDurationSeconds: this.roundManager.roundDuration,
      revealedDigits,
      isPracticeMode: this.isPracticeMode,
      isDeterministicDemo: this.isDeterministicDemo,
      players: this.getPublicPlayers(),
      myPlayer: player || null,
      myPosition: player ? this.positionEngine.getPosition(player.id) : 0,
      myRealizedPnL: player ? this.pnlEngine.getRealizedPnL(player.id) : 0,
      workingOrders: player ? this.tradeEngine.getWorkingOrdersForPlayer(player.id) : [],
      openTableOrders: this.tradeEngine.getAllOpenWorkingOrders(),
      incomingProposals: player ? this.tradeEngine.getIncomingProposalsForPlayer(player.id) : [],
      myTrades: player ? this.tradeEngine.getTradesForPlayer(player.id) : [],
      leaderboard: this.getLeaderboard(),
      settlementResults: this.settlementResults,
      practiceStats,
      allTrades: isFinished ? this.tradeEngine.getAllTrades() : undefined
    };
  }

  getLeaderboard() {
    return LeaderboardEngine.getLeaderboard(this.players, this.pnlEngine, this.settlementResults);
  }

  getPublicPlayers() {
    return this.players.map(p => ({
      id: p.id,
      letter: p.letter,
      nickname: p.nickname,
      isBot: p.isBot,
      isHost: p.isHost,
      connected: p.connected
    }));
  }

  destroy() {
    if (this.botActivityInterval) clearInterval(this.botActivityInterval);
    this.roundManager.destroy();
  }
}
